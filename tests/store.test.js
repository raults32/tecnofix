import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solicitar } from '../src/api/tecnofix.js';
import { useTecnoFixStore } from '../src/store/tecnofix.js';

test('Sesión compartida: carga una vez, actualiza después de guardar y limpia al salir', async () => {
  const fetchOriginal = globalThis.fetch;
  const llamadas = [];
  const usuario = { id: 'u1', nombre: 'Recepción de prueba', rol: 'recepcion' };
  let tieneSesion = true;
  let clientes = [];
  globalThis.fetch = async (url, opciones) => {
    llamadas.push([url, opciones.method]);
    if (url === '/api/sesion') return Response.json({ usuario });
    if (url === '/api/datos') {
      assert.equal(tieneSesion, true);
      return Response.json({ clientes, equipos: [], ordenes: [], tecnicos: [] });
    }
    if (url === '/api/clientes') {
      const cliente = JSON.parse(opciones.body);
      if (!cliente.nombre) return Response.json({ error: 'Falta el nombre.' }, { status: 400 });
      clientes = [{ id: 'c1', ...cliente }];
      return Response.json({ correcto: true });
    }
    if (url === '/api/logout') {
      tieneSesion = false;
      return Response.json({ correcto: true });
    }
    throw new Error(`Ruta inesperada: ${url}`);
  };
  try {
    const store = useTecnoFixStore.getState();
    await Promise.all([store.recuperarSesion(), store.recuperarSesion()]);
    assert.equal(llamadas.filter(([ruta]) => ruta === '/api/sesion').length, 1);
    assert.equal(useTecnoFixStore.getState().usuario.rol, 'recepcion');
    assert.equal(useTecnoFixStore.getState().cargando, false);
    let reinicios = 0;
    assert.equal(
      await store.manejarOperacion(
        'clientes',
        { nombre: 'Cliente de prueba' },
        { reset: () => reinicios++ },
      ),
      true,
    );
    assert.equal(useTecnoFixStore.getState().datos.clientes[0].nombre, 'Cliente de prueba');
    assert.equal(reinicios, 1);
    assert.equal(await store.manejarOperacion('clientes', { nombre: '' }), false);
    assert.equal(useTecnoFixStore.getState().mensaje, 'Falta el nombre.');
    assert.equal(useTecnoFixStore.getState().datos.clientes.length, 1);
    assert.equal(await store.cerrarSesion(), true);
    assert.equal(useTecnoFixStore.getState().usuario, null);
    assert.deepEqual(useTecnoFixStore.getState().datos.ordenes, []);
    assert.deepEqual(useTecnoFixStore.getState().datos.clientes, []);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test('El pago conserva su identificador durante un fallo y distingue guardar de actualizar', async (t) => {
  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });
  const usuario = { id: 'pago-prueba', nombre: 'Recepción', rol: 'recepcion' };
  const intentos = [];
  const pagos = new Map();
  let fallaConsulta = false;
  globalThis.fetch = async (url, opciones) => {
    if (url === '/api/login') return Response.json({ usuario });
    if (url === '/api/datos') {
      if (fallaConsulta) throw new Error('Sin conexión');
      return Response.json({ clientes: [], equipos: [], ordenes: [], tecnicos: [] });
    }
    if (url === '/api/ordenes/o1') {
      const pago = JSON.parse(opciones.body);
      intentos.push(pago);
      pagos.set(pago.idOperacion, pago);
      if (intentos.length === 1) throw new Error('Se perdió la respuesta');
      return Response.json({ correcto: true });
    }
    throw new Error(`Ruta inesperada: ${url}`);
  };

  const store = useTecnoFixStore.getState();
  assert.equal(await store.manejarOperacion('login', { usuario: 'recepcion' }), true);
  const ruta = 'ordenes/o1';
  const pago = { accion: 'pago', monto: '300', metodo: 'Efectivo' };
  assert.deepEqual(
    await Promise.all([store.manejarOperacion(ruta, pago), store.manejarOperacion(ruta, pago)]),
    [false, false],
  );
  assert.equal(intentos.length, 1);
  assert.match(useTecnoFixStore.getState().mensaje, /mismo monto y método/);
  assert.equal(await store.manejarOperacion(ruta, { ...pago, monto: '350' }), false);
  assert.equal(intentos.length, 1);

  fallaConsulta = true;
  assert.equal(await store.manejarOperacion(ruta, pago), true);
  assert.equal(intentos[0].idOperacion, intentos[1].idOperacion);
  assert.equal(pagos.size, 1);
  assert.match(useTecnoFixStore.getState().mensaje, /confirmó el guardado/);
  assert.equal(useTecnoFixStore.getState().datosDesactualizados, true);
  assert.equal(await store.manejarOperacion(ruta, pago), false);
  assert.equal(intentos.length, 2);

  fallaConsulta = false;
  assert.equal(await store.actualizarDatos(), true);
  assert.equal(await store.manejarOperacion(ruta, pago), true);
  assert.equal(pagos.size, 2);
});

test('La API muestra avisos claros para una espera vencida y una respuesta inválida', async (t) => {
  const fetchOriginal = globalThis.fetch;
  const timeoutOriginal = AbortSignal.timeout;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
    AbortSignal.timeout = timeoutOriginal;
  });
  const plazo = new AbortController();
  AbortSignal.timeout = (milisegundos) => {
    assert.equal(milisegundos, 10000);
    return plazo.signal;
  };
  globalThis.fetch = async (_url, { signal }) => {
    assert.equal(signal, plazo.signal);
    plazo.abort();
    throw new Error('Abortado');
  };
  await assert.rejects(solicitar('sesion'), /tardó demasiado/);
  AbortSignal.timeout = timeoutOriginal;
  globalThis.fetch = async () => new Response('<html>error</html>', { status: 502 });
  await assert.rejects(solicitar('sesion'), /respuesta inesperada/);
});

test('Usuarios y roles acepta la lista JSON que devuelve la API', async (t) => {
  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });
  const usuarios = [{ id: 'usuario-1', nombre: 'Técnico', rol: 'tecnico' }];
  globalThis.fetch = async () => Response.json(usuarios);
  assert.deepEqual(await solicitar('usuarios'), usuarios);
});
