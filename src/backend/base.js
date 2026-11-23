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

function crearDatosIniciales(usuarios) {
  if (process.env.DATA_DIR) {
    return { clientes: [], equipos: [], ordenes: [], usuarios };
  }
  const tecnico = usuarios.find((cuenta) => cuenta.rol === 'tecnico');
  const idCliente1 = randomUUID();
  const idCliente2 = randomUUID();
  const idEquipo1 = randomUUID();
  const idEquipo2 = randomUUID();
  const haceDosHoras = new Date(Date.now() - 7200000).toISOString();
  const haceUnaHora = new Date(Date.now() - 3600000).toISOString();
  return {
    clientes: [
      {
        id: idCliente1,
        nombre: 'Laura Méndez',
        telefono: '6641234567',
        correo: 'laura.mendez@example.com',
      },
      {
        id: idCliente2,
        nombre: 'Carlos Ruiz',
        telefono: '6647654321',
        correo: 'carlos.ruiz@example.com',
      },
    ],
    equipos: [
      {
        id: idEquipo1,
        idCliente: idCliente1,
        marca: 'Lenovo',
        modelo: 'ThinkPad T14',
        serie: 'SN-LNV-1001',
        especificaciones: 'Intel Core i5 · 16 GB RAM · 512 GB SSD',
      },
      {
        id: idEquipo2,
        idCliente: idCliente2,
        marca: 'HP',
        modelo: 'Pavilion 15',
        serie: 'SN-HPP-2002',
        especificaciones: 'AMD Ryzen 5 · 8 GB RAM · 256 GB SSD',
      },
    ],
    ordenes: [
      {
        id: randomUUID(),
        idCliente: idCliente2,
        idEquipo: idEquipo2,
        idTecnico: tecnico.id,
        falla: 'Se apaga por sobrecalentamiento al abrir programas pesados.',
        estadoFisico: 'Carcasa en buen estado, rayones leves en tapa',
        accesorios: 'Cargador original',
        folio: 'OS-2026-00002',
        estado: 'EN_DIAGNOSTICO',
        fecha: haceUnaHora,
        total: 0,
        historial: [
          { tipo: 'recepcion', fecha: haceUnaHora, usuario: 'recepcion', rol: 'recepcion' },
          {
            tipo: 'asignar',
            fecha: haceUnaHora,
            usuario: 'administrador',
            rol: 'administrador',
            tecnico: tecnico.nombre,
          },
          {
            tipo: 'estado',
            fecha: haceUnaHora,
            usuario: tecnico.nombre,
            rol: 'tecnico',
            estado: 'EN_DIAGNOSTICO',
          },
        ],
      },
      {
        id: randomUUID(),
        idCliente: idCliente1,
        idEquipo: idEquipo1,
        idTecnico: tecnico.id,
        falla: 'No inicia el sistema operativo y marca error de disco.',
        estadoFisico: 'Sin golpes visibles',
        accesorios: 'Cargador y funda',
        folio: 'OS-2026-00001',
        estado: 'LISTO',
        fecha: haceDosHoras,
        fechaListo: haceUnaHora,
        diagnostico: 'Unidad SSD dañada con sectores ilegibles. Requiere reemplazo e instalación.',
        pruebas: {
          'Fuente / cargador': 'OK',
          Batería: 'OK',
          'Memoria RAM': 'OK',
          'Disco (SSD/HDD)': 'Falla',
          Temperatura: 'OK',
          Pantalla: 'OK',
        },
        esDiagnosticoConcluido: true,
        piezas: [
          {
            nombre: 'SSD NVMe 512 GB',
            cantidad: 1,
            costo: 950,
            disponibilidad: 'En stock',
          },
        ],
        manoObra: 450,
        costoRefacciones: 950,
        refacciones: '1 x SSD NVMe 512 GB',
        total: 1400,
        fechaCotizacion: haceDosHoras,
        esCotizacionEnviada: true,
        decision: 'aprobada',
        medioAutorizacion: 'WhatsApp',
        tieneAutorizacion: true,
        reparacion: 'Se instaló SSD NVMe de 512 GB y se restauró el sistema operativo.',
        pruebasFinales: 'Arranque, lectura/escritura de disco y temperatura estables.',
        minutosTrabajo: 45,
        historial: [
          { tipo: 'recepcion', fecha: haceDosHoras, usuario: 'recepcion', rol: 'recepcion' },
          {
            tipo: 'asignar',
            fecha: haceDosHoras,
            usuario: 'administrador',
            rol: 'administrador',
            tecnico: tecnico.nombre,
          },
          {
            tipo: 'diagnostico',
            fecha: haceDosHoras,
            usuario: tecnico.nombre,
            rol: 'tecnico',
            detalle: 'Unidad SSD dañada con sectores ilegibles. Requiere reemplazo e instalación.',
          },
          {
            tipo: 'piezas',
            fecha: haceDosHoras,
            usuario: tecnico.nombre,
            rol: 'tecnico',
            partidas: 1,
            total: 1400,
          },
          {
            tipo: 'autorizar',
            fecha: haceDosHoras,
            usuario: 'recepcion',
            rol: 'recepcion',
            decision: 'aprobada',
            medio: 'WhatsApp',
            detalle: 'Cliente aprueba cotización.',
          },
          {
            tipo: 'reparacion',
            fecha: haceUnaHora,
            usuario: tecnico.nombre,
            rol: 'tecnico',
            detalle: 'Se instaló SSD NVMe de 512 GB y se restauró el sistema operativo.',
          },
          {
            tipo: 'estado',
            fecha: haceUnaHora,
            usuario: tecnico.nombre,
            rol: 'tecnico',
            estado: 'LISTO',
          },
        ],
      },
    ],
    usuarios,
  };
}

export function inicializarBase() {
  mkdirSync(DIRECTORIO, { recursive: true });
  if (!existsSync(`${DIRECTORIO}/base.json`)) {
    const usuarios = ['administrador', 'recepcion', 'tecnico'].map((rol) => ({
      id: randomUUID(),
      nombre: rol,
      usuario: rol,
      rol,
      esActivo: true,
      hash: derivarContrasena('Taller2026!'),
    }));
    guardar(crearDatosIniciales(usuarios));
  }
}
