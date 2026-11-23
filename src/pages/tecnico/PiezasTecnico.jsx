import React, { useRef, useState } from 'react';
import { useTecnoFixStore } from '../../store/tecnofix.js';
import { guardarEnSesion, leerEnSesion } from '../../utils/almacenSesion.js';
import { capturarFormulario, MONEDA } from '../../utils/vistaUtils.js';

/** Captura partidas de refacciones, mano de obra y genera la cotización de la orden. */
export default function PiezasTecnico({ orden, usuario, manejarOperacion, manejarNavegar }) {
  const claveBorrador = `tecnofix:borrador:${usuario.id}:${orden.id}:piezas`;
  const [borrador] = useState(() => leerEnSesion(claveBorrador) || {});
  const [piezas, setPiezas] = useState(borrador.piezas ?? orden.piezas ?? []);
  const [manoObra, setManoObra] = useState(borrador.manoObra ?? orden.manoObra ?? 0);
  const [esEditorVisible, setEsEditorVisible] = useState(Boolean(borrador.partida));
  const partida = esEditorVisible ? leerEnSesion(claveBorrador)?.partida : null;
  const bloqueado = useTecnoFixStore((state) => state.enviando || state.datosDesactualizados);
  const campoManoObra = useRef(null);

  const costoRefacciones =
    piezas.reduce((total, pieza) => total + pieza.cantidad * Math.round(pieza.costo * 100), 0) /
    100;

  const guardarBorrador = (cambios) => {
    guardarEnSesion(claveBorrador, { ...leerEnSesion(claveBorrador), ...cambios });
  };

  const cambiarPiezas = (partidas) => {
    setPiezas(partidas);
    guardarBorrador({ piezas: partidas });
  };

  const manejarAgregar = (evento) => {
    const campoNombre = evento.currentTarget.elements.nombre;
    const valores = capturarFormulario(evento);
    const nombre = valores.nombre.trim();
    if (!nombre) {
      campoNombre.setCustomValidity('Escribe el nombre de la pieza.');
      campoNombre.reportValidity();
      return;
    }
    cambiarPiezas([
      ...piezas,
      {
        nombre,
        cantidad: Number(valores.cantidad),
        costo: Number(valores.costo),
        disponibilidad: valores.disponibilidad,
      },
    ]);
    guardarBorrador({ partida: null });
    setEsEditorVisible(false);
  };

  const manejarGuardarPiezas = async () => {
    if (!campoManoObra.current.reportValidity()) return;
    if (await manejarOperacion(`ordenes/${orden.id}`, { accion: 'piezas', piezas, manoObra })) {
      guardarEnSesion(claveBorrador, null);
      manejarNavegar('cotizacion');
    }
  };

  return (
    <>
      <div className="herramientas">
        <p>Agrega las piezas propuestas para esta reparación.</p>
        <button
          disabled={orden.estado !== 'EN_DIAGNOSTICO' || piezas.length >= 50}
          onClick={() => setEsEditorVisible(!esEditorVisible)}
        >
          + Agregar pieza
        </button>
      </div>
      {esEditorVisible && (
        <form
          className="formulario-partida"
          onSubmit={manejarAgregar}
          onChange={(evento) =>
            guardarBorrador({ partida: Object.fromEntries(new FormData(evento.currentTarget)) })
          }
        >
          <label>
            Pieza
            <input
              name="nombre"
              required
              maxLength="100"
              defaultValue={partida?.nombre}
              onInput={(evento) => evento.currentTarget.setCustomValidity('')}
            />
          </label>
          <label>
            Cantidad
            <input
              name="cantidad"
              type="number"
              min="1"
              max="10000"
              step="1"
              defaultValue={partida?.cantidad}
              required
            />
          </label>
          <label>
            Costo unitario
            <input
              name="costo"
              type="number"
              min="0"
              step="0.01"
              defaultValue={partida?.costo}
              required
            />
          </label>
          <label>
            Disponibilidad
            <select name="disponibilidad" defaultValue={partida?.disponibilidad || 'En stock'}>
              <option>En stock</option>
              <option>Por pedir</option>
            </select>
          </label>
          <button>Agregar</button>
        </form>
      )}
      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Pieza</th>
              <th>Cant.</th>
              <th>Costo unit.</th>
              <th>Subtotal</th>
              <th>Disponibilidad</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {piezas.map((pieza, indice) => (
              <tr key={indice}>
                <td>{pieza.nombre}</td>
                <td>{pieza.cantidad}</td>
                <td>{MONEDA.format(pieza.costo)}</td>
                <td>{MONEDA.format(pieza.costo * pieza.cantidad)}</td>
                <td>
                  <span className="estado">{pieza.disponibilidad}</span>
                </td>
                <td>
                  <button
                    className="secundario peligro"
                    disabled={orden.estado !== 'EN_DIAGNOSTICO'}
                    onClick={() =>
                      cambiarPiezas(piezas.filter((_elemento, posicion) => posicion !== indice))
                    }
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!piezas.length && <p className="vacio">Sin piezas. Puedes registrar solo mano de obra.</p>}
      </div>
      <div className="pie-piezas">
        <small>
          Disponibilidad capturada manualmente; sin inventario externo. Los cambios se guardan al
          generar la cotización.
        </small>
        <article>
          <p>
            Piezas
            <strong>{MONEDA.format(costoRefacciones)}</strong>
          </p>
          <label>
            Mano de obra
            <input
              ref={campoManoObra}
              aria-label="Mano de obra"
              type="number"
              min="0"
              step="0.01"
              required
              value={manoObra}
              onChange={(evento) => {
                setManoObra(evento.target.value);
                guardarBorrador({ manoObra: evento.target.value });
              }}
            />
          </label>
          <div className="total">
            Total estimado<strong>{MONEDA.format(costoRefacciones + Number(manoObra || 0))}</strong>
          </div>
          <button
            disabled={
              bloqueado || orden.estado !== 'EN_DIAGNOSTICO' || !orden.esDiagnosticoConcluido
            }
            onClick={manejarGuardarPiezas}
          >
            Generar cotización
          </button>
        </article>
      </div>
    </>
  );
}
