import React, { useState } from 'react';
import { useTecnoFixStore } from '../../store/tecnofix.js';
import { guardarEnSesion, leerEnSesion } from '../../utils/almacenSesion.js';
import { capturarFormulario, obtenerEstado } from '../../utils/vistaUtils.js';

const PRUEBAS = [
  'Fuente / cargador',
  'Batería',
  'Memoria RAM',
  'Disco (SSD/HDD)',
  'Temperatura',
  'Pantalla',
];

/** Registra el checklist de hardware y el diagnóstico técnico de la orden. */
export default function DiagnosticoTecnico({ orden, usuario, manejarOperacion, manejarNavegar }) {
  const claveBorrador = `tecnofix:borrador:${usuario.id}:${orden.id}:diagnostico`;
  const [borrador] = useState(() => leerEnSesion(claveBorrador) || {});
  const [pruebas, setPruebas] = useState(borrador.pruebas ?? orden.pruebas ?? {});
  const bloqueado = useTecnoFixStore((state) => state.enviando || state.datosDesactualizados);

  const guardarBorrador = (cambios) => {
    guardarEnSesion(claveBorrador, { ...leerEnSesion(claveBorrador), ...cambios });
  };

  const manejarDiagnostico = async (evento) => {
    const valores = capturarFormulario(evento);
    if (
      await manejarOperacion(`ordenes/${orden.id}`, {
        accion: 'diagnostico',
        descripcion: valores.descripcion,
        pruebas,
        manoObra: String(orden.manoObra || 0),
        costoRefacciones: String(orden.costoRefacciones || 0),
        refacciones: orden.refacciones || '',
      })
    ) {
      guardarEnSesion(claveBorrador, null);
      manejarNavegar('piezas');
    }
  };

  return (
    <section className="ficha-tabla">
      <article>
        <h2>Equipo</h2>
        <dl>
          <dt>Equipo</dt>
          <dd>{orden.equipo}</dd>
          <dt>Cliente</dt>
          <dd>{orden.cliente}</dd>
          <dt>Falla reportada</dt>
          <dd>{orden.falla}</dd>
          <dt>Ingreso</dt>
          <dd>{new Date(orden.fecha).toLocaleDateString('es-MX')}</dd>
          <dt>Estado</dt>
          <dd>{obtenerEstado(orden)}</dd>
        </dl>
        {orden.estado === 'RECIBIDO' && (
          <button
            disabled={bloqueado}
            onClick={() =>
              manejarOperacion(`ordenes/${orden.id}`, {
                accion: 'estado',
                estado: 'EN_DIAGNOSTICO',
              })
            }
          >
            Iniciar diagnóstico
          </button>
        )}
      </article>
      <form
        onSubmit={manejarDiagnostico}
        onChange={(evento) =>
          guardarBorrador(Object.fromEntries(new FormData(evento.currentTarget)))
        }
      >
        <h2>Checklist de pruebas</h2>
        {PRUEBAS.map((nombre) => (
          <div className="fila-prueba" key={nombre}>
            <span>{nombre}</span>
            {['OK', 'Falla'].map((resultado) => (
              <button
                type="button"
                key={resultado}
                className={`pastilla ${
                  pruebas[nombre] === resultado
                    ? resultado === 'OK'
                      ? 'prueba-ok'
                      : 'prueba-falla'
                    : ''
                }`}
                onClick={() => {
                  const nuevasPruebas = { ...pruebas, [nombre]: resultado };
                  setPruebas(nuevasPruebas);
                  guardarBorrador({ pruebas: nuevasPruebas });
                }}
              >
                {resultado}
              </button>
            ))}
          </div>
        ))}
        <label>
          Diagnóstico y observaciones
          <textarea
            name="descripcion"
            minLength="20"
            maxLength={1000}
            required
            defaultValue={borrador.descripcion ?? orden.diagnostico ?? ''}
            placeholder="Describe las fallas y pruebas realizadas…"
          />
        </label>
        <button disabled={bloqueado || orden.estado !== 'EN_DIAGNOSTICO'}>
          Guardar diagnóstico y agregar piezas
        </button>
      </form>
    </section>
  );
}
