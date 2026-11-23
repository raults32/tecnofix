/** Lanza un error de negocio con mensaje legible. */
export function exigir(condicion, mensaje) {
  if (!condicion) {
    throw new Error(mensaje);
  }
}

/** Verifica los campos requeridos y limita la captura. */
export function requerir(datos, campos) {
  for (const campo of campos) {
    exigir(
      typeof datos[campo] === 'string' &&
        datos[campo].replace(/\p{Cf}/gu, '').trim().length > 0 &&
        datos[campo].length <= 1000,
      `Campo obligatorio o inválido: ${campo}.`,
    );
    datos[campo] = datos[campo].trim();
  }
}
