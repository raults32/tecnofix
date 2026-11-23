import React from 'react';
import { useTecnoFixStore } from '../../store/tecnofix.js';
import { MONEDA } from '../../utils/vistaUtils.js';

/** Muestra la vista previa de cotización, descarga PDF y envío a Recepción. */
export default function CotizacionTecnico({ orden, manejarOperacion, manejarNavegar }) {
  const bloqueado = useTecnoFixStore((state) => state.enviando || state.datosDesactualizados);

  return (
    <section className="documento-acciones">
      <article className="documento">
        <div className="titulo-documento">
          <h2>TecnoFix</h2>
          <strong>COTIZACIÓN</strong>
        </div>
        <p>
          Folio {orden.folio} · {orden.fechaCotizacion?.slice(0, 10)}
        </p>
        <p>
          Cliente: {orden.cliente} · {orden.equipo}
        </p>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Cant.</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {(orden.piezas || []).map((pieza, indice) => (
              <tr key={indice}>
                <td>{pieza.nombre}</td>
                <td>{pieza.cantidad}</td>
                <td>{MONEDA.format(pieza.cantidad * pieza.costo)}</td>
              </tr>
            ))}
            <tr>
              <td>Mano de obra</td>
              <td>1</td>
              <td>{MONEDA.format(orden.manoObra || 0)}</td>
            </tr>
          </tbody>
        </table>
        <div className="total">
          Total: <strong>{MONEDA.format(orden.total || 0)}</strong>
        </div>
        <small>Vigencia 7 días · Garantía de demostración: 30 días en mano de obra.</small>
      </article>
      <article>
        <h2>Acciones</h2>
        <div className="acciones">
          {orden.esDiagnosticoConcluido && (
            <a
              className="boton"
              href={`/api/cotizacion/${orden.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Descargar PDF
            </a>
          )}
          <button
            className="secundario"
            disabled={
              bloqueado ||
              orden.estado !== 'EN_DIAGNOSTICO' ||
              !orden.esDiagnosticoConcluido ||
              orden.esCotizacionEnviada
            }
            onClick={() => manejarOperacion(`ordenes/${orden.id}`, { accion: 'enviarCotizacion' })}
          >
            {orden.esCotizacionEnviada ? 'Cotización enviada' : 'Enviar a Recepción'}
          </button>
          <button className="secundario" onClick={() => manejarNavegar('piezas')}>
            Volver a editar piezas
          </button>
        </div>
        <small>Al enviarla, se muestra “Esperando aprobación” hasta registrar la decisión.</small>
      </article>
    </section>
  );
}
