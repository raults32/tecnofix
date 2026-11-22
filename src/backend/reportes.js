import { ESTADOS_ORDEN } from '../utils/ordenUtils.js';
import { crearDocumentoPdf } from '../utils/pdf.js';
import { exigir } from './validaciones.js';

/** Construye un PDF básico paginado, sin dependencias de servicios externos. */
function crearPdf(lineas) {
  const contenidos = [];
  for (let inicio = 0; inicio < lineas.length; inicio += 44) {
    const texto = lineas
      .slice(inicio, inicio + 44)
      .map((linea, indice) => {
        const contenido = String(linea)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\x20-\x7e]/g, '?')
          .replace(/([\\()])/g, '\$1');
        return `1 0 0 1 45 ${790 - indice * 16} Tm (${contenido}) Tj`;
      })
      .join('\n');
    contenidos.push(`BT /F1 10 Tf\n${texto}\nET`);
  }
  return crearDocumentoPdf(contenidos);
}

/** Produce reportes por fecha de recepción, incluyendo estados vacíos. */
export function generarReporte(base, parametros) {
  const inicio = parametros.get('inicio');
  const fin = parametros.get('fin');
  exigir(
    /^\d{4}-\d{2}-\d{2}$/.test(inicio) &&
      /^\d{4}-\d{2}-\d{2}$/.test(fin) &&
      Number.isFinite(Date.parse(inicio)) &&
      Number.isFinite(Date.parse(fin)) &&
      inicio <= fin &&
      fin <= new Date().toISOString().slice(0, 10),
    'Rango de fechas inválido.',
  );
  const ordenes = base.ordenes.filter(
    (orden) => orden.fecha.slice(0, 10) >= inicio && orden.fecha.slice(0, 10) <= fin,
  );
  const concluidas = ordenes.filter((orden) => ['LISTO', 'ENTREGADO'].includes(orden.estado));
  return {
    inicio,
    fin,
    ingresos: concluidas.reduce((total, orden) => total + orden.total, 0),
    estados: Object.fromEntries(
      ESTADOS_ORDEN.map((estado) => [
        estado,
        ordenes.filter((orden) => orden.estado === estado).length,
      ]),
    ),
    productividad: base.usuarios
      .filter((usuario) => usuario.rol === 'tecnico')
      .map((tecnico) => {
        const atendidas = concluidas.filter((orden) => orden.idTecnico === tecnico.id);
        return {
          id: tecnico.id,
          nombre: tecnico.nombre,
          cantidad: atendidas.length,
          promedioDias: atendidas.length
            ? Number(
                (
                  atendidas.reduce(
                    (total, orden) =>
                      total + (Date.parse(orden.fechaListo) - Date.parse(orden.fecha)) / 86400000,
                    0,
                  ) / atendidas.length
                ).toFixed(2),
              )
            : null,
        };
      }),
  };
}

export function crearReportePdf(reporte, usuario) {
  return crearPdf([
    'TALLER - REPORTE ADMINISTRATIVO',
    `Usuario: ${usuario.nombre}`,
    `Generado: ${new Date().toISOString()}`,
    `Periodo: ${reporte.inicio} a ${reporte.fin}`,
    'Criterio: fecha de recepcion. Ingresos: ordenes LISTO o ENTREGADO.',
    `Ingresos: MXN ${reporte.ingresos.toFixed(2)}`,
    ...Object.entries(reporte.estados).map(([estado, cantidad]) => `${estado}: ${cantidad}`),
    'Productividad: tiempo desde recepcion hasta listo, en dias.',
    ...reporte.productividad.map(
      (fila) => `${fila.nombre}: ${fila.cantidad} ordenes; promedio ${fila.promedioDias ?? 'N/A'}`,
    ),
  ]);
}
