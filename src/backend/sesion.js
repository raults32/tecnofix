import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { exigir, requerir } from './validaciones.js';

const SESIONES = new Map();
const INTENTOS = new Map();

/** Deriva una contraseña con sal aleatoria mediante scrypt. */
export function derivarContrasena(contrasena, sal = randomBytes(16).toString('hex')) {
  return `${sal}:${scryptSync(contrasena, sal, 64).toString('hex')}`;
}

export function obtenerUsuario(base, token) {
  const sesion = SESIONES.get(token);
  return (
    sesion &&
    sesion.expira > Date.now() &&
    base.usuarios.find((cuenta) => cuenta.id === sesion.id && cuenta.esActivo)
  );
}

export function iniciarSesion(usuarios, datos) {
  requerir(datos, ['usuario', 'contrasena']);
  const intento = INTENTOS.get(datos.usuario) || { cantidad: 0, hasta: 0 };
  exigir(intento.hasta < Date.now(), 'Cuenta bloqueada por 15 minutos.');
  const cuenta = usuarios.find((elemento) => elemento.usuario === datos.usuario);
  const sal = cuenta?.hash.split(':')[0] || 'sin-cuenta';
  const hash = derivarContrasena(datos.contrasena, sal).split(':')[1];
  if (
    !cuenta?.esActivo ||
    !timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(cuenta.hash.split(':')[1], 'hex'))
  ) {
    intento.cantidad += 1;
    if (intento.cantidad >= 3) {
      intento.hasta = Date.now() + 900000;
      intento.cantidad = 0;
    }
    INTENTOS.set(datos.usuario, intento);
    throw new Error('Credenciales incorrectas.');
  }
  INTENTOS.delete(datos.usuario);
  const nuevoToken = randomBytes(32).toString('hex');
  SESIONES.set(nuevoToken, { id: cuenta.id, expira: Date.now() + 28800000 });
  return { token: nuevoToken, usuario: { id: cuenta.id, nombre: cuenta.nombre, rol: cuenta.rol } };
}

export function cerrarSesion(token) {
  SESIONES.delete(token);
}
