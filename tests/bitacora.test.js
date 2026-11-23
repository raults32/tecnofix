import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatearHistorialOrden } from '../src/utils/historialOrden.js';

const fecha = '2026-11-21T23:10:00.000Z';

test('La bitácora muestra órdenes anteriores sin etiquetas técnicas ni notas vacías', () => {
  const usuario = 'recepcion';
  const historial = [
    { fecha, usuario, detalle: 'Recepción del equipo' },
    { fecha, usuario: 'administrador', detalle: 'asignar:   ' },
    { fecha, usuario: 'tecnico', detalle: 'estado: EN_DIAGNOSTICO' },
    {
      fecha,
      usuario: 'tecnico',
      detalle: 'diagnostico:  Cambio de pantalla\r\n\r\n  Se revisó el conector.',
    },
    { fecha, usuario, detalle: 'pago: ' },
    { fecha: 'incorrecta', detalle: 'enviarCotizacion:' },
    null,
  ];
  const abono = { fecha, usuario, monto: 150, metodo: 'Tarjeta' };
  const movimientos = formatearHistorialOrden({ historial, pagos: [abono] });
  assert.deepEqual(
    movimientos.map(({ titulo }) => titulo),
    [
      'Equipo recibido',
      'Técnico asignado',
      'Diagnóstico iniciado',
      'Diagnóstico registrado',
      'Pago registrado',
      'Cotización enviada a Recepción',
    ],
  );
  assert.equal(movimientos[1].detalle, '');
  assert.equal(movimientos[3].detalle, 'Cambio de pantalla\nSe revisó el conector.');
  assert.match(movimientos[4].resumen, /150\.00 · Tarjeta/);
  assert.equal(movimientos[4].usuario, 'Recepción');
  assert.equal(movimientos[4].fechaIso, fecha);
  assert.match(movimientos[4].fecha, /3:10:00/);
  assert.equal(movimientos[5].fecha, 'Fecha no disponible');
  assert.equal(movimientos[5].usuario, 'Usuario sin identificar');
  assert.equal(formatearHistorialOrden({ historial, pagos: [abono, abono] })[4].resumen, '');
  assert.equal(
    formatearHistorialOrden({
      historial,
      pagos: [{ ...abono, fecha: '2026-11-21T23:11:00.000Z' }],
    })[4].resumen,
    '',
  );
  assert.deepEqual(formatearHistorialOrden({ historial: null }), []);
});

test('Los movimientos nuevos usan los datos de la acción y conservan el orden del registro', () => {
  const usuario = 'Ana Núñez';
  const movimientos = formatearHistorialOrden({
    historial: [
      {
        fecha,
        usuario,
        rol: 'administrador',
        tipo: 'reasignar',
        tecnico: 'Iván López',
        detalle: 'Cambio de turno.',
      },
      {
        fecha,
        usuario,
        rol: 'recepcion',
        tipo: 'autorizar',
        decision: 'rechazada',
        medio: 'Teléfono',
        detalle: 'El cliente rechazó la cotización.',
      },
      { fecha, usuario, tipo: 'piezas', partidas: 0, total: 250 },
      { fecha, usuario, tipo: 'pago', monto: 100, metodo: 'Efectivo' },
    ],
  });
  assert.equal(movimientos[0].rol, 'Administrador');
  assert.equal(movimientos[0].resumen, 'Iván López');
  assert.equal(movimientos[1].titulo, 'Cotización rechazada por el cliente');
  assert.match(movimientos[2].resumen, /0 partidas · .*250\.00/);
  assert.match(movimientos[3].resumen, /100\.00 · Efectivo/);
});
