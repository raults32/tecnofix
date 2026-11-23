import React, { useState } from 'react';
import { solicitar } from '../../services/apiService.js';
import { fechaDelTaller } from '../../utils/fechas.js';
import { MONEDA, capturarFormulario } from '../../utils/vistaUtils.js';

/** Consulta reportes por rango de fechas y permite exportar PDF administrativo. */
export default function ReportesAdmin({ datos, manejarError, limpiarAviso }) {
  const [reporte, setReporte] = useState(null);
  const [consultandoReporte, setConsultandoReporte] = useState(false);
  const [tipoReporte, setTipoReporte] = useState('Órdenes');
  const hoy = fechaDelTaller();
  const mesActual = hoy.slice(0, 7);

  const manejarReporte = async (evento) => {
    const valores = capturarFormulario(evento);
    if (consultandoReporte) return;
    setReporte(null);
    setConsultandoReporte(true);
    limpiarAviso();
    try {
      const resultado = await solicitar(`reportes?${new URLSearchParams(valores)}`);
      if (!resultado.estados || !Array.isArray(resultado.productividad)) {
        throw new Error('No se pudo leer el reporte del periodo.');
      }
      setReporte(resultado);
    } catch (error) {
      manejarError(error);
    } finally {
      setConsultandoReporte(false);
    }
  };

  const ordenesPeriodo = reporte
    ? datos.ordenes.filter((orden) => {
        const fecha = fechaDelTaller(orden.fecha);
        return (
          fecha >= reporte.inicio &&
          fecha <= reporte.fin &&
          (tipoReporte === 'Gastos' || ['LISTO', 'ENTREGADO'].includes(orden.estado))
        );
      })
    : [];

  return (
    <>
      <div className="pestanas">
        {['Órdenes', 'Ingresos', 'Gastos', 'Productividad'].map((nombre) => (
          <button
            key={nombre}
            className={tipoReporte === nombre ? 'activo' : 'secundario'}
            onClick={() => setTipoReporte(nombre)}
          >
            {nombre}
          </button>
        ))}
      </div>
      <section className="documento-acciones">
        <div>
          <h2>{tipoReporte}</h2>
          {!reporte ? (
            <p className="vacio">Selecciona un periodo y consulta el reporte.</p>
          ) : (
            <>
              {tipoReporte === 'Órdenes' && (
                <table>
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Órdenes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reporte.estados).map(([estado, cantidad]) => (
                      <tr key={estado}>
                        <td>{estado}</td>
                        <td>{cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {['Ingresos', 'Gastos'].includes(tipoReporte) &&
                (ordenesPeriodo.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Orden</th>
                        <th>Concepto</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenesPeriodo.map((orden) => (
                        <tr key={orden.id}>
                          <td>{fechaDelTaller(orden.fecha)}</td>
                          <td>{orden.folio}</td>
                          <td>
                            {tipoReporte === 'Gastos'
                              ? orden.refacciones || 'Sin piezas'
                              : 'Servicio técnico'}
                          </td>
                          <td>
                            {MONEDA.format(
                              tipoReporte === 'Gastos' ? orden.costoRefacciones || 0 : orden.total,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="vacio">No hay registros en este periodo.</p>
                ))}
              {tipoReporte === 'Productividad' && (
                <table>
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>Atendidas</th>
                      <th>Promedio días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.productividad.map((fila) => (
                      <tr key={fila.id}>
                        <td>{fila.nombre}</td>
                        <td>{fila.cantidad}</td>
                        <td>{fila.promedioDias ?? 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="total">
                Ingresos de órdenes concluidas<strong>{MONEDA.format(reporte.ingresos)}</strong>
              </div>
            </>
          )}
        </div>
        <form
          onSubmit={manejarReporte}
          onChange={() => setReporte(null)}
          aria-busy={consultandoReporte}
        >
          <h2>Periodo y exportación</h2>
          <label>
            Desde
            <input
              name="inicio"
              type="date"
              defaultValue={`${mesActual}-01`}
              required
              max={hoy}
              disabled={consultandoReporte}
            />
          </label>
          <label>
            Hasta
            <input
              name="fin"
              type="date"
              defaultValue={hoy}
              required
              max={hoy}
              disabled={consultandoReporte}
            />
          </label>
          <button disabled={consultandoReporte}>
            {consultandoReporte ? 'Consultando…' : 'Consultar reporte'}
          </button>
          {reporte && (
            <a
              className="boton secundario"
              href={`/api/reporte.pdf?inicio=${reporte.inicio}&fin=${reporte.fin}`}
              target="_blank"
              rel="noreferrer"
            >
              Exportar reporte PDF
            </a>
          )}
          <small>
            El PDF contiene estados, ingresos y productividad. Gastos: consulta en pantalla.
          </small>
        </form>
      </section>
    </>
  );
}
