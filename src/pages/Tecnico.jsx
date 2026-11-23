// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: Tecnico.jsx
// Descripción: Distribuye las pantallas de Técnico por etapa del servicio.
// Fecha: 9 de noviembre de 2026

import React from 'react';
import CotizacionTecnico from './tecnico/CotizacionTecnico.jsx';
import DiagnosticoTecnico from './tecnico/DiagnosticoTecnico.jsx';
import PiezasTecnico from './tecnico/PiezasTecnico.jsx';
import ReparacionTecnico from './tecnico/ReparacionTecnico.jsx';

/** Separa diagnóstico, piezas, cotización y reparación según el prototipo técnico. */
export default function Tecnico(propiedades) {
  const { seccion } = propiedades;
  if (seccion === 'diagnostico') return <DiagnosticoTecnico {...propiedades} />;
  if (seccion === 'piezas') return <PiezasTecnico {...propiedades} />;
  if (seccion === 'cotizacion') return <CotizacionTecnico {...propiedades} />;
  return <ReparacionTecnico {...propiedades} />;
}
