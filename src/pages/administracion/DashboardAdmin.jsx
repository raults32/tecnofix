import React from 'react';
import { fechaDelTaller } from '../../utils/fechas.js';
import { MONEDA, obtenerEstado } from '../../utils/vistaUtils.js';

/** Muestra indicadores mensuales, gráfica de gastos por semana y conteo por estado. */
export default function DashboardAdmin({ datos }) {
  const hoy = fechaDelTaller();
  const mesActual = hoy.slice(0, 7);
  const mensuales = datos.ordenes.filter((orden) =>
    fechaDelTaller(orden.fecha).startsWith(mesActual),
  );
  const concluidas = mensuales.filter((orden) => ['LISTO', 'ENTREGADO'].includes(orden.estado));
  const ingresos = concluidas.reduce((total, orden) => total + orden.total, 0);
  const gastos = concluidas.reduce((total, orden) => total + (orden.costoRefacciones || 0), 0);
  const semanales = [0, 1, 2, 3].map((semana) =>
    mensuales
      .filter(
        (orden) =>
          Math.min(3, Math.floor((Number(fechaDelTaller(orden.fecha).slice(8, 10)) - 1) / 7)) ===
          semana,
      )
      .reduce((total, orden) => total + (orden.costoRefacciones || 0), 0),
  );
  const maximo = Math.max(...semanales, 1);

  return (
    <>
      <p className="periodo">
        Periodo de recepción ·{' '}
        {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
      </p>
      <section className="indicadores">
        {[
          ['Ingresos del mes', MONEDA.format(ingresos)],
          ['Gastos (piezas)', MONEDA.format(gastos)],
          ['Utilidad estimada', MONEDA.format(ingresos - gastos)],
          [
            'Órdenes abiertas',
            datos.ordenes.filter((orden) => !['ENTREGADO', 'CANCELADO'].includes(orden.estado))
              .length,
          ],
        ].map(([etiqueta, valor]) => (
          <article key={etiqueta}>
            <small>{etiqueta}</small>
            <strong>{valor}</strong>
          </article>
        ))}
      </section>
      <section className="graficas">
        <article>
          <h2>Gastos por semana</h2>
          <div
            className="grafica-barras"
            aria-label="Gastos de piezas propuestos por semana del mes"
          >
            {semanales.map((importe, indice) => (
              <div key={indice}>
                <span>{MONEDA.format(importe)}</span>
                <div
                  className="barra"
                  style={{ height: `${Math.max(2, (importe / maximo) * 220)}px` }}
                />
                <small>Semana {indice + 1}</small>
              </div>
            ))}
          </div>
          <small>
            Costos registrados en órdenes recibidas en el mes; no son compras contables.
          </small>
        </article>
        <article>
          <h2>Órdenes por estado</h2>
          {[
            'Recibido',
            'En diagnóstico',
            'Esperando aprobación',
            'En reparación',
            'Listo',
            'Entregado',
            'Cancelado',
          ].map((estado) => {
            const cantidad = datos.ordenes.filter(
              (orden) => obtenerEstado(orden) === estado,
            ).length;
            return (
              <div className="fila-estado" key={estado}>
                <span className="estado">{estado}</span>
                <meter min="0" max={Math.max(datos.ordenes.length, 1)} value={cantidad} />
                <strong>{cantidad}</strong>
              </div>
            );
          })}
        </article>
      </section>
    </>
  );
}
