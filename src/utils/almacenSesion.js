export function leerEnSesion(clave) {
  try {
    return JSON.parse(globalThis.sessionStorage?.getItem(clave) || 'null');
  } catch {
    return null;
  }
}

export function guardarEnSesion(clave, datos) {
  try {
    if (datos === null) globalThis.sessionStorage?.removeItem(clave);
    else globalThis.sessionStorage?.setItem(clave, JSON.stringify(datos));
  } catch {
    // El formulario sigue funcionando si el navegador bloquea el almacenamiento.
  }
}

export function borrarBorradores(usuario) {
  const prefijo = `tecnofix:borrador:${usuario}:`;
  try {
    for (const clave of Object.keys(globalThis.sessionStorage || {})) {
      if (clave.startsWith(prefijo)) globalThis.sessionStorage.removeItem(clave);
    }
  } catch {
    // Puede no haber almacenamiento disponible.
  }
}
