// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: apiService.js
// Descripción: Centraliza las solicitudes JSON y comunica errores HTTP.
// Fecha: 9 de noviembre de 2026

/* Transporte HTTP centralizado. */
/** Envía solicitudes autenticadas y convierte las respuestas JSON. */
export async function solicitar(ruta, metodo = 'GET', datos) {
  try {
    const respuesta = await fetch(`/api/${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    if (!respuesta.ok) {
      const resultado = await respuesta.json();
      throw new Error(resultado.error || 'No se pudo completar la operación.');
    }
    return await respuesta.json();
  } catch (error) {
    throw new Error(error.message || 'No hay conexión con el servidor.');
  }
}
