import { ESTADOS_ORDEN } from '../../utils/ordenUtils.js';
import { fechaDelTaller } from '../../utils/fechas.js';
import { exigir } from '../validaciones.js';

/** Produce reportes por fecha de recepción, incluyendo estados vacíos. */
export function generarReporte(base, parametros) {
  const inicio = parametros.get('inicio');
  const fin = parametros.get('fin');
  exigir(
    esFechaValida(inicio) && esFechaValida(fin) && inicio <= fin && fin <= fechaDelTaller(),
    'Rango de fechas inválido.',
  );
  const ordenes = base.ordenes.filter((orden) => {
    const fecha = fechaDelTaller(orden.fecha);
    return fecha >= inicio && fecha <= fin;
  });
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
        const duraciones = atendidas
          .map((orden) => (Date.parse(orden.fechaListo) - Date.parse(orden.fecha)) / 86400000)
          .filter((dias) => Number.isFinite(dias) && dias >= 0);
        return {
          id: tecnico.id,
          nombre: tecnico.nombre,
          cantidad: atendidas.length,
          promedioDias: duraciones.length
            ? Number(
                (duraciones.reduce((total, dias) => total + dias, 0) / duraciones.length).toFixed(
                  2,
                ),
              )
            : null,
        };
      }),
  };
}

function esFechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(valor);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}
