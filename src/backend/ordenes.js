import { randomUUID } from 'node:crypto';
import { validarTransicion, calcularCosto } from '../utils/ordenUtils.js';
import { exigir, requerir } from './validaciones.js';

/** Registra fecha y usuario de cada modificación de una orden. */
function registrarCambio(orden, usuario, detalle) {
  orden.historial.push({ fecha: new Date().toISOString(), usuario: usuario.nombre, detalle });
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
  registrarCambio(orden, usuario, 'Recepción del equipo');
  base.ordenes.unshift(orden);
}

export function buscarOrdenDisponible(base, id, usuario, esRecepcion) {
  const orden = base.ordenes.find((elemento) => elemento.id === id);
  exigir(orden && (esRecepcion || orden.idTecnico === usuario.id), 'Orden no disponible.');
  return orden;
}

export function actualizarOrden(base, id, datos, usuario, { esRecepcion, esAdministrador }) {
  const orden = buscarOrdenDisponible(base, id, usuario, esRecepcion);
  exigir(!['ENTREGADO', 'CANCELADO'].includes(orden.estado), 'La orden ya está cerrada.');
  if (datos.accion === 'asignar') {
    asignarTecnico(base, orden, datos, esRecepcion, esAdministrador);
  } else if (datos.accion === 'estado') {
    cambiarEstado(orden, datos, usuario);
  } else if (datos.accion === 'piezas') {
    guardarPiezas(orden, datos, usuario, esAdministrador);
  } else if (datos.accion === 'enviarCotizacion') {
    enviarCotizacion(orden, usuario, esAdministrador);
  } else if (datos.accion === 'pago') {
    registrarPago(orden, datos, usuario, esRecepcion);
  } else if (datos.accion === 'autorizar') {
    registrarAutorizacion(orden, datos, esRecepcion);
  } else if (['diagnostico', 'reparacion'].includes(datos.accion)) {
    registrarDiagnosticoOReparacion(orden, datos, usuario, esAdministrador);
  } else {
    throw new Error('Seleccione una operación válida.');
  }
  registrarCambio(
    orden,
    usuario,
    `${datos.accion}: ${datos.estado || ''} ${datos.descripcion || ''}`,
  );
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
  exigir(
    base.usuarios.some(
      (cuenta) => cuenta.id === datos.idTecnico && cuenta.rol === 'tecnico' && cuenta.esActivo,
    ),
    'Técnico inválido.',
  );
  if (orden.idTecnico) {
    requerir(datos, ['descripcion']);
  }
  orden.idTecnico = datos.idTecnico;
}

function cambiarEstado(orden, datos, usuario) {
  validarTransicion(orden, datos.estado, usuario.rol);
  if (datos.estado === 'CANCELADO') {
    requerir(datos, ['descripcion']);
  }
  if (datos.estado === 'ENTREGADO') {
    const pagado = (orden.pagos || []).reduce((total, pago) => total + pago.monto, 0);
    exigir(
      Math.round(pagado * 100) >= Math.round(orden.total * 100),
      'Registre el pago del saldo antes de entregar.',
    );
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
      typeof pieza.nombre === 'string' &&
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
  orden.esCotizacionEnviada = true;
}

function registrarPago(orden, datos, usuario, esRecepcion) {
  exigir(esRecepcion && orden.estado === 'LISTO', 'Solo Recepción registra pagos en LISTO.');
  const monto = Number(datos.monto);
  const pagado = (orden.pagos || []).reduce((total, pago) => total + pago.monto, 0);
  exigir(
    Number.isFinite(monto) &&
      monto > 0 &&
      Math.round(monto * 100) <= Math.round((orden.total - pagado) * 100),
    'Monto inválido o mayor al saldo.',
  );
  exigir(['Efectivo', 'Tarjeta', 'Transferencia'].includes(datos.metodo), 'Método inválido.');
  orden.pagos = [
    ...(orden.pagos || []),
    {
      monto: Math.round(monto * 100) / 100,
      metodo: datos.metodo,
      fecha: new Date().toISOString(),
      usuario: usuario.nombre,
    },
  ];
}

function registrarAutorizacion(orden, datos, esRecepcion) {
  exigir(
    esRecepcion && orden.esDiagnosticoConcluido && orden.estado === 'EN_DIAGNOSTICO',
    'Recepción registra la autorización después del diagnóstico.',
  );
  requerir(datos, ['descripcion']);
  exigir(
    ['aprobada', 'rechazada', 'pendiente'].includes(datos.decision || 'aprobada'),
    'Decisión inválida.',
  );
  orden.decision = datos.decision || 'aprobada';
  orden.medioAutorizacion = String(datos.medio || '').slice(0, 100);
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
    orden.reparacion = datos.descripcion;
    orden.pruebasFinales = String(datos.pruebasFinales || '').slice(0, 1000);
    orden.minutosTrabajo = Number(datos.minutosTrabajo || 0);
    exigir(
      Number.isFinite(orden.minutosTrabajo) && orden.minutosTrabajo >= 0,
      'Tiempo de reparación inválido.',
    );
  }
  orden.manoObra = Number(datos.manoObra);
  orden.costoRefacciones = Number(datos.costoRefacciones);
  orden.refacciones = String(datos.refacciones || '').slice(0, 1000);
  orden.total = total;
}
