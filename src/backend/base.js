import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fechaDelTaller } from '../utils/fechas.js';
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

function fechaDemostracion(diaObjetivo, hora = '18:00:00Z') {
  const hoy = fechaDelTaller();
  const diaMaximo = Number(hoy.slice(8, 10));
  const dia = String(Math.min(diaObjetivo, diaMaximo)).padStart(2, '0');
  return `${hoy.slice(0, 7)}-${dia}T${hora}`;
}

function crearDatosIniciales(usuarios) {
  if (process.env.DATA_DIR) {
    return { clientes: [], equipos: [], ordenes: [], usuarios };
  }
  const tecnico = usuarios.find((cuenta) => cuenta.rol === 'tecnico');
  const clientes = [
    {
      id: randomUUID(),
      nombre: 'Laura Méndez',
      telefono: '6641234567',
      correo: 'laura.mendez@example.com',
    },
    {
      id: randomUUID(),
      nombre: 'Carlos Ruiz',
      telefono: '6647654321',
      correo: 'carlos.ruiz@example.com',
    },
    {
      id: randomUUID(),
      nombre: 'Sofía Navarro',
      telefono: '6645550199',
      correo: 'sofia.navarro@example.com',
    },
    {
      id: randomUUID(),
      nombre: 'Diego Morales',
      telefono: '6645550142',
      correo: 'diego.morales@example.com',
    },
    {
      id: randomUUID(),
      nombre: 'Valeria Castro',
      telefono: '6645550188',
      correo: 'valeria.castro@example.com',
    },
  ];
  const equipos = [
    {
      id: randomUUID(),
      idCliente: clientes[0].id,
      marca: 'Lenovo',
      modelo: 'ThinkPad T14',
      serie: 'SN-LNV-1001',
      especificaciones: 'Intel Core i5 · 16 GB RAM · 512 GB SSD',
    },
    {
      id: randomUUID(),
      idCliente: clientes[1].id,
      marca: 'HP',
      modelo: 'Pavilion 15',
      serie: 'SN-HPP-2002',
      especificaciones: 'AMD Ryzen 5 · 8 GB RAM · 256 GB SSD',
    },
    {
      id: randomUUID(),
      idCliente: clientes[2].id,
      marca: 'Dell',
      modelo: 'Latitude 5430',
      serie: 'SN-DLL-3003',
      especificaciones: 'Intel Core i7 · 16 GB RAM · 512 GB SSD',
    },
    {
      id: randomUUID(),
      idCliente: clientes[3].id,
      marca: 'Asus',
      modelo: 'VivoBook 16',
      serie: 'SN-ASU-4004',
      especificaciones: 'AMD Ryzen 7 · 16 GB RAM · 1 TB SSD',
    },
    {
      id: randomUUID(),
      idCliente: clientes[4].id,
      marca: 'Apple',
      modelo: 'MacBook Air M2',
      serie: 'SN-APL-5005',
      especificaciones: 'Chip M2 · 8 GB RAM · 256 GB SSD',
    },
    {
      id: randomUUID(),
      idCliente: clientes[0].id,
      marca: 'Acer',
      modelo: 'Aspire 5',
      serie: 'SN-ACR-6006',
      especificaciones: 'Intel Core i5 · 12 GB RAM · 512 GB SSD',
    },
  ];

  const f1 = fechaDemostracion(3, '17:30:00Z');
  const f1Listo = fechaDemostracion(4, '21:15:00Z');
  const f2 = fechaDemostracion(10, '18:00:00Z');
  const f2Listo = fechaDemostracion(11, '22:00:00Z');
  const f3 = fechaDemostracion(17, '16:45:00Z');
  const f4 = fechaDemostracion(23, '19:10:00Z');
  const f5 = new Date(Date.now() - 7200000).toISOString();
  const f6 = new Date(Date.now() - 1800000).toISOString();

  const ordenes = [
    {
      id: randomUUID(),
      idCliente: clientes[0].id,
      idEquipo: equipos[5].id,
      falla: 'El teclado no responde en varias teclas y el touchpad falla de forma intermitente.',
      estadoFisico: 'Carcasa limpia, sin golpes en esquinas',
      accesorios: 'Cargador original',
      folio: 'OS-2026-00006',
      estado: 'RECIBIDO',
      fecha: f6,
      total: 0,
      historial: [{ tipo: 'recepcion', fecha: f6, usuario: 'recepcion', rol: 'recepcion' }],
    },
    {
      id: randomUUID(),
      idCliente: clientes[1].id,
      idEquipo: equipos[1].id,
      idTecnico: tecnico.id,
      falla: 'Se apaga por sobrecalentamiento al abrir programas pesados.',
      estadoFisico: 'Carcasa en buen estado, rayones leves en tapa',
      accesorios: 'Cargador original',
      folio: 'OS-2026-00005',
      estado: 'EN_DIAGNOSTICO',
      fecha: f5,
      total: 0,
      historial: [
        { tipo: 'recepcion', fecha: f5, usuario: 'recepcion', rol: 'recepcion' },
        {
          tipo: 'asignar',
          fecha: f5,
          usuario: 'administrador',
          rol: 'administrador',
          tecnico: tecnico.nombre,
        },
        {
          tipo: 'estado',
          fecha: f5,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          estado: 'EN_DIAGNOSTICO',
        },
      ],
    },
    {
      id: randomUUID(),
      idCliente: clientes[4].id,
      idEquipo: equipos[4].id,
      idTecnico: tecnico.id,
      falla: 'La batería dura menos de 20 minutos y muestra aviso de servicio.',
      estadoFisico: 'Sin rayones, pantalla intacta',
      accesorios: 'Cable USB-C y adaptador',
      folio: 'OS-2026-00004',
      estado: 'EN_DIAGNOSTICO',
      fecha: f4,
      diagnostico: 'Batería degradada al 52% de capacidad. Se recomienda reemplazo completo.',
      pruebas: {
        'Fuente / cargador': 'OK',
        Batería: 'Falla',
        'Memoria RAM': 'OK',
        'Disco (SSD/HDD)': 'OK',
        Temperatura: 'OK',
        Pantalla: 'OK',
      },
      esDiagnosticoConcluido: true,
      piezas: [
        {
          nombre: 'Batería original A2681',
          cantidad: 1,
          costo: 1450,
          disponibilidad: 'Por pedir',
        },
      ],
      manoObra: 500,
      costoRefacciones: 1450,
      refacciones: '1 x Batería original A2681',
      total: 1950,
      fechaCotizacion: f4,
      esCotizacionEnviada: true,
      decision: 'pendiente',
      tieneAutorizacion: false,
      historial: [
        { tipo: 'recepcion', fecha: f4, usuario: 'recepcion', rol: 'recepcion' },
        {
          tipo: 'asignar',
          fecha: f4,
          usuario: 'administrador',
          rol: 'administrador',
          tecnico: tecnico.nombre,
        },
        {
          tipo: 'diagnostico',
          fecha: f4,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          detalle: 'Batería degradada al 52% de capacidad. Se recomienda reemplazo completo.',
        },
        {
          tipo: 'piezas',
          fecha: f4,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          partidas: 1,
          total: 1950,
        },
        { tipo: 'enviarCotizacion', fecha: f4, usuario: tecnico.nombre, rol: 'tecnico' },
      ],
    },
    {
      id: randomUUID(),
      idCliente: clientes[3].id,
      idEquipo: equipos[3].id,
      idTecnico: tecnico.id,
      falla: 'Pantalla parpadea al mover la bisagra y pierde imagen.',
      estadoFisico: 'Bisagra derecha floja',
      accesorios: 'Cargador y mouse inalámbrico',
      folio: 'OS-2026-00003',
      estado: 'EN_REPARACION',
      fecha: f3,
      diagnostico: 'Flex de video dañado por tensión en bisagra derecha. Requiere cambio de flex.',
      pruebas: {
        'Fuente / cargador': 'OK',
        Batería: 'OK',
        'Memoria RAM': 'OK',
        'Disco (SSD/HDD)': 'OK',
        Temperatura: 'OK',
        Pantalla: 'Falla',
      },
      esDiagnosticoConcluido: true,
      piezas: [
        {
          nombre: 'Cable flex eDP 30 pines',
          cantidad: 1,
          costo: 420,
          disponibilidad: 'En stock',
        },
      ],
      manoObra: 580,
      costoRefacciones: 420,
      refacciones: '1 x Cable flex eDP 30 pines',
      total: 1000,
      fechaCotizacion: f3,
      esCotizacionEnviada: true,
      decision: 'aprobada',
      medioAutorizacion: 'Teléfono',
      tieneAutorizacion: true,
      historial: [
        { tipo: 'recepcion', fecha: f3, usuario: 'recepcion', rol: 'recepcion' },
        {
          tipo: 'asignar',
          fecha: f3,
          usuario: 'administrador',
          rol: 'administrador',
          tecnico: tecnico.nombre,
        },
        {
          tipo: 'diagnostico',
          fecha: f3,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          detalle: 'Flex de video dañado por tensión en bisagra derecha. Requiere cambio de flex.',
        },
        {
          tipo: 'piezas',
          fecha: f3,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          partidas: 1,
          total: 1000,
        },
        {
          tipo: 'autorizar',
          fecha: f3,
          usuario: 'recepcion',
          rol: 'recepcion',
          decision: 'aprobada',
          medio: 'Teléfono',
          detalle: 'Cliente autoriza reparación por llamada.',
        },
        {
          tipo: 'estado',
          fecha: f3,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          estado: 'EN_REPARACION',
        },
      ],
    },
    {
      id: randomUUID(),
      idCliente: clientes[2].id,
      idEquipo: equipos[2].id,
      idTecnico: tecnico.id,
      falla: 'No inicia el sistema operativo y marca error de disco.',
      estadoFisico: 'Sin golpes visibles',
      accesorios: 'Cargador y funda',
      folio: 'OS-2026-00002',
      estado: 'LISTO',
      fecha: f2,
      fechaListo: f2Listo,
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
      fechaCotizacion: f2,
      esCotizacionEnviada: true,
      decision: 'aprobada',
      medioAutorizacion: 'WhatsApp',
      tieneAutorizacion: true,
      reparacion: 'Se instaló SSD NVMe de 512 GB y se restauró el sistema operativo.',
      pruebasFinales: 'Arranque, lectura/escritura de disco y temperatura estables.',
      minutosTrabajo: 45,
      historial: [
        { tipo: 'recepcion', fecha: f2, usuario: 'recepcion', rol: 'recepcion' },
        {
          tipo: 'asignar',
          fecha: f2,
          usuario: 'administrador',
          rol: 'administrador',
          tecnico: tecnico.nombre,
        },
        {
          tipo: 'diagnostico',
          fecha: f2,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          detalle: 'Unidad SSD dañada con sectores ilegibles. Requiere reemplazo e instalación.',
        },
        {
          tipo: 'piezas',
          fecha: f2,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          partidas: 1,
          total: 1400,
        },
        {
          tipo: 'autorizar',
          fecha: f2,
          usuario: 'recepcion',
          rol: 'recepcion',
          decision: 'aprobada',
          medio: 'WhatsApp',
          detalle: 'Cliente aprueba cotización.',
        },
        {
          tipo: 'reparacion',
          fecha: f2Listo,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          detalle: 'Se instaló SSD NVMe de 512 GB y se restauró el sistema operativo.',
        },
        {
          tipo: 'estado',
          fecha: f2Listo,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          estado: 'LISTO',
        },
      ],
    },
    {
      id: randomUUID(),
      idCliente: clientes[0].id,
      idEquipo: equipos[0].id,
      idTecnico: tecnico.id,
      falla: 'Equipo lento al abrir múltiples pestañas y ventilador ruidoso.',
      estadoFisico: 'Buen estado general',
      accesorios: 'Cargador original',
      folio: 'OS-2026-00001',
      estado: 'ENTREGADO',
      fecha: f1,
      fechaListo: f1Listo,
      diagnostico: 'Memoria RAM insuficiente para carga actual y pasta térmica seca.',
      pruebas: {
        'Fuente / cargador': 'OK',
        Batería: 'OK',
        'Memoria RAM': 'OK',
        'Disco (SSD/HDD)': 'OK',
        Temperatura: 'Falla',
        Pantalla: 'OK',
      },
      esDiagnosticoConcluido: true,
      piezas: [
        {
          nombre: 'Módulo RAM DDR4 8 GB',
          cantidad: 1,
          costo: 620,
          disponibilidad: 'En stock',
        },
      ],
      manoObra: 380,
      costoRefacciones: 620,
      refacciones: '1 x Módulo RAM DDR4 8 GB',
      total: 1000,
      fechaCotizacion: f1,
      esCotizacionEnviada: true,
      decision: 'aprobada',
      medioAutorizacion: 'Presencial',
      tieneAutorizacion: true,
      reparacion: 'Ampliación de memoria RAM, limpieza interna y cambio de pasta térmica.',
      pruebasFinales: 'Prueba de estrés de 20 minutos con temperatura máxima de 68 °C.',
      minutosTrabajo: 50,
      pagos: [
        {
          monto: 1000,
          metodo: 'Tarjeta',
          idOperacion: '0123456789abcdef0123456789abcdef',
          fecha: f1Listo,
          usuario: 'recepcion',
        },
      ],
      historial: [
        { tipo: 'recepcion', fecha: f1, usuario: 'recepcion', rol: 'recepcion' },
        {
          tipo: 'asignar',
          fecha: f1,
          usuario: 'administrador',
          rol: 'administrador',
          tecnico: tecnico.nombre,
        },
        {
          tipo: 'diagnostico',
          fecha: f1,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          detalle: 'Memoria RAM insuficiente para carga actual y pasta térmica seca.',
        },
        {
          tipo: 'piezas',
          fecha: f1,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          partidas: 1,
          total: 1000,
        },
        {
          tipo: 'autorizar',
          fecha: f1,
          usuario: 'recepcion',
          rol: 'recepcion',
          decision: 'aprobada',
          medio: 'Presencial',
          detalle: 'Cliente aprueba en mostrador.',
        },
        {
          tipo: 'reparacion',
          fecha: f1Listo,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          detalle: 'Ampliación de memoria RAM, limpieza interna y cambio de pasta térmica.',
        },
        {
          tipo: 'estado',
          fecha: f1Listo,
          usuario: tecnico.nombre,
          rol: 'tecnico',
          estado: 'LISTO',
        },
        {
          tipo: 'pago',
          fecha: f1Listo,
          usuario: 'recepcion',
          rol: 'recepcion',
          monto: 1000,
          metodo: 'Tarjeta',
        },
        {
          tipo: 'estado',
          fecha: f1Listo,
          usuario: 'recepcion',
          rol: 'recepcion',
          estado: 'ENTREGADO',
          detalle: 'Devolución del equipo y accesorios confirmada.',
        },
      ],
    },
  ];

  return { clientes, equipos, ordenes, usuarios };
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
