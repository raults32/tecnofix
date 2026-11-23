// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: Recepcion.jsx
// Descripción: Distribuye las pantallas de Recepción por etapa del servicio.
// Fecha: 9 de noviembre de 2026

import React, { useState } from 'react';
import CotizacionesRecepcion from './recepcion/CotizacionesRecepcion.jsx';
import EntregasRecepcion from './recepcion/EntregasRecepcion.jsx';
import NuevaRecepcion from './recepcion/NuevaRecepcion.jsx';

/** Implementa recepción por pasos, aprobación de cotizaciones y entrega con pagos. */
export default function Recepcion(propiedades) {
  const { datos, orden, seccion, usuario, manejarOperacion, manejarAbrir } = propiedades;
  const [idSeleccion, setIdSeleccion] = useState('');

  if (seccion === 'nueva') return <NuevaRecepcion {...propiedades} />;

  const ordenesDisponibles = datos.ordenes.filter((elemento) =>
    seccion === 'cotizaciones'
      ? elemento.esDiagnosticoConcluido
      : ['LISTO', 'ENTREGADO'].includes(elemento.estado),
  );
  const actual =
    ordenesDisponibles.find((elemento) => elemento.id === idSeleccion) ||
    ordenesDisponibles.find((elemento) => elemento.id === orden?.id);

  return (
    <>
      <label className="selector-orden">
        Seleccionar orden
        <select value={actual?.id || ''} onChange={(evento) => setIdSeleccion(evento.target.value)}>
          <option value="">Seleccionar…</option>
          {ordenesDisponibles.map((elemento) => (
            <option key={elemento.id} value={elemento.id}>
              {elemento.folio} · {elemento.cliente}
            </option>
          ))}
        </select>
      </label>
      {!actual ? (
        <p className="vacio">Selecciona una orden disponible para continuar.</p>
      ) : seccion === 'cotizaciones' ? (
        <CotizacionesRecepcion actual={actual} manejarOperacion={manejarOperacion} />
      ) : (
        <EntregasRecepcion
          actual={actual}
          usuario={usuario}
          manejarOperacion={manejarOperacion}
          manejarAbrir={manejarAbrir}
        />
      )}
    </>
  );
}
