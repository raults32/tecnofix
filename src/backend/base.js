import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { derivarContrasena } from './sesion.js';

const DIRECTORIO = process.env.DATA_DIR || './data';

export function leerBase() {
  return JSON.parse(readFileSync(`${DIRECTORIO}/base.json`, 'utf8'));
}

/** Guarda un estado completo mediante reemplazo atómico. */
export function guardar(base) {
  writeFileSync(`${DIRECTORIO}/base.tmp`, JSON.stringify(base, null, 2));
  renameSync(`${DIRECTORIO}/base.tmp`, `${DIRECTORIO}/base.json`);
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
