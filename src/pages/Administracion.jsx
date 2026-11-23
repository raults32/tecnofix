// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: Administracion.jsx
// Descripción: Distribuye las pantallas de Administración por responsabilidad.
// Fecha: 9 de noviembre de 2026

import React from 'react';
import AsignarTecnico from './administracion/AsignarTecnico.jsx';
import DashboardAdmin from './administracion/DashboardAdmin.jsx';
import ReportesAdmin from './administracion/ReportesAdmin.jsx';
import UsuariosAdmin from './administracion/UsuariosAdmin.jsx';

/** Enruta a la subpantalla administrativa correspondiente según la sección activa. */
export default function Administracion(propiedades) {
  const { seccion } = propiedades;
  if (seccion === 'inicio') return <DashboardAdmin {...propiedades} />;
  if (seccion === 'asignar') return <AsignarTecnico {...propiedades} />;
  if (seccion === 'usuarios') return <UsuariosAdmin {...propiedades} />;
  return <ReportesAdmin {...propiedades} />;
}
