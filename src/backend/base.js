import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { derivarContrasena } from './sesion.js';

const DIRECTORIO = process.env.DATA_DIR || './data';

export function leerBase() {
  try {
    const base = JSON.parse(readFileSync(`${DIRECTORIO}/base.json`, 'utf8'));
    if (
      !['clientes', 'equipos', 'ordenes', 'usuarios'].every((campo) => Array.isArray(base?.[campo]))
    ) {
      throw new Error('Estructura de datos inválida.');
    }
    return base;
  } catch {
    throw Object.assign(new Error('No se pudieron leer los datos del taller.'), { estado: 500 });
  }
}

/** Guarda un estado completo mediante reemplazo atómico. */
export function guardar(base) {
  try {
    writeFileSync(`${DIRECTORIO}/base.tmp`, JSON.stringify(base, null, 2));
    renameSync(`${DIRECTORIO}/base.tmp`, `${DIRECTORIO}/base.json`);
  } catch {
    throw Object.assign(new Error('No se pudieron guardar los datos del taller.'), { estado: 500 });
  }
}

export function inicializarBase() {
  mkdirSync(DIRECTORIO, { recursive: true });
  if (!existsSync(`${DIRECTORIO}/base.json`)) {
    guardar({
      clientes: [],
      equipos: [],
      ordenes: [],
      usuarios: ['administrador', 'recepcion', 'tecnico'].map((rol) => ({
        id: randomUUID(),
        nombre: rol,
        usuario: rol,
        rol,
        esActivo: true,
        hash: derivarContrasena('Taller2026!'),
      })),
    });
  }
}
