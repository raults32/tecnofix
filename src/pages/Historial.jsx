// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: Historial.jsx
// Descripción: Pantallas funcionales basadas en los prototipos TecnoFix.
// Fecha: 9 de noviembre de 2026

/* Importaciones de presentación. */
import React, { useState } from 'react';
import TablaOrdenes from '../components/TablaOrdenes.jsx';
import { MONEDA } from '../utils/vistaUtils.js';

/** Consulta el historial por cliente o equipo sobre los registros reales. */
function Historial({ datos, manejarAbrir }) {
  /* Filtro y ficha elegida por el usuario. */
  const [modo, setModo] = useState('cliente');
  const [busqueda, setBusqueda] = useState('');
  const [indiceFicha, setIndiceFicha] = useState(0);
  const filtradas = datos.ordenes.filter((orden) =>
    (modo === 'cliente' ? `${orden.cliente} ${orden.telefono}` : `${orden.serie} ${orden.equipo}`)
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );
  const fichasUnicas = [];
  const vistos = new Set();
  for (const orden of filtradas) {
    const clave =
      modo === 'cliente' ? orden.idCliente || orden.cliente : orden.idEquipo || orden.serie;
    if (!vistos.has(clave)) {
      vistos.add(clave);
      fichasUnicas.push(orden);
    }
  }
  const ficha = fichasUnicas[indiceFicha % Math.max(fichasUnicas.length, 1)];
  const ordenesFicha = ficha
    ? filtradas.filter((orden) =>
        modo === 'cliente'
          ? (orden.idCliente || orden.cliente) === (ficha.idCliente || ficha.cliente)
          : (orden.idEquipo || orden.serie) === (ficha.idEquipo || ficha.serie),
      )
    : [];
  return (
    <>
      <div className="herramientas">
        <div className="pestanas">
          {['cliente', 'equipo'].map((nombre) => (
            <button
              key={nombre}
              className={modo === nombre ? 'activo' : 'secundario'}
              onClick={() => {
                setModo(nombre);
                setIndiceFicha(0);
              }}
            >
              Por {nombre}
            </button>
          ))}
        </div>
        <input
          aria-label="Buscar historial"
          value={busqueda}
          onChange={(evento) => {
            setBusqueda(evento.target.value);
            setIndiceFicha(0);
          }}
          placeholder="Buscar por nombre, teléfono o número de serie…"
        />
      </div>
      <section className="ficha-tabla">
        <article>
          <h2>Ficha del {modo}</h2>
          {ficha ? (
            <>
              <dl>
                <dt>Nombre / Propietario</dt>
                <dd>{ficha.cliente}</dd>
                <dt>Teléfono</dt>
                <dd>{ficha.telefono}</dd>
                <dt>Equipo</dt>
                <dd>{ficha.equipo}</dd>
                <dt>Serie</dt>
                <dd>{ficha.serie}</dd>
                <dt>Órdenes en la consulta</dt>
                <dd>{ordenesFicha.length}</dd>
                <dt>Costo acumulado</dt>
                <dd>
                  {MONEDA.format(ordenesFicha.reduce((total, orden) => total + orden.total, 0))}
                </dd>
              </dl>
              {fichasUnicas.length > 1 && (
                <button
                  type="button"
                  className="secundario"
                  style={{ marginTop: '16px' }}
                  onClick={() => setIndiceFicha((actual) => (actual + 1) % fichasUnicas.length)}
                >
                  Cambiar {modo} ({(indiceFicha % fichasUnicas.length) + 1} de {fichasUnicas.length}
                  )
                </button>
              )}
            </>
          ) : (
            <p>No hay coincidencias.</p>
          )}
          <small>
            {fichasUnicas.length > 1
              ? 'Usa el botón para cambiar de ficha o refina la búsqueda.'
              : 'La ficha muestra la primera coincidencia. Refina la búsqueda para una persona o serie.'}
          </small>
        </article>
        <TablaOrdenes ordenes={filtradas} tecnicos={datos.tecnicos} manejarAbrir={manejarAbrir} />
      </section>
    </>
  );
}

export default Historial;
