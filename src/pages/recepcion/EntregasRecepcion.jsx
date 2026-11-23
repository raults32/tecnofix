import React from 'react';
import { leerPagoPendiente } from '../../store/pagosPendientes.js';
import { useTecnoFixStore } from '../../store/tecnofix.js';
import { pagosEnCentavos } from '../../utils/ordenUtils.js';
import { capturarFormulario, MONEDA, obtenerEstado } from '../../utils/vistaUtils.js';

/** Registra pagos con idempotencia y confirma la entrega física del equipo. */
export default function EntregasRecepcion({ actual, usuario, manejarOperacion, manejarAbrir }) {
  const bloqueado = useTecnoFixStore((state) => state.enviando || state.datosDesactualizados);
  const rutaActual = `ordenes/${actual.id}`;
  const pagoPendiente = leerPagoPendiente(usuario.id, rutaActual);
  const pagado = pagosEnCentavos(actual);
  const saldo = Math.max(0, Math.round((actual.total || 0) * 100) - pagado) / 100;

  const manejarPago = async (evento) => {
    const formulario = evento.currentTarget;
    const valores = capturarFormulario(evento);
    if (await manejarOperacion(rutaActual, { accion: 'pago', ...valores })) {
      formulario.elements.monto.value = '';
    }
  };

  return (
    <section className="columnas">
      <article>
        <h2>Resumen de la orden</h2>
        <dl>
          <dt>Cliente</dt>
          <dd>{actual.cliente}</dd>
          <dt>Equipo</dt>
          <dd>{actual.equipo}</dd>
          <dt>Trabajo</dt>
          <dd>{actual.reparacion}</dd>
          <dt>Estado</dt>
          <dd>{obtenerEstado(actual)}</dd>
        </dl>
        <button className="secundario" onClick={() => manejarAbrir(actual.id)}>
          Ver bitácora
        </button>
      </article>
      <form onSubmit={manejarPago} key={actual.id} aria-busy={bloqueado}>
        <h2>Pago</h2>
        <div className="columnas">
          <label>
            Total del servicio
            <input readOnly value={MONEDA.format(actual.total || 0)} />
          </label>
          <label>
            Pagos registrados
            <input readOnly value={MONEDA.format(pagado / 100)} />
          </label>
        </div>
        <div className="total">
          Saldo a cobrar
          <strong>{MONEDA.format(saldo)}</strong>
        </div>
        {pagoPendiente && (
          <p role="status">
            Hay un abono por confirmar. Usa el mismo monto y método para comprobarlo.
          </p>
        )}
        <label>
          Método de pago
          <select name="metodo" defaultValue={pagoPendiente?.metodo || 'Efectivo'}>
            <option>Efectivo</option>
            <option>Tarjeta</option>
            <option>Transferencia</option>
          </select>
        </label>
        <label>
          Monto recibido
          <input
            type="number"
            min="0.01"
            max={pagoPendiente ? undefined : saldo}
            step="0.01"
            name="monto"
            defaultValue={pagoPendiente?.monto ?? ''}
            required
          />
        </label>
        <button
          disabled={bloqueado || (!pagoPendiente && (actual.estado !== 'LISTO' || saldo === 0))}
        >
          {pagoPendiente ? 'Confirmar abono' : 'Registrar pago'}
        </button>
        <div className="separador" />
        <label className="opcion">
          <input
            type="checkbox"
            id="devolucion"
            onChange={(evento) => {
              evento.currentTarget.setCustomValidity('');
              evento.currentTarget.form.dataset.esVerificado = evento.target.checked ? 'true' : '';
            }}
          />
          Equipo y accesorios devueltos
        </label>
        <p>Confirma la devolución de equipo y accesorios antes de entregar.</p>
        <button
          type="button"
          className="secundario"
          disabled={bloqueado || actual.estado !== 'LISTO'}
          onClick={(evento) => {
            if (!evento.currentTarget.form.dataset.esVerificado) {
              evento.currentTarget.form
                .querySelector('#devolucion')
                .setCustomValidity('Confirma la devolución del equipo antes de entregar.');
              evento.currentTarget.form.querySelector('#devolucion').reportValidity();
              return;
            }
            manejarOperacion(rutaActual, {
              accion: 'estado',
              estado: 'ENTREGADO',
              equipoDevuelto: true,
            });
          }}
        >
          Entregar y cerrar orden
        </button>
      </form>
    </section>
  );
}
