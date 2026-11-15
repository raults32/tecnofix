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
  const filtradas = datos.ordenes.filter((orden) =>
    (modo === 'cliente' ? `${orden.cliente} ${orden.telefono}` : `${orden.serie} ${orden.equipo}`)
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );
  const ficha = filtradas[0];
  return (
    <>
      <div className="herramientas">
        <div className="pestanas">
          {['cliente', 'equipo'].map((nombre) => (
            <button
              key={nombre}
              className={modo === nombre ? 'activo' : 'secundario'}
              onClick={() => setModo(nombre)}
            >
              Por {nombre}
            </button>
          ))}
        </div>
        <input
          aria-label="Buscar historial"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre, teléfono o número de serie…"
        />
      </div>
      <section className="ficha-tabla">
        <article>
          <h2>Ficha del {modo}</h2>
          {ficha ? (
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
              <dd>{filtradas.length}</dd>
              <dt>Costo acumulado</dt>
              <dd>{MONEDA.format(filtradas.reduce((total, orden) => total + orden.total, 0))}</dd>
            </dl>
          ) : (
            <p>No hay coincidencias.</p>
          )}
          <small>
            La ficha muestra la primera coincidencia. Refina la búsqueda para una persona o serie.
          </small>
        </article>
        <TablaOrdenes ordenes={filtradas} tecnicos={datos.tecnicos} manejarAbrir={manejarAbrir} />
      </section>
    </>
  );
}

export default Historial;
