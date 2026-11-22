// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: apiService.js
// Descripción: Centraliza las solicitudes JSON y comunica errores HTTP.
// Fecha: 9 de noviembre de 2026

/* Transporte HTTP centralizado. */
/** Envía solicitudes autenticadas y convierte las respuestas JSON. */
export async function solicitar(ruta, metodo = 'GET', datos) {
  const signal = AbortSignal.timeout(10000);
  let respuesta;
  let resultado;
  try {
    respuesta = await fetch(`/api/${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: datos ? JSON.stringify(datos) : undefined,
      signal,
    });
  } catch {
    fallarConexion(signal);
  }
  try {
    resultado = await respuesta.json();
  } catch {
    if (signal.aborted) fallarConexion(signal);
    throw new Error('El servidor dio una respuesta inesperada. Intenta de nuevo.');
  }
  if (!respuesta.ok) {
    const error = new Error(resultado?.error || 'No se pudo completar la operación.');
    error.estado = respuesta.status;
    throw error;
  }
  if (!resultado || typeof resultado !== 'object' || Array.isArray(resultado)) {
    throw new Error('El servidor dio una respuesta inesperada. Intenta de nuevo.');
  }
  return resultado;
}

function fallarConexion(signal) {
  throw new Error(
    signal.aborted
      ? 'El servidor tardó demasiado en responder. Intenta de nuevo.'
      : 'No hay conexión con el servidor. Revisa la conexión e intenta de nuevo.',
  );
}
