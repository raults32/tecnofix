import React from 'react';
import { useOutletContext, useParams } from 'react-router';
import { MONEDA, obtenerEstado } from './utils/vistaUtils.js';

export default function Detalle() {
  // Es el mismo patrón de Detalle.jsx en la Pokédex, ahora el ID es de una orden.
  const { id } = useParams();
  const { datos, esAdministrador, manejarNavegar } = useOutletContext();
  const orden = datos.ordenes.find((elemento) => elemento.id === id);
  if (!orden) return <p className="vacio">No se encontró una orden disponible con ese ID.</p>;
  return (
    <>
      <section className="columnas">
        <article>
          <h2>Resumen de la orden</h2>
          <dl>
            <dt>Cliente</dt>
            <dd>{orden.cliente}</dd>
            <dt>Equipo / serie</dt>
            <dd>
              {orden.equipo} · {orden.serie}
            </dd>
            <dt>Falla reportada</dt>
            <dd>{orden.falla}</dd>
            <dt>Estado</dt>
            <dd>{obtenerEstado(orden)}</dd>
            <dt>Total</dt>
            <dd>{MONEDA.format(orden.total || 0)}</dd>
          </dl>
          {orden.esDiagnosticoConcluido && (
            <a
              className="boton secundario"
              href={`/api/cotizacion/${orden.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Ver PDF
            </a>
          )}
        </article>
        <article>
          <h2>Seguimiento</h2>
          <div className="acciones">
            <button onClick={() => manejarNavegar('cotizaciones')}>Cotización y aprobación</button>
            <button onClick={() => manejarNavegar('entregas')}>Entrega y pago</button>
            {esAdministrador && (
              <button onClick={() => manejarNavegar('asignar')}>Asignar técnico</button>
            )}
          </div>
        </article>
      </section>
      <article className="bitacora">
        <h2>Bitácora de la orden</h2>
        {orden.historial.map((cambio, indice) => (
          <p key={indice}>
            {new Date(cambio.fecha).toLocaleString('es-MX')} · {cambio.usuario} ·{cambio.detalle}
          </p>
        ))}
      </article>
    </>
  );
}
