// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: TablaOrdenes.jsx
// Descripción: Pantallas funcionales basadas en los prototipos TecnoFix.
// Fecha: 9 de noviembre de 2026

/* Importaciones de presentación. */
import React from 'react';
import { obtenerEstado } from '../utils/vistaUtils.js';

/** Lista órdenes reales y permite abrir su detalle, con estado vacío explícito. */
function TablaOrdenes({ ordenes, manejarAbrir, tecnicos }) {
  return (
    <div className="tabla-contenedor">
      <table>
        <thead>
          <tr>
            <th>Folio</th>
            <th>Cliente / Equipo</th>
            <th>Falla reportada</th>
            <th>Técnico</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {ordenes.map((orden) => (
            <tr key={orden.id}>
              <td>
                <strong>{orden.folio}</strong>
              </td>
              <td>
                {orden.cliente}
                <small>{orden.equipo}</small>
              </td>
              <td>{orden.falla}</td>
              <td>
                {tecnicos.find((tecnico) => tecnico.id === orden.idTecnico)?.nombre ||
                  'Sin asignar'}
              </td>
              <td>
                <span className={`estado estado-${orden.estado}`}>{obtenerEstado(orden)}</span>
              </td>
              <td>
                <button className="secundario" onClick={() => manejarAbrir(orden.id)}>
                  Ver orden
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!ordenes.length && <p className="vacio">No hay órdenes para esta consulta.</p>}
    </div>
  );
}

export default TablaOrdenes;
