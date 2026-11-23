import { randomUUID } from 'node:crypto';
import { validarTransicion, calcularCosto, pagosEnCentavos } from '../../utils/ordenUtils.js';
import { exigir, requerir } from '../validaciones.js';

/** Guarda la acción y sus datos después de que pasa la validación. */
function registrarCambio(orden, usuario, tipo, campos = {}) {
  if (!Array.isArray(orden.historial)) orden.historial = [];
  orden.historial.push({
    tipo,
    fecha: new Date().toISOString(),
    usuario: usuario.nombre,
    rol: usuario.rol,
    ...campos,
  });
}

export function crearOrden(base, datos, usuario, esRecepcion) {
  exigir(esRecepcion, 'Solo Recepción o Administración recibe equipos.');
  requerir(datos, ['idEquipo', 'falla', 'estadoFisico', 'accesorios']);
  const equipo = base.equipos.find((elemento) => elemento.id === datos.idEquipo);
  exigir(equipo, 'Equipo inexistente.');
  exigir(
    !base.ordenes.some(
      (orden) => orden.idEquipo === equipo.id && !['ENTREGADO', 'CANCELADO'].includes(orden.estado),
    ),
    'El equipo ya tiene una orden abierta.',
  );
  const orden = {
    id: randomUUID(),
    idCliente: equipo.idCliente,
    idEquipo: equipo.id,
    falla: datos.falla,
    estadoFisico: datos.estadoFisico,
    accesorios: datos.accesorios,
    folio: `OS-${new Date().getFullYear()}-${String(base.ordenes.length + 1).padStart(5, '0')}`,
    estado: 'RECIBIDO',
    fecha: new Date().toISOString(),
    historial: [],
    total: 0,
  };
  registrarCambio(orden, usuario, 'recepcion', { fecha: orden.fecha });
  base.ordenes.unshift(orden);
}

export function buscarOrdenDisponible(base, id, usuario, esRecepcion) {
  const orden = base.ordenes.find((elemento) => elemento.id === id);
  exigir(orden && (esRecepcion || orden.idTecnico === usuario.id), 'Orden no disponible.');
  return orden;
}

export function actualizarOrden(base, id, datos, usuario, { esRecepcion, esAdministrador }) {
  const orden = buscarOrdenDisponible(base, id, usuario, esRecepcion);
  if (datos.accion === 'pago') {
    exigir(esRecepcion, 'Solo Recepción registra pagos en LISTO.');
    exigir(
      typeof datos.idOperacion === 'string' && /^[a-f0-9]{32}$/.test(datos.idOperacion),
      'Falta el identificador del pago. Actualiza la página e intenta de nuevo.',
    );
    const anterior = orden.pagos?.find((pago) => pago.idOperacion === datos.idOperacion);
    if (anterior) {
      exigir(
        anterior.monto === Number(datos.monto) && anterior.metodo === datos.metodo,
        'El identificador ya corresponde a otro pago.',
      );
      return false;
    }
  }
  exigir(!['ENTREGADO', 'CANCELADO'].includes(orden.estado), 'La orden ya está cerrada.');
  let tipo = datos.accion;
  let campos;
  if (datos.accion === 'asignar') {
    if (orden.idTecnico) tipo = 'reasignar';
    const tecnico = asignarTecnico(base, orden, datos, esRecepcion, esAdministrador);
    campos = {
      tecnico: tecnico.nombre,
      ...(tipo === 'reasignar' && { detalle: datos.descripcion }),
    };
  } else if (datos.accion === 'estado') {
    cambiarEstado(orden, datos, usuario);
    campos = { estado: orden.estado };
    if (orden.estado === 'CANCELADO') campos.detalle = datos.descripcion;
    if (orden.estado === 'ENTREGADO')
      campos.detalle = 'Devolución del equipo y accesorios confirmada.';
  } else if (datos.accion === 'piezas') {
    guardarPiezas(orden, datos, usuario, esAdministrador);
    campos = { partidas: orden.piezas.length, total: orden.total };
  } else if (datos.accion === 'enviarCotizacion') {
    if (enviarCotizacion(orden, usuario, esAdministrador) === false) return false;
  } else if (datos.accion === 'pago') {
    const { monto, metodo, fecha } = registrarPago(orden, datos, usuario, esRecepcion);
    campos = { monto, metodo, fecha };
  } else if (datos.accion === 'autorizar') {
    registrarAutorizacion(orden, datos, esRecepcion);
    campos = {
      decision: orden.decision,
      detalle: datos.descripcion,
      ...(orden.medioAutorizacion && { medio: orden.medioAutorizacion }),
    };
  } else if (['diagnostico', 'reparacion'].includes(datos.accion)) {
    registrarDiagnosticoOReparacion(orden, datos, usuario, esAdministrador);
    campos = { detalle: datos.descripcion };
  } else {
    throw new Error('Seleccione una operación válida.');
  }
  registrarCambio(orden, usuario, tipo, campos);
}

function asignarTecnico(base, orden, datos, esRecepcion, esAdministrador) {
  exigir(
    esRecepcion && (!orden.idTecnico || esAdministrador),
    'Solo Administración puede reasignar.',
  );
  exigir(
    ['RECIBIDO', 'EN_DIAGNOSTICO', 'EN_REPARACION'].includes(orden.estado),
    'La orden no permite asignación.',
  );
  const tecnico = base.usuarios.find(
    (cuenta) => cuenta.id === datos.idTecnico && cuenta.rol === 'tecnico' && cuenta.esActivo,
  );
  exigir(tecnico, 'Técnico inválido.');
  exigir(orden.idTecnico !== tecnico.id, 'La orden ya está asignada a ese técnico.');
  if (orden.idTecnico) {
    requerir(datos, ['descripcion']);
  }
  orden.idTecnico = datos.idTecnico;
  return tecnico;
}

function cambiarEstado(orden, datos, usuario) {
  validarTransicion(orden, datos.estado, usuario.rol);
  if (datos.estado === 'CANCELADO') {
    requerir(datos, ['descripcion']);
  }
  if (datos.estado === 'ENTREGADO') {
    exigir(
      pagosEnCentavos(orden) >= Math.round(orden.total * 100),
      'Registre el pago del saldo antes de entregar.',
    );
    exigir(datos.equipoDevuelto === true, 'Confirma la devolución del equipo antes de entregar.');
  }
  orden.estado = datos.estado;
  if (orden.estado === 'LISTO') {
    orden.fechaListo = new Date().toISOString();
  }
}

function guardarPiezas(orden, datos, usuario, esAdministrador) {
  exigir(usuario.rol === 'tecnico' || esAdministrador, 'Operación reservada al técnico.');
  exigir(
    orden.estado === 'EN_DIAGNOSTICO' && orden.esDiagnosticoConcluido,
    'Concluya el diagnóstico antes de cotizar piezas.',
  );
  exigir(Array.isArray(datos.piezas) && datos.piezas.length <= 50, 'Partidas inválidas.');
  const piezas = datos.piezas.map((pieza) => {
    exigir(
      typeof pieza?.nombre === 'string' &&
        pieza.nombre.trim().length > 0 &&
        pieza.nombre.length <= 100,
      'Nombre de pieza inválido.',
    );
    exigir(
      Number.isSafeInteger(pieza.cantidad) && pieza.cantidad > 0 && pieza.cantidad <= 10000,
      'Cantidad inválida.',
    );
    calcularCosto(0, pieza.costo);
    exigir(['En stock', 'Por pedir'].includes(pieza.disponibilidad), 'Disponibilidad inválida.');
    return {
      nombre: pieza.nombre.trim(),
      cantidad: pieza.cantidad,
      costo: Number(pieza.costo),
      disponibilidad: pieza.disponibilidad,
    };
  });
  const costoRefacciones =
    piezas.reduce((total, pieza) => total + Math.round(pieza.costo * 100) * pieza.cantidad, 0) /
    100;
  orden.total = calcularCosto(datos.manoObra, costoRefacciones);
  orden.manoObra = Number(datos.manoObra);
  orden.costoRefacciones = costoRefacciones;
  orden.piezas = piezas;
  orden.refacciones = piezas.map((pieza) => `${pieza.cantidad} x ${pieza.nombre}`).join('; ');
  orden.tieneAutorizacion = false;
  orden.esCotizacionEnviada = false;
  orden.decision = 'pendiente';
  orden.fechaCotizacion = new Date().toISOString();
}

function enviarCotizacion(orden, usuario, esAdministrador) {
  exigir(usuario.rol === 'tecnico' || esAdministrador, 'Operación reservada al técnico.');
  exigir(
    orden.estado === 'EN_DIAGNOSTICO' && orden.esDiagnosticoConcluido,
    'Primero concluya el diagnóstico.',
  );
  if (orden.esCotizacionEnviada) return false;
  orden.esCotizacionEnviada = true;
}

function registrarPago(orden, datos, usuario, esRecepcion) {
  exigir(esRecepcion && orden.estado === 'LISTO', 'Solo Recepción registra pagos en LISTO.');
  const monto = Number(datos.monto);
  const centavos = Math.round(monto * 100);
  exigir(
    ['number', 'string'].includes(typeof datos.monto) &&
      Number.isSafeInteger(centavos) &&
      centavos > 0 &&
      monto === centavos / 100 &&
      centavos <= Math.round(orden.total * 100) - pagosEnCentavos(orden),
    'Monto inválido o mayor al saldo.',
  );
  exigir(['Efectivo', 'Tarjeta', 'Transferencia'].includes(datos.metodo), 'Método inválido.');
  const pago = {
    monto: centavos / 100,
    metodo: datos.metodo,
    idOperacion: datos.idOperacion,
    fecha: new Date().toISOString(),
    usuario: usuario.nombre,
  };
  orden.pagos = [...(orden.pagos || []), pago];
  return pago;
}

function registrarAutorizacion(orden, datos, esRecepcion) {
  exigir(
    esRecepcion && orden.esDiagnosticoConcluido && orden.estado === 'EN_DIAGNOSTICO',
    'Recepción registra la autorización después del diagnóstico.',
  );
  requerir(datos, ['descripcion']);
  const { decision = 'aprobada', medio = '' } = datos;
  exigir(['aprobada', 'rechazada', 'pendiente'].includes(decision), 'Decisión inválida.');
  exigir(typeof medio === 'string' && medio.length <= 100, 'Medio de confirmación inválido.');
  orden.decision = decision;
  orden.medioAutorizacion = medio.trim();
  orden.tieneAutorizacion = orden.decision === 'aprobada';
}

function registrarDiagnosticoOReparacion(orden, datos, usuario, esAdministrador) {
  exigir(usuario.rol === 'tecnico' || esAdministrador, 'Operación reservada al técnico.');
  requerir(datos, ['descripcion', 'manoObra', 'costoRefacciones']);
  const total = calcularCosto(datos.manoObra, datos.costoRefacciones);
  if (datos.accion === 'diagnostico') {
    exigir(
      orden.estado === 'EN_DIAGNOSTICO' && datos.descripcion.length >= 20,
      'Diagnóstico: estado EN_DIAGNOSTICO y mínimo 20 caracteres.',
    );
    orden.diagnostico = datos.descripcion;
    orden.pruebas = Object.fromEntries(
      Object.entries(datos.pruebas || {}).filter(
        ([nombre, resultado]) => nombre.length < 100 && ['OK', 'Falla'].includes(resultado),
      ),
    );
    orden.esDiagnosticoConcluido = true;
    orden.tieneAutorizacion = false;
    orden.fechaCotizacion = new Date().toISOString();
  } else {
    exigir(
      orden.estado === 'EN_REPARACION' && orden.esDiagnosticoConcluido && orden.tieneAutorizacion,
      'La orden no está autorizada para reparación.',
    );
    requerir(datos, ['pruebasFinales']);
    const minutos = Number(datos.minutosTrabajo);
    exigir(
      ['number', 'string'].includes(typeof datos.minutosTrabajo) &&
        Number.isSafeInteger(minutos) &&
        minutos > 0,
      'El tiempo de reparación debe ser un número entero mayor que cero.',
    );
    orden.reparacion = datos.descripcion;
    orden.pruebasFinales = datos.pruebasFinales;
    orden.minutosTrabajo = minutos;
  }
  orden.manoObra = Number(datos.manoObra);
  orden.costoRefacciones = Number(datos.costoRefacciones);
  orden.refacciones = String(datos.refacciones || '').slice(0, 1000);
  orden.total = total;
}
