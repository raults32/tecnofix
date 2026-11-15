// Nombre: Desarrollo asistido por Codex; revisiÃ³n pendiente del Equipo 5
// Proyecto: Sistema de GestiÃ³n para Servicio TÃ©cnico de Computadoras
// Archivo: server.js
// DescripciÃ³n: server.js
// Fecha: 9 de noviembre de 2026

/* Importaciones del servidor y reglas compartidas. */
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { validarTransicion, calcularCosto, ESTADOS_ORDEN } from './utils/ordenUtils.js';

/* Configuración local y almacenamiento transaccional por proceso. */
const PUERTO = Number(process.env.PORT || 3000);
const DIRECTORIO = process.env.DATA_DIR || './data';
const SESIONES = new Map();
const INTENTOS = new Map();
mkdirSync(DIRECTORIO, { recursive: true });

/* Funciones de seguridad y persistencia. */
/** Deriva una contraseña con sal aleatoria mediante scrypt. */
function derivarContrasena(contrasena, sal = randomBytes(16).toString('hex')) {
  return `${sal}:${scryptSync(contrasena, sal, 64).toString('hex')}`;
}

/** Guarda un estado completo mediante reemplazo atómico. */
function guardar(base) {
  writeFileSync(`${DIRECTORIO}/base.tmp`, JSON.stringify(base, null, 2));
  renameSync(`${DIRECTORIO}/base.tmp`, `${DIRECTORIO}/base.json`);
}

if (!existsSync(`${DIRECTORIO}/base.json`)) {
  guardar({
    clientes: [],
    equipos: [],
    ordenes: [],
    usuarios: ['administrador', 'recepcion', 'tecnico'].map((rol) => ({
      id: randomUUID(),
      nombre: rol,
      usuario: rol,
      rol,
      esActivo: true,
      hash: derivarContrasena('Taller2026!'),
    })),
  });
}

/** Lanza un error de negocio con mensaje legible. */
function exigir(condicion, mensaje) {
  if (!condicion) {
    throw new Error(mensaje);
  }
}

/** Verifica los campos requeridos y limita la captura. */
function requerir(datos, campos) {
  for (const campo of campos) {
    exigir(
      typeof datos[campo] === 'string' &&
        datos[campo].trim().length > 0 &&
        datos[campo].length <= 1000,
      `Campo obligatorio o inválido: ${campo}.`,
    );
    datos[campo] = datos[campo].trim();
  }
}

/** Registra fecha y usuario de cada modificación de una orden. */
function registrarCambio(orden, usuario, detalle) {
  orden.historial.push({ fecha: new Date().toISOString(), usuario: usuario.nombre, detalle });
}

/** Construye un PDF básico paginado, sin dependencias de servicios externos. */
function crearPdf(lineas) {
  const objetos = ['', ''];
  const paginas = [];
  for (let inicio = 0; inicio < lineas.length; inicio += 44) {
    const idPagina = objetos.length + 1;
    const idContenido = idPagina + 1;
    paginas.push(`${idPagina} 0 R`);
    const texto = lineas
      .slice(inicio, inicio + 44)
      .map((linea, indice) => {
        const contenido = String(linea)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\x20-\x7e]/g, '?')
          .replace(/([\\()])/g, '\\$1');
        return `1 0 0 1 45 ${790 - indice * 16} Tm (${contenido}) Tj`;
      })
      .join('\n');
    const flujo = `BT /F1 10 Tf\n${texto}\nET`;
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]
      /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
      /Contents ${idContenido} 0 R >>`);
    objetos.push(`<< /Length ${Buffer.byteLength(flujo)} >>\nstream\n${flujo}\nendstream`);
  }
  objetos[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objetos[1] = `<< /Type /Pages /Kids [${paginas.join(' ')}] /Count ${paginas.length} >>`;
  let archivo = '%PDF-1.4\n';
  const posiciones = [0];
  objetos.forEach((objeto, indice) => {
    posiciones.push(Buffer.byteLength(archivo));
    archivo += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
  });
  const inicioTabla = Buffer.byteLength(archivo);
  archivo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  archivo += posiciones
    .slice(1)
    .map((posicion) => `${String(posicion).padStart(10, '0')} 00000 n \n`)
    .join('');
  archivo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>
startxref\n${inicioTabla}\n%%EOF`;
  return Buffer.from(archivo);
}

/** Produce reportes por fecha de recepción, incluyendo estados vacíos. */
function generarReporte(base, parametros) {
  const inicio = parametros.get('inicio');
  const fin = parametros.get('fin');
  exigir(
    /^\d{4}-\d{2}-\d{2}$/.test(inicio) &&
      /^\d{4}-\d{2}-\d{2}$/.test(fin) &&
      Number.isFinite(Date.parse(inicio)) &&
      Number.isFinite(Date.parse(fin)) &&
      inicio <= fin &&
      fin <= new Date().toISOString().slice(0, 10),
    'Rango de fechas inválido.',
  );
  const ordenes = base.ordenes.filter(
    (orden) => orden.fecha.slice(0, 10) >= inicio && orden.fecha.slice(0, 10) <= fin,
  );
  const concluidas = ordenes.filter((orden) => ['LISTO', 'ENTREGADO'].includes(orden.estado));
  return {
    inicio,
    fin,
    ingresos: concluidas.reduce((total, orden) => total + orden.total, 0),
    estados: Object.fromEntries(
      ESTADOS_ORDEN.map((estado) => [
        estado,
        ordenes.filter((orden) => orden.estado === estado).length,
      ]),
    ),
    productividad: base.usuarios
      .filter((usuario) => usuario.rol === 'tecnico')
      .map((tecnico) => {
        const atendidas = concluidas.filter((orden) => orden.idTecnico === tecnico.id);
        return {
          id: tecnico.id,
          nombre: tecnico.nombre,
          cantidad: atendidas.length,
          promedioDias: atendidas.length
            ? Number(
                (
                  atendidas.reduce(
                    (total, orden) =>
                      total + (Date.parse(orden.fechaListo) - Date.parse(orden.fecha)) / 86400000,
                    0,
                  ) / atendidas.length
                ).toFixed(2),
              )
            : null,
        };
      }),
  };
}

/* Servidor HTTP con autorización aplicada antes de cada operación. */
const SERVIDOR = http.createServer(async (peticion, respuesta) => {
  const url = new URL(peticion.url, `http://127.0.0.1:${PUERTO}`);
  const ruta = url.pathname;
  const enviar = (resultado, estado = 200) => {
    respuesta.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
    respuesta.end(JSON.stringify(resultado));
  };
  const enviarPdf = (lineas) => {
    respuesta.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="documento.pdf"',
    });
    respuesta.end(crearPdf(lineas));
  };
  try {
    if (!ruta.startsWith('/api/')) {
      // Las rutas de React deben abrir también al recargar o pegar la URL.
      const esPagina = ruta === '/' || ruta === '/dashboard' || ruta.startsWith('/dashboard/');
      const archivo = resolve('dist', esPagina ? 'index.html' : `.${ruta}`);
      exigir(
        archivo.startsWith(resolve('dist') + '\\') || archivo.startsWith(resolve('dist') + '/'),
        'Ruta inválida.',
      );
      const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
      const contenido = readFileSync(archivo);
      respuesta.writeHead(200, {
        'Content-Type': tipos[extname(archivo)] || 'application/octet-stream',
      });
      respuesta.end(contenido);
      return;
    }
    const base = JSON.parse(readFileSync(`${DIRECTORIO}/base.json`, 'utf8'));
    const token = peticion.headers.cookie?.match(/(?:^|; )sesion=([^;]+)/)?.[1];
    const sesion = SESIONES.get(token);
    const usuario =
      sesion &&
      sesion.expira > Date.now() &&
      base.usuarios.find((cuenta) => cuenta.id === sesion.id && cuenta.esActivo);
    let datos = {};
    if (peticion.method === 'POST') {
      let cuerpo = '';
      for await (const fragmento of peticion) {
        cuerpo += fragmento;
        exigir(cuerpo.length < 20000, 'Solicitud demasiado grande.');
      }
      datos = JSON.parse(cuerpo || '{}');
      const origen = peticion.headers.origin;
      exigir(
        !origen || new URL(origen).host === peticion.headers.host,
        'Origen de solicitud no autorizado.',
      );
    }
    if (ruta === '/api/login' && peticion.method === 'POST') {
      requerir(datos, ['usuario', 'contrasena']);
      const intento = INTENTOS.get(datos.usuario) || { cantidad: 0, hasta: 0 };
      exigir(intento.hasta < Date.now(), 'Cuenta bloqueada por 15 minutos.');
      const cuenta = base.usuarios.find((elemento) => elemento.usuario === datos.usuario);
      const sal = cuenta?.hash.split(':')[0] || 'sin-cuenta';
      const hash = derivarContrasena(datos.contrasena, sal).split(':')[1];
      if (
        !cuenta?.esActivo ||
        !timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(cuenta.hash.split(':')[1], 'hex'))
      ) {
        intento.cantidad += 1;
        if (intento.cantidad >= 3) {
          intento.hasta = Date.now() + 900000;
          intento.cantidad = 0;
        }
        INTENTOS.set(datos.usuario, intento);
        throw new Error('Credenciales incorrectas.');
      }
      INTENTOS.delete(datos.usuario);
      const nuevoToken = randomBytes(32).toString('hex');
      SESIONES.set(nuevoToken, { id: cuenta.id, expira: Date.now() + 28800000 });
      respuesta.setHeader('Set-Cookie', `sesion=${nuevoToken}; HttpOnly; SameSite=Strict; Path=/`);
      enviar({ usuario: { id: cuenta.id, nombre: cuenta.nombre, rol: cuenta.rol } });
      return;
    }
    if (ruta === '/api/sesion') {
      enviar({
        usuario: usuario ? { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol } : null,
      });
      return;
    }
    if (!usuario) {
      enviar({ error: 'Inicie sesión para continuar.' }, 401);
      return;
    }
    const esAdministrador = usuario.rol === 'administrador';
    const esRecepcion = esAdministrador || usuario.rol === 'recepcion';
    if (ruta === '/api/logout') {
      exigir(peticion.method === 'POST', 'Utilice POST para cerrar sesión.');
      SESIONES.delete(token);
      respuesta.setHeader('Set-Cookie', 'sesion=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
      enviar({ correcto: true });
      return;
    }
    if (ruta === '/api/datos' && peticion.method === 'GET') {
      const ordenes = base.ordenes
        .filter((orden) => usuario.rol !== 'tecnico' || orden.idTecnico === usuario.id)
        .map((orden) => ({
          ...orden,
          cliente: base.clientes.find((cliente) => cliente.id === orden.idCliente)?.nombre,
          serie: base.equipos.find((equipo) => equipo.id === orden.idEquipo)?.serie,
          telefono: base.clientes.find((cliente) => cliente.id === orden.idCliente)?.telefono,
          equipo: base.equipos
            .filter((equipo) => equipo.id === orden.idEquipo)
            .map((equipo) => `${equipo.marca} ${equipo.modelo}`)
            .join(''),
        }));
      enviar({
        clientes: esRecepcion ? base.clientes : [],
        equipos: esRecepcion ? base.equipos : [],
        ordenes,
        tecnicos: base.usuarios
          .filter((cuenta) => cuenta.esActivo && cuenta.rol === 'tecnico')
          .map((cuenta) => ({ id: cuenta.id, nombre: cuenta.nombre })),
      });
      return;
    }
    if (ruta === '/api/reportes' || ruta === '/api/reporte.pdf') {
      exigir(esAdministrador, 'Solo Administración puede consultar reportes.');
      const reporte = generarReporte(base, url.searchParams);
      if (ruta.endsWith('.pdf')) {
        enviarPdf([
          'TALLER - REPORTE ADMINISTRATIVO',
          `Usuario: ${usuario.nombre}`,
          `Generado: ${new Date().toISOString()}`,
          `Periodo: ${reporte.inicio} a ${reporte.fin}`,
          'Criterio: fecha de recepcion. Ingresos: ordenes LISTO o ENTREGADO.',
          `Ingresos: MXN ${reporte.ingresos.toFixed(2)}`,
          ...Object.entries(reporte.estados).map(([estado, cantidad]) => `${estado}: ${cantidad}`),
          'Productividad: tiempo desde recepcion hasta listo, en dias.',
          ...reporte.productividad.map(
            (fila) =>
              `${fila.nombre}: ${fila.cantidad} ordenes; promedio ${fila.promedioDias ?? 'N/A'}`,
          ),
        ]);
      } else {
        enviar(reporte);
      }
      return;
    }
    if (ruta.startsWith('/api/cotizacion/')) {
      const orden = base.ordenes.find((elemento) => elemento.id === ruta.split('/').pop());
      exigir(orden && (esRecepcion || orden.idTecnico === usuario.id), 'Orden no disponible.');
      exigir(orden.esDiagnosticoConcluido, 'Primero concluya el diagnóstico.');
      const total = orden.total || 0;
      const cliente = base.clientes.find((elemento) => elemento.id === orden.idCliente);
      const equipo = base.equipos.find((elemento) => elemento.id === orden.idEquipo);
      const envolver = (texto) => String(texto).match(/.{1,85}/g) || [''];
      enviarPdf([
        'TECNOFIX - COTIZACION',
        `Folio: ${orden.folio}`,
        `Fecha de emision: ${orden.fechaCotizacion}`,
        'Vigencia: 7 dias. Garantia: 30 dias en mano de obra (demostracion).',
        `Cliente: ${cliente.nombre}`,
        `Equipo: ${equipo.marca} ${equipo.modelo} / ${equipo.serie}`,
        'Diagnostico:',
        ...envolver(orden.diagnostico),
        'Refacciones propuestas:',
        ...envolver(orden.refacciones || 'Ninguna'),
        ...(orden.piezas || []).map(
          (pieza) => `${pieza.nombre}: ${pieza.cantidad} x ${pieza.costo.toFixed(2)}`,
        ),
        `Mano de obra: MXN ${Number(orden.manoObra || 0).toFixed(2)}`,
        `Refacciones: MXN ${Number(orden.costoRefacciones || 0).toFixed(2)}`,
        `Total estimado: MXN ${total.toFixed(2)}`,
      ]);
      return;
    }
    if (ruta === '/api/usuarios' && peticion.method === 'GET') {
      exigir(esAdministrador, 'Solo Administración puede gestionar usuarios.');
      enviar(base.usuarios.map(({ hash, ...cuenta }) => cuenta));
      return;
    }
    exigir(peticion.method === 'POST', 'Operación no disponible.');
    if (ruta === '/api/clientes') {
      exigir(esRecepcion, 'Solo Recepción o Administración registra clientes.');
      requerir(datos, ['nombre', 'telefono', 'correo']);
      exigir(/^\d{10}$/.test(datos.telefono), 'El teléfono debe tener 10 dígitos.');
      exigir(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo), 'Correo inválido.');
      exigir(
        !base.clientes.some(
          (cliente) =>
            cliente.telefono === datos.telefono ||
            cliente.correo.toLowerCase() === datos.correo.toLowerCase(),
        ),
        'Cliente duplicado.',
      );
      base.clientes.push({
        id: randomUUID(),
        nombre: datos.nombre,
        telefono: datos.telefono,
        correo: datos.correo,
      });
    } else if (ruta === '/api/equipos') {
      exigir(esRecepcion, 'Solo Recepción o Administración registra equipos.');
      requerir(datos, ['idCliente', 'marca', 'modelo', 'serie', 'especificaciones']);
      exigir(
        base.clientes.some((cliente) => cliente.id === datos.idCliente),
        'Cliente inexistente.',
      );
      exigir(
        !base.equipos.some((equipo) => equipo.serie.toLowerCase() === datos.serie.toLowerCase()),
        'Número de serie duplicado.',
      );
      base.equipos.push({ id: randomUUID(), ...datos });
    } else if (ruta === '/api/ordenes') {
      exigir(esRecepcion, 'Solo Recepción o Administración recibe equipos.');
      requerir(datos, ['idEquipo', 'falla', 'estadoFisico', 'accesorios']);
      const equipo = base.equipos.find((elemento) => elemento.id === datos.idEquipo);
      exigir(equipo, 'Equipo inexistente.');
      exigir(
        !base.ordenes.some(
          (orden) =>
            orden.idEquipo === equipo.id && !['ENTREGADO', 'CANCELADO'].includes(orden.estado),
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
    } else if (ruta.startsWith('/api/ordenes/')) {
      const orden = base.ordenes.find((elemento) => elemento.id === ruta.split('/').pop());
      exigir(orden && (esRecepcion || orden.idTecnico === usuario.id), 'Orden no disponible.');
      exigir(!['ENTREGADO', 'CANCELADO'].includes(orden.estado), 'La orden ya está cerrada.');
      if (datos.accion === 'asignar') {
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
            (cuenta) =>
              cuenta.id === datos.idTecnico && cuenta.rol === 'tecnico' && cuenta.esActivo,
          ),
          'Técnico inválido.',
        );
        if (orden.idTecnico) {
          requerir(datos, ['descripcion']);
        }
        orden.idTecnico = datos.idTecnico;
      } else if (datos.accion === 'estado') {
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
      } else if (datos.accion === 'piezas') {
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
          exigir(
            ['En stock', 'Por pedir'].includes(pieza.disponibilidad),
            'Disponibilidad inválida.',
          );
          return {
            nombre: pieza.nombre.trim(),
            cantidad: pieza.cantidad,
            costo: Number(pieza.costo),
            disponibilidad: pieza.disponibilidad,
          };
        });
        const costoRefacciones =
          piezas.reduce(
            (total, pieza) => total + Math.round(pieza.costo * 100) * pieza.cantidad,
            0,
          ) / 100;
        orden.total = calcularCosto(datos.manoObra, costoRefacciones);
        orden.manoObra = Number(datos.manoObra);
        orden.costoRefacciones = costoRefacciones;
        orden.piezas = piezas;
        orden.refacciones = piezas.map((pieza) => `${pieza.cantidad} x ${pieza.nombre}`).join('; ');
        orden.tieneAutorizacion = false;
        orden.esCotizacionEnviada = false;
        orden.decision = 'pendiente';
        orden.fechaCotizacion = new Date().toISOString();
      } else if (datos.accion === 'enviarCotizacion') {
        exigir(usuario.rol === 'tecnico' || esAdministrador, 'Operación reservada al técnico.');
        exigir(
          orden.estado === 'EN_DIAGNOSTICO' && orden.esDiagnosticoConcluido,
          'Primero concluya el diagnóstico.',
        );
        orden.esCotizacionEnviada = true;
      } else if (datos.accion === 'pago') {
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
      } else if (datos.accion === 'autorizar') {
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
      } else if (['diagnostico', 'reparacion'].includes(datos.accion)) {
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
            orden.estado === 'EN_REPARACION' &&
              orden.esDiagnosticoConcluido &&
              orden.tieneAutorizacion,
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
      } else {
        throw new Error('Seleccione una operación válida.');
      }
      registrarCambio(
        orden,
        usuario,
        `${datos.accion}: ${datos.estado || ''} ${datos.descripcion || ''}`,
      );
    } else if (ruta === '/api/usuarios') {
      exigir(esAdministrador, 'Solo Administración puede crear usuarios.');
      requerir(datos, ['nombre', 'usuario', 'contrasena', 'rol']);
      exigir(['administrador', 'recepcion', 'tecnico'].includes(datos.rol), 'Rol inválido.');
      exigir(datos.contrasena.length >= 10, 'Contraseña demasiado corta.');
      exigir(
        !base.usuarios.some((cuenta) => cuenta.usuario === datos.usuario),
        'Usuario duplicado.',
      );
      base.usuarios.push({
        id: randomUUID(),
        nombre: datos.nombre,
        usuario: datos.usuario,
        rol: datos.rol,
        esActivo: true,
        hash: derivarContrasena(datos.contrasena),
      });
    } else if (ruta.startsWith('/api/usuarios/')) {
      exigir(esAdministrador, 'Solo Administración puede desactivar usuarios.');
      const cuenta = base.usuarios.find((elemento) => elemento.id === ruta.split('/').pop());
      exigir(cuenta && cuenta.id !== usuario.id, 'No puede desactivar su propia cuenta.');
      if (datos.nombre !== undefined) {
        requerir(datos, ['nombre', 'usuario', 'rol']);
        exigir(['administrador', 'recepcion', 'tecnico'].includes(datos.rol), 'Rol inválido.');
        exigir(
          !base.usuarios.some(
            (elemento) => elemento.id !== cuenta.id && elemento.usuario === datos.usuario,
          ),
          'Usuario duplicado.',
        );
        exigir(
          !(
            cuenta.rol === 'tecnico' &&
            datos.rol !== 'tecnico' &&
            base.ordenes.some(
              (orden) =>
                orden.idTecnico === cuenta.id &&
                !['LISTO', 'ENTREGADO', 'CANCELADO'].includes(orden.estado),
            )
          ),
          'Reasigne las órdenes activas antes de cambiar el rol técnico.',
        );
        cuenta.nombre = datos.nombre;
        cuenta.usuario = datos.usuario;
        cuenta.rol = datos.rol;
      }
      cuenta.esActivo = datos.esActivo === true || datos.esActivo === 'true';
    } else {
      throw new Error('Ruta no disponible.');
    }
    guardar(base);
    enviar({ correcto: true });
  } catch (error) {
    enviar({ error: error.message }, 400);
  }
});

SERVIDOR.listen(PUERTO, '127.0.0.1');
