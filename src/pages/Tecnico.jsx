// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: Tecnico.jsx
// Descripción: Pantallas funcionales basadas en los prototipos TecnoFix.
// Fecha: 9 de noviembre de 2026

/* Importaciones de presentación y captura. */
import React, { useRef, useState } from 'react';
import { useTecnoFixStore } from '../store/tecnofix.js';
import { guardarEnSesion, leerEnSesion } from '../utils/almacenSesion.js';
import { capturarFormulario, MONEDA, obtenerEstado } from '../utils/vistaUtils.js';

/* Pruebas típicas de la revisión de hardware. */
const PRUEBAS = [
  'Fuente / cargador',
  'Batería',
  'Memoria RAM',
  'Disco (SSD/HDD)',
  'Temperatura',
  'Pantalla',
];

/** Separa diagnóstico, piezas, cotización y reparación según el prototipo técnico. */
function Tecnico({ orden, usuario, seccion, manejarOperacion, manejarNavegar }) {
  /* Edición local de partidas; solo se persiste al guardar. */
  const claveBorrador = `tecnofix:borrador:${usuario.id}:${orden.id}:${seccion}`;
  const [borrador] = useState(() => leerEnSesion(claveBorrador) || {});
  const [piezas, setPiezas] = useState(borrador.piezas ?? orden.piezas ?? []);
  const [manoObra, setManoObra] = useState(borrador.manoObra ?? orden.manoObra ?? 0);
  const [pruebas, setPruebas] = useState(borrador.pruebas ?? orden.pruebas ?? {});
  const [esEditorVisible, setEsEditorVisible] = useState(Boolean(borrador.partida));
  const partida = esEditorVisible ? leerEnSesion(claveBorrador)?.partida : null;
  const bloqueado = useTecnoFixStore((state) => state.enviando || state.datosDesactualizados);
  const campoManoObra = useRef(null);
  const costoRefacciones =
    piezas.reduce((total, pieza) => total + pieza.cantidad * Math.round(pieza.costo * 100), 0) /
    100;
  const esCerrada = ['LISTO', 'ENTREGADO', 'CANCELADO'].includes(orden.estado);
  const guardarBorrador = (cambios) => {
    guardarEnSesion(claveBorrador, { ...leerEnSesion(claveBorrador), ...cambios });
  };
  const guardarCamposBorrador = (evento) => {
    guardarBorrador(Object.fromEntries(new FormData(evento.currentTarget)));
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
    )
      guardarEnSesion(claveBorrador, null);
  };

  return seccion === 'diagnostico' ? (
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
      <form onSubmit={manejarDiagnostico} onChange={guardarCamposBorrador}>
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
  ) : seccion === 'piezas' ? (
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
                      cambiarPiezas(piezas.filter((elemento, posicion) => posicion !== indice))
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
  ) : seccion === 'cotizacion' ? (
    <section className="documento-acciones">
      <article className="documento">
        <div className="titulo-documento">
          <h2>TecnoFix</h2>
          <strong>COTIZACIÓN</strong>
        </div>
        <p>
          Folio {orden.folio} · {orden.fechaCotizacion?.slice(0, 10)}
        </p>
        <p>
          Cliente: {orden.cliente} · {orden.equipo}
        </p>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Cant.</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {(orden.piezas || []).map((pieza, indice) => (
              <tr key={indice}>
                <td>{pieza.nombre}</td>
                <td>{pieza.cantidad}</td>
                <td>{MONEDA.format(pieza.cantidad * pieza.costo)}</td>
              </tr>
            ))}
            <tr>
              <td>Mano de obra</td>
              <td>1</td>
              <td>{MONEDA.format(orden.manoObra || 0)}</td>
            </tr>
          </tbody>
        </table>
        <div className="total">
          Total: <strong>{MONEDA.format(orden.total || 0)}</strong>
        </div>
        <small>Vigencia 7 días · Garantía de demostración: 30 días en mano de obra.</small>
      </article>
      <article>
        <h2>Acciones</h2>
        <div className="acciones">
          {orden.esDiagnosticoConcluido && (
            <a
              className="boton"
              href={`/api/cotizacion/${orden.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Descargar PDF
            </a>
          )}
          <button
            className="secundario"
            disabled={
              bloqueado ||
              orden.estado !== 'EN_DIAGNOSTICO' ||
              !orden.esDiagnosticoConcluido ||
              orden.esCotizacionEnviada
            }
            onClick={() => manejarOperacion(`ordenes/${orden.id}`, { accion: 'enviarCotizacion' })}
          >
            {orden.esCotizacionEnviada ? 'Cotización enviada' : 'Enviar a Recepción'}
          </button>
          <button className="secundario" onClick={() => manejarNavegar('piezas')}>
            Volver a editar piezas
          </button>
        </div>
        <small>Al enviarla, se muestra “Esperando aprobación” hasta registrar la decisión.</small>
      </article>
    </section>
  ) : (
    <section className="columnas">
      <form onSubmit={manejarReparacion} onChange={guardarCamposBorrador}>
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

export default Tecnico;
