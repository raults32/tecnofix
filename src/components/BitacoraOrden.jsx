import React from 'react';
import { formatearHistorialOrden } from '../utils/historialOrden.js';

export default function BitacoraOrden({ orden }) {
  const movimientos = formatearHistorialOrden(orden);
  return (
    <article className="bitacora">
      <h2>Bitácora de la orden</h2>
      {movimientos.length ? (
        <ol className="bitacora-lista" role="list">
          {movimientos.map((movimiento, indice) => (
            <li className="bitacora-movimiento" key={indice}>
              <div className="bitacora-cabecera">
                <strong>{movimiento.titulo}</strong>
                {movimiento.fechaIso ? (
                  <time dateTime={movimiento.fechaIso}>{movimiento.fecha}</time>
                ) : (
                  <span>{movimiento.fecha}</span>
                )}
              </div>
              <div className="bitacora-autor">
                <span>{movimiento.usuario}</span>
                {movimiento.rol && <span>{movimiento.rol}</span>}
              </div>
              {movimiento.resumen && <p className="bitacora-resumen">{movimiento.resumen}</p>}
              {movimiento.detalle && <p className="bitacora-detalle">{movimiento.detalle}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="vacio">Todavía no hay movimientos registrados en esta orden.</p>
      )}
    </article>
  );
}
