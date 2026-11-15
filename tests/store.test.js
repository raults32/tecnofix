import { test } from 'node:test';
import assert from 'node:assert/strict';
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
