import React from 'react';
import { useOutletContext } from 'react-router';
import TablaOrdenes from './components/TablaOrdenes.jsx';
import Administracion from './pages/Administracion.jsx';
import Recepcion from './pages/Recepcion.jsx';
import Tecnico from './pages/Tecnico.jsx';
import Historial from './pages/Historial.jsx';
import { obtenerEstado } from './utils/vistaUtils.js';

// Conserva las pantallas anteriores. El Layout les comparte los mismos datos.
export default function Home() {
  const propiedades = useOutletContext();
  const {
    datos,
    usuario,
    orden,
    seccion,
    esAdministrador,
    busqueda,
    setBusqueda,
    filtroEstado,
    setFiltroEstado,
    ordenSeleccionada,
    seleccionarOrden,
    manejarAbrir,
    manejarNavegar,
  } = propiedades;
  const ordenesFiltradas = datos.ordenes.filter((elemento) =>
    [elemento.folio, elemento.cliente, elemento.serie, elemento.telefono, elemento.equipo]
      .join(' ')
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );
  return (
    <>
      {seccion === 'inicio' && !esAdministrador && (
        <>
          {usuario.rol === 'recepcion' && (
            <section className="indicadores">
              {[
                [
                  'Recibidos hoy',
                  datos.ordenes.filter(
                    (elemento) =>
                      elemento.fecha.slice(0, 10) === new Date().toISOString().slice(0, 10),
                  ).length,
                ],
                [
                  'En proceso',
                  datos.ordenes.filter((elemento) =>
                    ['EN_DIAGNOSTICO', 'EN_REPARACION'].includes(elemento.estado),
                  ).length,
                ],
                [
                  'Esperando aprobación',
                  datos.ordenes.filter(
                    (elemento) => obtenerEstado(elemento) === 'Esperando aprobación',
                  ).length,
                ],
                [
                  'Listos para entrega',
                  datos.ordenes.filter((elemento) => elemento.estado === 'LISTO').length,
                ],
              ].map(([etiqueta, valor]) => (
                <article key={etiqueta}>
                  <small>{etiqueta}</small>
                  <strong>{valor}</strong>
                </article>
              ))}
            </section>
          )}
          {usuario.rol === 'tecnico' && (
            <div className="pestanas filtros-tecnico">
              {['Todas', 'En diagnóstico', 'En reparación', 'Esperando aprobación', 'Listo'].map(
                (estado) => (
                  <button
                    key={estado}
                    className={filtroEstado === estado ? 'activo' : 'secundario'}
                    onClick={() => setFiltroEstado(estado)}
                  >
                    {estado} (
                    {
                      datos.ordenes.filter(
                        (elemento) => estado === 'Todas' || obtenerEstado(elemento) === estado,
                      ).length
                    }
                    )
                  </button>
                ),
              )}
            </div>
          )}
          <div className="herramientas">
            <input
              aria-label="Buscar órdenes"
              value={busqueda}
              placeholder="Buscar por folio, cliente, serie o teléfono…"
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
            {usuario.rol === 'recepcion' && (
              <button onClick={() => manejarNavegar('nueva')}>+ Nueva recepción</button>
            )}
          </div>
          <TablaOrdenes
            ordenes={ordenesFiltradas.filter(
              (elemento) =>
                usuario.rol !== 'tecnico' ||
                filtroEstado === 'Todas' ||
                obtenerEstado(elemento) === filtroEstado,
            )}
            tecnicos={datos.tecnicos}
            manejarAbrir={manejarAbrir}
          />
        </>
      )}
      {esAdministrador && ['inicio', 'asignar', 'reportes', 'usuarios'].includes(seccion) && (
        <Administracion {...propiedades} />
      )}
      {seccion === 'historial' && <Historial {...propiedades} />}
      {['nueva', 'cotizaciones', 'entregas'].includes(seccion) && usuario.rol !== 'tecnico' && (
        <Recepcion {...propiedades} />
      )}
      {['diagnostico', 'piezas', 'cotizacion', 'reparacion'].includes(seccion) &&
        usuario.rol === 'tecnico' && (
          <>
            <label className="selector-orden">
              Orden de trabajo
              <select
                value={ordenSeleccionada}
                onChange={(evento) => seleccionarOrden(evento.target.value)}
              >
                <option value="">Selecciona una orden</option>
                {datos.ordenes.map((elemento) => (
                  <option key={elemento.id} value={elemento.id}>
                    {elemento.folio} · {elemento.equipo}
                  </option>
                ))}
              </select>
            </label>
            {orden ? (
              <Tecnico key={`${orden.id}-${seccion}`} {...propiedades} />
            ) : (
              <p className="vacio">Selecciona una orden asignada para continuar.</p>
            )}
          </>
        )}
    </>
  );
}
