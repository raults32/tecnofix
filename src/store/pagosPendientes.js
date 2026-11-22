import { guardarEnSesion, leerEnSesion } from '../utils/almacenSesion.js';

const pendientes = new Map();
const clavePago = (usuario, ruta) => `tecnofix:pago:${usuario}:${ruta}`;

export function leerPagoPendiente(usuario, ruta) {
  const clave = clavePago(usuario, ruta);
  return pendientes.get(clave) || leerEnSesion(clave);
}

export function prepararPago(usuario, ruta, valores) {
  const monto = Number(valores.monto);
  const metodo = valores.metodo;
  const anterior = leerPagoPendiente(usuario, ruta);
  if (anterior) {
    if (anterior.monto !== monto || anterior.metodo !== metodo) {
      throw new Error('Hay un pago por confirmar. Reintenta con el mismo monto y método.');
    }
    return anterior;
  }
  if (!Number.isFinite(monto) || monto <= 0) throw new Error('Ingresa un monto válido.');
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const idOperacion = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const pago = { monto, metodo, idOperacion };
  const clave = clavePago(usuario, ruta);
  pendientes.set(clave, pago);
  guardarEnSesion(clave, pago);
  return pago;
}

export function borrarPagoPendiente(usuario, ruta) {
  const clave = clavePago(usuario, ruta);
  pendientes.delete(clave);
  guardarEnSesion(clave, null);
}
