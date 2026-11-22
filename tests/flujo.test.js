// Nombre: Desarrollo asistido por Codex; revisiÃ³n pendiente del Equipo 5
// Proyecto: Sistema de GestiÃ³n para Servicio TÃ©cnico de Computadoras
// Archivo: flujo.test.js
// DescripciÃ³n: tests/flujo.test.js
// Fecha: 9 de noviembre de 2026

/* Importaciones del ejecutor y del servidor aislado. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validarTransicion, calcularCosto } from '../src/utils/ordenUtils.js';

/* Pruebas de reglas puras. */
test('Costos: redondeo y rechazo de negativos, infinitos y texto', () => {
  assert.equal(calcularCosto('0.10', '0.20'), 0.3);
  for (const valor of [-1, 'abc', Infinity, '', ' ', null, true, 1e20]) {
    assert.throws(() => calcularCosto(valor, 0));
  }
});

test('Estados: no permite saltos ni avanzar sin asignación', () => {
  assert.throws(() => validarTransicion({ estado: 'RECIBIDO' }, 'ENTREGADO', 'administrador'));
  assert.throws(() => validarTransicion({ estado: 'RECIBIDO' }, 'EN_DIAGNOSTICO', 'tecnico'));
  assert.throws(() => validarTransicion({ estado: 'ENTREGADO' }, 'RECIBIDO', 'administrador'));
});

/* Escenario real contra HTTP y persistencia temporal. */
test('Flujo integrado, permisos, PDF, reportes y persistencia', async () => {
  const directorio = mkdtempSync(join(tmpdir(), 'vyv-prueba-'));
  let proceso;
  let cookie = '';
  const iniciar = () =>
    spawn(process.execPath, ['src/server.js'], {
      env: { ...process.env, PORT: '3197', DATA_DIR: directorio },
      stdio: 'pipe',
    });
  const esperar = async () => {
    for (let intento = 0; intento < 80; intento += 1) {
      try {
        await fetch('http://127.0.0.1:3197/api/sesion');
        return;
      } catch {
        await new Promise((resolver) => setTimeout(resolver, 100));
      }
    }
    throw new Error('El servidor no inició.');
  };
  const consultar = async (ruta, datos, esCorrecto = true) => {
    const respuesta = await fetch(`http://127.0.0.1:3197/api/${ruta}`, {
      method: datos ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    const nuevaCookie = respuesta.headers.get('set-cookie');
    if (nuevaCookie) {
      cookie = nuevaCookie.split(';')[0];
    }
    assert.equal(respuesta.ok, esCorrecto, `${ruta}: ${respuesta.status}`);
    if (respuesta.headers.get('content-type').includes('application/pdf')) {
      const contenido = Buffer.from(await respuesta.arrayBuffer());
      assert.equal(contenido.subarray(0, 8).toString(), '%PDF-1.4');
      assert.ok(contenido.toString().includes('%%EOF'));
      return contenido;
    }
    return respuesta.json();
  };
  const entrar = async (usuario) => consultar('login', { usuario, contrasena: 'Taller2026!' });
  const pago = (monto, metodo = 'Efectivo') => ({
    accion: 'pago',
    monto,
    metodo,
    idOperacion: randomBytes(16).toString('hex'),
  });
  const entrega = { accion: 'estado', estado: 'ENTREGADO', equipoDevuelto: true };
  try {
    proceso = iniciar();
    await esperar();
    const faltante = await fetch('http://127.0.0.1:3197/favicon.ico');
    assert.equal(faltante.ok, false);
    const inicio = await fetch('http://127.0.0.1:3197/');
    assert.ok((await inicio.text()).includes('root'));
    for (const ruta of [
      '/dashboard',
      '/dashboard/detalle/orden-prueba',
      '/dashboard/piezas/orden-prueba',
    ]) {
      const pagina = await fetch(`http://127.0.0.1:3197${ruta}`);
      assert.equal(pagina.status, 200);
      assert.ok(pagina.headers.get('content-type').includes('text/html'));
      assert.ok((await pagina.text()).includes('root'));
    }
    const apiInexistente = await fetch('http://127.0.0.1:3197/api/no-existe');
    assert.ok(apiInexistente.headers.get('content-type').includes('application/json'));
    assert.equal(apiInexistente.ok, false);
    await consultar('datos', undefined, false);
    await entrar('administrador');
    for (const cuerpo of ['{', 'null', '[]', JSON.stringify({ nombre: 'á'.repeat(11000) })]) {
      const respuesta = await fetch('http://127.0.0.1:3197/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: cuerpo,
      });
      assert.equal(respuesta.status, cuerpo.length > 10000 ? 413 : 400);
      assert.equal(typeof (await respuesta.json()).error, 'string');
    }
    await consultar('clientes', {
      nombre: 'Cliente de prueba',
      telefono: '6461234567',
      correo: 'cliente@example.com',
    });
    await consultar(
      'clientes',
      { nombre: 'Duplicado', telefono: '6461234567', correo: 'otro@example.com' },
      false,
    );
    let datos = await consultar('datos');
    await consultar('equipos', {
      idCliente: datos.clientes[0].id,
      marca: 'Dell',
      modelo: 'XPS',
      serie: 'TEST-001',
      especificaciones: '16 GB RAM',
    });
    datos = await consultar('datos');
    const alta = {
      idEquipo: datos.equipos[0].id,
      falla: 'No enciende',
      estadoFisico: 'Sin daños',
      accesorios: 'Cargador',
    };
    await consultar('ordenes', alta);
    await consultar('ordenes', alta, false);
    datos = await consultar('datos');
    const idOrden = datos.ordenes[0].id;
    const ruta = `ordenes/${idOrden}`;
    await consultar(ruta, { accion: 'estado', estado: 'LISTO' }, false);
    await consultar(`cotizacion/${idOrden}`, undefined, false);
    await consultar(ruta, { accion: 'asignar', idTecnico: datos.tecnicos[0].id });
    await entrar('tecnico');
    await consultar('clientes', { nombre: 'Intruso' }, false);
    await consultar('reportes?inicio=2026-01-01&fin=2026-11-09', undefined, false);
    await consultar(ruta, { accion: 'estado', estado: 'EN_DIAGNOSTICO' });
    await consultar(
      ruta,
      { accion: 'diagnostico', descripcion: 'Corto', manoObra: '100', costoRefacciones: '250' },
      false,
    );
    await consultar(ruta, {
      accion: 'diagnostico',
      descripcion: 'Se detectó daño en la fuente de alimentación.',
      manoObra: '100',
      costoRefacciones: '250',
      refacciones: 'Una fuente de alimentación',
    });
    await consultar(ruta, {
      accion: 'piezas',
      piezas: [{ nombre: 'Fuente', cantidad: 1, costo: 250, disponibilidad: 'Por pedir' }],
      manoObra: 100,
    });
    await consultar(
      ruta,
      {
        accion: 'piezas',
        piezas: [{ nombre: 'Fuente', cantidad: -1, costo: 250, disponibilidad: 'Por pedir' }],
        manoObra: 100,
      },
      false,
    );
    await consultar(ruta, { accion: 'enviarCotizacion' });
    datos = await consultar('datos');
    assert.equal(datos.ordenes[0].piezas[0].nombre, 'Fuente');
    assert.equal(datos.ordenes[0].esCotizacionEnviada, true);
    await consultar(`cotizacion/${idOrden}`);
    await consultar(ruta, { accion: 'estado', estado: 'EN_REPARACION' }, false);
    await entrar('recepcion');
    await consultar(ruta, {
      accion: 'autorizar',
      decision: 'rechazada',
      descripcion: 'El cliente rechaza.',
    });
    await entrar('tecnico');
    await consultar(ruta, { accion: 'estado', estado: 'EN_REPARACION' }, false);
    await entrar('recepcion');
    await consultar(ruta, {
      accion: 'autorizar',
      decision: 'aprobada',
      medio: 'Teléfono',
      descripcion: 'Cliente autoriza por teléfono.',
    });
    await entrar('tecnico');
    await consultar(ruta, { accion: 'estado', estado: 'EN_REPARACION' });
    await consultar(ruta, { accion: 'estado', estado: 'LISTO' }, false);
    await consultar(
      ruta,
      {
        accion: 'reparacion',
        descripcion: 'Se reemplazó la fuente y probó arranque.',
        manoObra: '-5',
        costoRefacciones: '250',
      },
      false,
    );
    await consultar(ruta, {
      accion: 'reparacion',
      descripcion: 'Se reemplazó la fuente y probó arranque.',
      manoObra: '100',
      costoRefacciones: '250',
      refacciones: 'Una fuente nueva',
      pruebasFinales: 'Arranque y estabilidad comprobados.',
      minutosTrabajo: '25',
    });
    await consultar(ruta, { accion: 'estado', estado: 'LISTO' });
    await consultar(ruta, entrega, false);
    await consultar(ruta, pago('350'), false);
    await entrar('recepcion');
    assert.match((await consultar(ruta, entrega, false)).error, /saldo/);
    for (const monto of ['500', '-1', 'texto', '0.001']) {
      assert.match((await consultar(ruta, pago(monto), false)).error, /Monto inválido/);
    }
    await consultar(ruta, { accion: 'pago', monto: '100', metodo: 'Efectivo' }, false);
    const primerAbono = pago('100');
    await Promise.all([consultar(ruta, primerAbono), consultar(ruta, primerAbono)]);
    datos = await consultar('datos');
    assert.deepEqual(
      datos.ordenes[0].pagos.map((abono) => abono.monto),
      [100],
    );
    await consultar(ruta, { ...primerAbono, monto: '50' }, false);
    await Promise.all([consultar(ruta, pago('100')), consultar(ruta, pago('150', 'Tarjeta'))]);
    datos = await consultar('datos');
    assert.deepEqual(
      datos.ordenes[0].pagos.map((abono) => abono.monto).sort((a, b) => a - b),
      [100, 100, 150],
    );
    assert.match(
      (await consultar(ruta, { ...entrega, equipoDevuelto: false }, false)).error,
      /devolución/,
    );
    await consultar(ruta, entrega);
    await entrar('administrador');
    const hoy = new Date().toISOString().slice(0, 10);
    const reporte = await consultar(`reportes?inicio=${hoy}&fin=${hoy}`);
    assert.equal(reporte.ingresos, 350);
    assert.equal(reporte.estados.ENTREGADO, 1);
    assert.equal(reporte.productividad[0].cantidad, 1);
    await consultar(`reporte.pdf?inicio=${hoy}&fin=${hoy}`);
    await consultar('reportes?inicio=2026-12-31&fin=2026-01-01', undefined, false);
    await consultar('reportes?inicio=2026-02-31&fin=2026-03-10', undefined, false);
    await consultar('usuarios', {
      nombre: 'Temporal',
      usuario: 'temporal',
      contrasena: 'Temporal2026!',
      rol: 'tecnico',
    });
    const cuentas = await consultar('usuarios');
    assert.ok(cuentas.every((cuenta) => !cuenta.hash));
    const idTemporal = cuentas.find((cuenta) => cuenta.usuario === 'temporal').id;
    await consultar(`usuarios/${idTemporal}`, {
      nombre: 'Empleado actualizado',
      usuario: 'temporal',
      rol: 'recepcion',
      esActivo: 'true',
    });
    const cuentasActualizadas = await consultar('usuarios');
    assert.equal(cuentasActualizadas.find((cuenta) => cuenta.id === idTemporal).rol, 'recepcion');
    await consultar(`usuarios/${cuentas.find((cuenta) => cuenta.usuario === 'temporal').id}`, {
      esActivo: false,
    });
    await consultar('login', { usuario: 'temporal', contrasena: 'Temporal2026!' }, false);
    await consultar(
      `usuarios/${cuentas.find((cuenta) => cuenta.usuario === 'administrador').id}`,
      { esActivo: false },
      false,
    );
    datos = await consultar('datos');
    assert.ok(datos.ordenes[0].historial.length >= 8);
    await new Promise((resolver) => {
      proceso.once('exit', resolver);
      proceso.kill();
    });
    proceso = iniciar();
    cookie = '';
    await esperar();
    await entrar('administrador');
    datos = await consultar('datos');
    assert.equal(datos.ordenes[0].estado, 'ENTREGADO');
    await consultar(ruta, primerAbono);
    datos = await consultar('datos');
    assert.equal(datos.ordenes[0].pagos.length, 3);
  } finally {
    if (proceso && proceso.exitCode === null) {
      await new Promise((resolver) => {
        proceso.once('exit', resolver);
        proceso.kill();
      });
    }
    rmSync(directorio, { recursive: true, force: true });
  }
});
