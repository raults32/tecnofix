import React, { useState } from 'react';
import { useTecnoFixStore } from '../../store/tecnofix.js';
import { guardarEnSesion, leerEnSesion } from '../../utils/almacenSesion.js';
import { capturarFormulario, obtenerEstado } from '../../utils/vistaUtils.js';

/** Registra el trabajo realizado, pruebas finales y cambios de estado de reparación. */
export default function ReparacionTecnico({ orden, usuario, manejarOperacion }) {
  const claveBorrador = `tecnofix:borrador:${usuario.id}:${orden.id}:reparacion`;
  const [borrador] = useState(() => leerEnSesion(claveBorrador) || {});
  const bloqueado = useTecnoFixStore((state) => state.enviando || state.datosDesactualizados);
  const esCerrada = ['LISTO', 'ENTREGADO', 'CANCELADO'].includes(orden.estado);

  const manejarReparacion = async (evento) => {
    const valores = capturarFormulario(evento);
    if (
      await manejarOperacion(`ordenes/${orden.id}`, {
        accion: 'reparacion',
        ...valores,
        manoObra: String(orden.manoObra || 0),
        costoRefacciones: String(orden.costoRefacciones || 0),
        refacciones: orden.refacciones || '',
      })
    ) {
      guardarEnSesion(claveBorrador, null);
    }
  };

  return (
    <section className="columnas">
      <form
        onSubmit={manejarReparacion}
        onChange={(evento) =>
          guardarEnSesion(claveBorrador, {
            ...leerEnSesion(claveBorrador),
            ...Object.fromEntries(new FormData(evento.currentTarget)),
          })
        }
      >
        <h2>Registro de reparación</h2>
        <label>
          Trabajo realizado
          <textarea
            name="descripcion"
            required
            maxLength={1000}
            defaultValue={borrador.descripcion ?? orden.reparacion ?? ''}
          />
        </label>
        <h3>Piezas instaladas</h3>
        {(orden.piezas || []).map((pieza, indice) => (
          <p key={indice}>✓ {pieza.nombre}</p>
        ))}
        <label>
          Pruebas finales
          <textarea
            name="pruebasFinales"
            required
            maxLength={1000}
            defaultValue={borrador.pruebasFinales ?? orden.pruebasFinales ?? ''}
          />
        </label>
        <label>
          Tiempo invertido (minutos)
          <input
            name="minutosTrabajo"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={borrador.minutosTrabajo ?? orden.minutosTrabajo ?? ''}
          />
        </label>
        <button disabled={bloqueado || orden.estado !== 'EN_REPARACION'}>Guardar reparación</button>
      </form>
      <article>
        <h2>Estado de la orden</h2>
        <ol className="linea-estados">
          {['Recibido', 'En diagnóstico', 'Esperando aprobación', 'En reparación', 'Listo'].map(
            (estado) => (
              <li key={estado} className={obtenerEstado(orden) === estado ? 'actual' : ''}>
                {estado}
              </li>
            ),
          )}
        </ol>
        {orden.estado === 'EN_DIAGNOSTICO' && (
          <button
            disabled={bloqueado || !orden.tieneAutorizacion}
            onClick={() =>
              manejarOperacion(`ordenes/${orden.id}`, { accion: 'estado', estado: 'EN_REPARACION' })
            }
          >
            Iniciar reparación
          </button>
        )}
        {orden.estado === 'EN_REPARACION' && (
          <button
            disabled={bloqueado || !orden.reparacion}
            onClick={() =>
              manejarOperacion(`ordenes/${orden.id}`, { accion: 'estado', estado: 'LISTO' })
            }
          >
            Marcar como Listo
          </button>
        )}
        {esCerrada && <p>Estado actual: {obtenerEstado(orden)}</p>}
        <small>Recepción podrá consultar el cambio. No se envían correos automáticos.</small>
      </article>
    </section>
  );
}
