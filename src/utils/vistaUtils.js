// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: vistaUtils.js
// Descripción: Pantallas funcionales basadas en los prototipos TecnoFix.
// Fecha: 9 de noviembre de 2026

/* Presentación común del dominio. */
export const MONEDA = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
export const ESTADOS_TEXTO = {
  RECIBIDO: 'Recibido',
  EN_DIAGNOSTICO: 'En diagnóstico',
  EN_REPARACION: 'En reparación',
  LISTO: 'Listo',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};
/** Obtiene una etiqueta de seguimiento sin alterar los estados persistentes originales. */
export function obtenerEstado(orden) {
  if (orden.estado === 'EN_DIAGNOSTICO' && orden.esCotizacionEnviada && !orden.tieneAutorizacion) {
    return orden.decision === 'rechazada' ? 'Cotización rechazada' : 'Esperando aprobación';
  }
  return ESTADOS_TEXTO[orden.estado];
}
/** Normaliza la captura de formularios sin duplicar estado de edición. */
export function capturarFormulario(evento) {
  evento.preventDefault();
  return Object.fromEntries(new FormData(evento.currentTarget));
}
