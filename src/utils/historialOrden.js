import { ROLES } from '../config/navegacion.js';
import { ZONA_TALLER } from './fechas.js';
import { MONEDA } from './vistaUtils.js';

const ACCIONES = {
  recepcion: 'Equipo recibido',
  asignar: 'Técnico asignado',
  reasignar: 'Técnico reasignado',
  estado: 'Estado actualizado',
  piezas: 'Cotización actualizada',
  enviarCotizacion: 'Cotización enviada a Recepción',
  pago: 'Pago registrado',
  autorizar: 'Decisión del cliente registrada',
  diagnostico: 'Diagnóstico registrado',
  reparacion: 'Reparación registrada',
};

const CAMBIOS_ESTADO = {
  RECIBIDO: 'Equipo recibido',
  EN_DIAGNOSTICO: 'Diagnóstico iniciado',
  EN_REPARACION: 'Reparación iniciada',
  LISTO: 'Equipo listo para entrega',
  ENTREGADO: 'Equipo entregado',
  CANCELADO: 'Orden cancelada',
};

const DECISIONES = {
  aprobada: 'Cotización aprobada por el cliente',
  rechazada: 'Cotización rechazada por el cliente',
  pendiente: 'Decisión del cliente pendiente',
};

const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  timeZone: ZONA_TALLER,
  dateStyle: 'medium',
  timeStyle: 'medium',
});

function textoLimpio(valor) {
  if (typeof valor !== 'string') return '';
  return valor
    .replace(/[\u200B\u2060]/g, '')
    .split(/\r\n?|\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea.replace(/\p{Cf}/gu, '').trim())
    .join('\n');
}

function leerCambio(cambio) {
  const detalle = textoLimpio(cambio.detalle);
  if (Object.hasOwn(ACCIONES, cambio.tipo)) return { ...cambio, detalle };
  if (detalle === 'Recepción del equipo') return { ...cambio, tipo: 'recepcion', detalle: '' };

  // Las órdenes anteriores guardaban acciones como "estado: LISTO" o "pago:".
  const [, tipo, nota] = /^([a-z]+)\s*:\s*([\s\S]*)$/i.exec(detalle) || [];
  if (!Object.hasOwn(ACCIONES, tipo)) return { ...cambio, tipo: '', detalle };
  if (tipo === 'estado') {
    const [, estado, razon] = /^(\S+)\s*([\s\S]*)$/.exec(nota) || [];
    if (Object.hasOwn(CAMBIOS_ESTADO, estado)) {
      return { ...cambio, tipo, estado, detalle: textoLimpio(razon) };
    }
  }
  return { ...cambio, tipo, detalle: textoLimpio(nota) };
}

function datosAdicionales(cambio, pagos) {
  if (cambio.tipo === 'pago') {
    const coincidencias =
      cambio.monto === undefined && cambio.fecha && cambio.usuario
        ? pagos.filter((pago) => pago?.fecha === cambio.fecha && pago?.usuario === cambio.usuario)
        : [];
    const pago = coincidencias.length === 1 ? coincidencias[0] : cambio;
    return [
      Number.isFinite(pago.monto) && pago.monto >= 0 ? MONEDA.format(pago.monto) : '',
      textoLimpio(pago.metodo),
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (['asignar', 'reasignar'].includes(cambio.tipo)) return textoLimpio(cambio.tecnico);
  if (cambio.tipo === 'autorizar') return textoLimpio(cambio.medio);
  if (cambio.tipo === 'piezas') {
    const partidas = cambio.partidas;
    return [
      Number.isSafeInteger(partidas) && partidas >= 0
        ? partidas === 1
          ? '1 partida'
          : `${partidas} partidas`
        : '',
      Number.isFinite(cambio.total) && cambio.total >= 0 ? MONEDA.format(cambio.total) : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }
  return '';
}

export function formatearHistorialOrden(orden) {
  const historial = Array.isArray(orden.historial) ? orden.historial : [];
  const pagos = Array.isArray(orden.pagos) ? orden.pagos : [];
  return historial
    .filter((cambio) => cambio && typeof cambio === 'object' && !Array.isArray(cambio))
    .map((entrada) => {
      const cambio = leerCambio(entrada);
      const fecha = typeof cambio.fecha === 'string' ? new Date(cambio.fecha) : null;
      const fechaValida = fecha && Number.isFinite(fecha.getTime());
      const nombre = textoLimpio(cambio.usuario);
      const usuario = Object.hasOwn(ROLES, nombre) ? ROLES[nombre] : nombre;
      const rol = Object.hasOwn(ROLES, cambio.rol) ? ROLES[cambio.rol] : '';
      let titulo = ACCIONES[cambio.tipo] || 'Movimiento registrado';
      if (cambio.tipo === 'estado' && Object.hasOwn(CAMBIOS_ESTADO, cambio.estado)) {
        titulo = CAMBIOS_ESTADO[cambio.estado];
      }
      if (cambio.tipo === 'autorizar' && Object.hasOwn(DECISIONES, cambio.decision)) {
        titulo = DECISIONES[cambio.decision];
      }
      return {
        titulo,
        fecha: fechaValida ? formatoFecha.format(fecha) : 'Fecha no disponible',
        fechaIso: fechaValida ? fecha.toISOString() : '',
        usuario: usuario || 'Usuario sin identificar',
        rol: rol === usuario ? '' : rol,
        resumen: datosAdicionales(cambio, pagos),
        detalle: cambio.detalle,
      };
    });
}
