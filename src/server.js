// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: server.js
// Descripción: Recibe solicitudes HTTP y llama a las operaciones del backend.
// Fecha: 9 de noviembre de 2026

/* Importaciones del servidor y reglas compartidas. */
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { guardar, inicializarBase, leerBase } from './backend/base.js';
import { crearCotizacionPdf, crearReportePdf } from './backend/documentos/pdf.js';
import { generarReporte } from './backend/documentos/reportes.js';
import {
  actualizarOrden,
  buscarOrdenDisponible,
  crearOrden,
} from './backend/operaciones/ordenes.js';
import { registrarCliente, registrarEquipo } from './backend/operaciones/recepcion.js';
import { actualizarUsuario, crearUsuario, listarUsuarios } from './backend/operaciones/usuarios.js';
import { cerrarSesion, iniciarSesion, obtenerUsuario } from './backend/sesion.js';
import { exigir } from './backend/validaciones.js';

const PUERTO = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
inicializarBase();

async function leerDatos(peticion) {
  let cuerpo = '';
  let bytes = 0;
  peticion.setEncoding('utf8');
  for await (const fragmento of peticion.iterator({ destroyOnReturn: false })) {
    bytes += Buffer.byteLength(fragmento);
    if (bytes >= 20000) {
      peticion.resume();
      throw Object.assign(new Error('Solicitud demasiado grande.'), { estado: 413 });
    }
    cuerpo += fragmento;
  }
  let datos;
  try {
    datos = JSON.parse(cuerpo || '{}');
  } catch {
    throw new Error('Los datos enviados tienen un formato inválido.');
  }
  exigir(datos && typeof datos === 'object' && !Array.isArray(datos), 'Envía un objeto de datos.');
  return datos;
}

/* Servidor HTTP con autorización aplicada antes de cada operación. */
const SERVIDOR = http.createServer({ requestTimeout: 15000 }, async (peticion, respuesta) => {
  const enviar = (resultado, estado = 200) => {
    respuesta.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
    respuesta.end(JSON.stringify(resultado));
  };
  const enviarPdf = (contenido, nombre = 'documento.pdf') => {
    respuesta.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    });
    respuesta.end(contenido);
  };
  try {
    const url = new URL(peticion.url, `http://127.0.0.1:${PUERTO}`);
    const ruta = url.pathname;
    if (!ruta.startsWith('/api/')) {
      // Las rutas de React deben abrir también al recargar o pegar la URL.
      const carpetaDist = resolve('dist');
      const esRecurso = Boolean(extname(ruta));
      const archivo = resolve(carpetaDist, esRecurso ? `.${ruta}` : 'index.html');
      exigir(
        archivo.startsWith(carpetaDist + '\\') || archivo.startsWith(carpetaDist + '/'),
        'Ruta inválida.',
      );
      if (esRecurso && !existsSync(archivo)) {
        respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        respuesta.end('Recurso no encontrado.');
        return;
      }
      if (!existsSync(archivo)) {
        throw Object.assign(
          new Error('La aplicación compilada no está disponible. Ejecuta npm run build.'),
          { estado: 503 },
        );
      }
      const tipos = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.ico': 'image/x-icon',
      };
      const contenido = readFileSync(archivo);
      respuesta.writeHead(200, {
        'Content-Type': tipos[extname(archivo)] || 'application/octet-stream',
      });
      respuesta.end(contenido);
      return;
    }
    let datos = {};
    if (peticion.method === 'POST') {
      const origen = peticion.headers.origin;
      exigir(
        !origen || new URL(origen).host === peticion.headers.host,
        'Origen de solicitud no autorizado.',
      );
      datos = await leerDatos(peticion);
    }
    // Ya llegó el cuerpo. La lectura, la modificación y el guardado ocurren sin pausas.
    const base = leerBase();
    const token = peticion.headers.cookie?.match(/(?:^|; )sesion=([^;]+)/)?.[1];
    const usuario = obtenerUsuario(base, token);
    if (ruta === '/api/login' && peticion.method === 'POST') {
      const sesion = iniciarSesion(base.usuarios, datos);
      respuesta.setHeader(
        'Set-Cookie',
        `sesion=${sesion.token}; HttpOnly; SameSite=Strict; Path=/`,
      );
      enviar({ usuario: sesion.usuario });
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
      cerrarSesion(token);
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
        enviarPdf(
          crearReportePdf(reporte, usuario),
          `reporte-${reporte.inicio}-${reporte.fin}.pdf`,
        );
      } else {
        enviar(reporte);
      }
      return;
    }
    if (ruta.startsWith('/api/cotizacion/')) {
      const orden = buscarOrdenDisponible(base, ruta.split('/').pop(), usuario, esRecepcion);
      exigir(orden.esDiagnosticoConcluido, 'Primero concluya el diagnóstico.');
      const cliente = base.clientes.find((elemento) => elemento.id === orden.idCliente);
      const equipo = base.equipos.find((elemento) => elemento.id === orden.idEquipo);
      enviarPdf(crearCotizacionPdf(orden, cliente, equipo), 'cotizacion.pdf');
      return;
    }
    if (ruta === '/api/usuarios' && peticion.method === 'GET') {
      enviar(listarUsuarios(base, esAdministrador));
      return;
    }
    exigir(peticion.method === 'POST', 'Operación no disponible.');

    // Cada ruta llama a la función que valida y modifica los datos de esa sección.
    if (ruta === '/api/clientes') {
      registrarCliente(base, datos, esRecepcion);
    } else if (ruta === '/api/equipos') {
      registrarEquipo(base, datos, esRecepcion);
    } else if (ruta === '/api/ordenes') {
      crearOrden(base, datos, usuario, esRecepcion);
    } else if (ruta.startsWith('/api/ordenes/')) {
      const seModifico = actualizarOrden(base, ruta.split('/').pop(), datos, usuario, {
        esRecepcion,
        esAdministrador,
      });
      if (seModifico === false) {
        enviar({ correcto: true });
        return;
      }
    } else if (ruta === '/api/usuarios') {
      crearUsuario(base, datos, esAdministrador);
    } else if (ruta.startsWith('/api/usuarios/')) {
      actualizarUsuario(base, ruta.split('/').pop(), datos, usuario, esAdministrador);
    } else {
      throw new Error('Ruta no disponible.');
    }
    guardar(base);
    enviar({ correcto: true });
  } catch (error) {
    if (respuesta.destroyed) return;
    if (error.estado === 413) respuesta.setHeader('Connection', 'close');
    enviar({ error: error.message }, error.estado || 400);
  }
});

SERVIDOR.listen(PUERTO, HOST);
