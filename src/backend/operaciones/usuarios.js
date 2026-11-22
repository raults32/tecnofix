import { randomUUID } from 'node:crypto';
import { derivarContrasena } from '../sesion.js';
import { exigir, requerir } from '../validaciones.js';

export function listarUsuarios(base, esAdministrador) {
  exigir(esAdministrador, 'Solo Administración puede gestionar usuarios.');
  return base.usuarios.map(({ hash, ...cuenta }) => cuenta);
}

export function crearUsuario(base, datos, esAdministrador) {
  exigir(esAdministrador, 'Solo Administración puede crear usuarios.');
  requerir(datos, ['nombre', 'usuario', 'contrasena', 'rol']);
  exigir(['administrador', 'recepcion', 'tecnico'].includes(datos.rol), 'Rol inválido.');
  exigir(datos.contrasena.length >= 10, 'Contraseña demasiado corta.');
  exigir(!base.usuarios.some((cuenta) => cuenta.usuario === datos.usuario), 'Usuario duplicado.');
  base.usuarios.push({
    id: randomUUID(),
    nombre: datos.nombre,
    usuario: datos.usuario,
    rol: datos.rol,
    esActivo: true,
    hash: derivarContrasena(datos.contrasena),
  });
}

export function actualizarUsuario(base, id, datos, usuario, esAdministrador) {
  exigir(esAdministrador, 'Solo Administración puede desactivar usuarios.');
  const cuenta = base.usuarios.find((elemento) => elemento.id === id);
  exigir(cuenta && cuenta.id !== usuario.id, 'No puede desactivar su propia cuenta.');
  if (datos.nombre !== undefined) {
    requerir(datos, ['nombre', 'usuario', 'rol']);
    exigir(['administrador', 'recepcion', 'tecnico'].includes(datos.rol), 'Rol inválido.');
    exigir(
      !base.usuarios.some(
        (elemento) => elemento.id !== cuenta.id && elemento.usuario === datos.usuario,
      ),
      'Usuario duplicado.',
    );
    exigir(
      !(
        cuenta.rol === 'tecnico' &&
        datos.rol !== 'tecnico' &&
        base.ordenes.some(
          (orden) =>
            orden.idTecnico === cuenta.id &&
            !['LISTO', 'ENTREGADO', 'CANCELADO'].includes(orden.estado),
        )
      ),
      'Reasigne las órdenes activas antes de cambiar el rol técnico.',
    );
    cuenta.nombre = datos.nombre;
    cuenta.usuario = datos.usuario;
    cuenta.rol = datos.rol;
  }
  cuenta.esActivo = datos.esActivo === true || datos.esActivo === 'true';
}
