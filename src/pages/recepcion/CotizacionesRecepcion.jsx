import React from 'react';
import { useTecnoFixStore } from '../../store/tecnofix.js';
import { capturarFormulario, MONEDA } from '../../utils/vistaUtils.js';

/** Muestra la cotización de la orden elegida y registra la decisión del cliente. */
export default function CotizacionesRecepcion({ actual, manejarOperacion }) {
  const bloqueado = useTecnoFixStore((state) => state.enviando || state.datosDesactualizados);

  const manejarDecision = (evento) => {
    const valores = capturarFormulario(evento);
    manejarOperacion(`ordenes/${actual.id}`, { accion: 'autorizar', ...valores });
  };

  return (
    <section className="columnas cotizacion-recepcion">
      <div>
        <h2>Cotización recibida del técnico · {actual.folio}</h2>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Cant.</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {(actual.piezas || []).map((pieza, indice) => (
              <tr key={indice}>
                <td>{pieza.nombre}</td>
                <td>{pieza.cantidad}</td>
                <td>{MONEDA.format(pieza.cantidad * pieza.costo)}</td>
              </tr>
            ))}
            <tr>
              <td>Mano de obra</td>
              <td>1</td>
              <td>{MONEDA.format(actual.manoObra || 0)}</td>
            </tr>
          </tbody>
        </table>
        <div className="total">
          Total <strong>{MONEDA.format(actual.total || 0)}</strong>
        </div>
        <a
          className="boton secundario"
          href={`/api/cotizacion/${actual.id}`}
          target="_blank"
          rel="noreferrer"
        >
          Ver PDF
        </a>
      </div>
      <form onSubmit={manejarDecision}>
        <h2>Registrar decisión del cliente</h2>
        {['aprobada', 'rechazada', 'pendiente'].map((decision) => (
          <label className="opcion" key={decision}>
            <input
              type="radio"
              name="decision"
              value={decision}
              defaultChecked={decision === 'aprobada'}
            />
            {decision}
          </label>
        ))}
        <label>
          Medio de confirmación
          <select name="medio">
            <option>WhatsApp</option>
            <option>Teléfono</option>
            <option>Presencial</option>
            <option>Correo</option>
          </select>
        </label>
        <label>
          Notas
          <textarea name="descripcion" required maxLength={1000} placeholder="Cliente confirma…" />
        </label>
        <button disabled={bloqueado || actual.estado !== 'EN_DIAGNOSTICO'}>
          Registrar aprobación
        </button>
        <p>Decisión actual: {actual.decision || 'Pendiente'}</p>
      </form>
    </section>
  );
}
