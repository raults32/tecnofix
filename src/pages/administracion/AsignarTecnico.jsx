import React from 'react';
import { useTecnoFixStore } from '../../store/tecnofix.js';
import { capturarFormulario, obtenerEstado } from '../../utils/vistaUtils.js';

/** Permite asignar o reasignar técnicos y consultar su carga actual. */
export default function AsignarTecnico({ datos, manejarOperacion }) {
  const bloqueado = useTecnoFixStore((state) => state.enviando || state.datosDesactualizados);
  const ordenesAsignables = datos.ordenes.filter((orden) =>
    ['RECIBIDO', 'EN_DIAGNOSTICO', 'EN_REPARACION'].includes(orden.estado),
  );

  const manejarAsignar = (evento, orden) => {
    const valores = capturarFormulario(evento);
    manejarOperacion(`ordenes/${orden.id}`, { accion: 'asignar', ...valores });
  };

  return (
    <>
      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Equipo</th>
              <th>Falla</th>
              <th>Estado</th>
              <th>Técnico / acción</th>
            </tr>
          </thead>
          <tbody>
            {ordenesAsignables.map((orden) => (
              <tr key={orden.id}>
                <td>
                  <strong>{orden.folio}</strong>
                </td>
                <td>{orden.equipo}</td>
                <td>{orden.falla}</td>
                <td>
                  <span className="estado">
                    {orden.idTecnico ? obtenerEstado(orden) : 'Sin asignar'}
                  </span>
                </td>
                <td>
                  <form className="asignacion" onSubmit={(evento) => manejarAsignar(evento, orden)}>
                    <select
                      name="idTecnico"
                      required
                      aria-label={`Técnico para ${orden.folio}`}
                      defaultValue={orden.idTecnico || ''}
                    >
                      <option value="">Elegir…</option>
                      {datos.tecnicos.map((tecnico) => (
                        <option key={tecnico.id} value={tecnico.id}>
                          {tecnico.nombre}
                        </option>
                      ))}
                    </select>
                    {orden.idTecnico && (
                      <input
                        name="descripcion"
                        required
                        placeholder="Motivo de reasignación"
                        aria-label="Motivo de reasignación"
                      />
                    )}
                    <button className="secundario" disabled={bloqueado}>
                      {orden.idTecnico ? 'Reasignar' : 'Asignar'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ordenesAsignables.length && <p className="vacio">No hay órdenes para asignar.</p>}
      </div>
      <h2>Carga actual de técnicos</h2>
      <section className="tres-columnas">
        {datos.tecnicos.map((tecnico) => (
          <article key={tecnico.id} className="carga-tecnico">
            <b>{tecnico.nombre[0]}</b>
            <div>
              <strong>{tecnico.nombre}</strong>
              <p>
                {
                  datos.ordenes.filter(
                    (orden) =>
                      orden.idTecnico === tecnico.id &&
                      !['LISTO', 'ENTREGADO', 'CANCELADO'].includes(orden.estado),
                  ).length
                }{' '}
                órdenes activas
              </p>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
