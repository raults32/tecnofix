// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: ordenUtils.js
// Descripción: Valida transiciones y calcula costos en centavos.
// Fecha: 9 de noviembre de 2026

/* Constantes del ciclo de servicio. */
export const ESTADOS_ORDEN = [
  'RECIBIDO',
  'EN_DIAGNOSTICO',
  'EN_REPARACION',
  'LISTO',
  'ENTREGADO',
  'CANCELADO',
];

/* Reglas de negocio independientes de la interfaz. */
/** Valida el avance y sus requisitos antes de modificar una orden. */
export function validarTransicion(orden, nuevoEstado, rol) {
  const transiciones = {
    RECIBIDO: ['EN_DIAGNOSTICO', 'CANCELADO'],
    EN_DIAGNOSTICO: ['EN_REPARACION', 'CANCELADO'],
    EN_REPARACION: ['LISTO'],
    LISTO: ['ENTREGADO'],
    ENTREGADO: [],
    CANCELADO: [],
  };
  if (!transiciones[orden.estado]?.includes(nuevoEstado)) {
    throw new Error('Transición de estado no permitida.');
  }
  if (rol === 'recepcion' && nuevoEstado !== 'ENTREGADO') {
    throw new Error('Recepción solo puede registrar la entrega.');
  }
  if (nuevoEstado === 'ENTREGADO' && rol === 'tecnico') {
    throw new Error('La entrega corresponde a Recepción.');
  }
  if (nuevoEstado === 'CANCELADO' && rol !== 'administrador') {
    throw new Error('Solo Administración puede cancelar.');
  }
  if (nuevoEstado === 'EN_DIAGNOSTICO' && !orden.idTecnico) {
    throw new Error('Asigne un técnico activo primero.');
  }
  if (
    nuevoEstado === 'EN_REPARACION' &&
    (!orden.esDiagnosticoConcluido || !orden.tieneAutorizacion)
  ) {
    throw new Error('Se requiere diagnóstico concluido y autorización del cliente.');
  }
  if (nuevoEstado === 'LISTO' && !orden.reparacion) {
    throw new Error('Registre la reparación y sus costos antes de finalizar.');
  }
}

/** Calcula importes finitos y no negativos en centavos para evitar errores decimales. */
export function calcularCosto(manoObra, refacciones) {
  const importes = [Number(manoObra), Number(refacciones)];
  if (importes.some((importe) => !Number.isFinite(importe) || importe < 0)) {
    throw new Error('Los costos deben ser números no negativos.');
  }
  return importes.reduce((total, importe) => total + Math.round(importe * 100), 0) / 100;
}
