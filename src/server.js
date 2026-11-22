// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: server.js
// Descripción: Recibe solicitudes HTTP y llama a las operaciones del backend.
// Fecha: 9 de noviembre de 2026

/* Importaciones del servidor y reglas compartidas. */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { guardar, inicializarBase, leerBase } from './backend/base.js';
import { actualizarOrden, buscarOrdenDisponible, crearOrden } from './backend/ordenes.js';
import { registrarCliente, registrarEquipo } from './backend/recepcion.js';
import { crearReportePdf, generarReporte } from './backend/reportes.js';
import { cerrarSesion, iniciarSesion, obtenerUsuario } from './backend/sesion.js';
import { actualizarUsuario, crearUsuario, listarUsuarios } from './backend/usuarios.js';
import { exigir } from './backend/validaciones.js';
import { crearCotizacionPdf } from './utils/pdf.js';

const PUERTO = Number(process.env.PORT || 3000);
inicializarBase();

/* Servidor HTTP con autorización aplicada antes de cada operación. */
const SERVIDOR = http.createServer(async (peticion, respuesta) => {
  const url = new URL(peticion.url, `http://127.0.0.1:${PUERTO}`);
  const ruta = url.pathname;
  const enviar = (resultado, estado = 200) => {
    respuesta.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
    respuesta.end(JSON.stringify(resultado));
  };
  const enviarPdf = (contenido, nombre = 'documento.pdf') => {
    respuesta.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nombre}"`,
    });
    respuesta.end(contenido);
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
    const base = leerBase();
    const token = peticion.headers.cookie?.match(/(?:^|; )sesion=([^;]+)/)?.[1];
    const usuario = obtenerUsuario(base, token);
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
        enviarPdf(crearReportePdf(reporte, usuario));
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
      actualizarOrden(base, ruta.split('/').pop(), datos, usuario, {
        esRecepcion,
        esAdministrador,
      });
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
    enviar({ error: error.message }, 400);
  }
});

SERVIDOR.listen(PUERTO, '127.0.0.1');
