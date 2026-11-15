// Nombre: Desarrollo asistido por Codex; revisiÃ³n pendiente del Equipo 5
// Proyecto: Sistema de GestiÃ³n para Servicio TÃ©cnico de Computadoras
// Archivo: Tecnico.jsx
// DescripciÃ³n: Pantallas funcionales basadas en los prototipos TecnoFix.
// Fecha: 9 de noviembre de 2026

/* Importaciones de presentación y captura. */
import React, { useState } from 'react';
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
function Tecnico({ orden, seccion, manejarOperacion, manejarNavegar }) {
  /* Edición local de partidas; solo se persiste al guardar. */
  const [piezas, setPiezas] = useState(orden.piezas || []);
  const [manoObra, setManoObra] = useState(orden.manoObra || 0);
  const [pruebas, setPruebas] = useState(orden.pruebas || {});
  const [esEditorVisible, setEsEditorVisible] = useState(false);
  const costoRefacciones = piezas.reduce((total, pieza) => total + pieza.cantidad * pieza.costo, 0);
  const esCerrada = ['LISTO', 'ENTREGADO', 'CANCELADO'].includes(orden.estado);
  const manejarAgregar = (evento) => {
    const valores = capturarFormulario(evento);
    setPiezas([
      ...piezas,
      {
        nombre: valores.nombre,
        cantidad: Number(valores.cantidad),
        costo: Number(valores.costo),
        disponibilidad: valores.disponibilidad,
      },
    ]);
    setEsEditorVisible(false);
  };
  const manejarGuardarPiezas = async () => {
    if (await manejarOperacion(`ordenes/${orden.id}`, { accion: 'piezas', piezas, manoObra })) {
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
      manejarNavegar('piezas');
    }
  };
  const manejarReparacion = (evento) => {
    const valores = capturarFormulario(evento);
    manejarOperacion(`ordenes/${orden.id}`, {
      accion: 'reparacion',
      ...valores,
      manoObra: String(orden.manoObra || 0),
      costoRefacciones: String(orden.costoRefacciones || 0),
      refacciones: orden.refacciones || '',
    });
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
      <form onSubmit={manejarDiagnostico}>
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
                onClick={() => setPruebas({ ...pruebas, [nombre]: resultado })}
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
            required
            defaultValue={orden.diagnostico || ''}
            placeholder="Describe las fallas y pruebas realizadas…"
          />
        </label>
        <button disabled={orden.estado !== 'EN_DIAGNOSTICO'}>
          Guardar diagnóstico y agregar piezas
        </button>
      </form>
    </section>
  ) : seccion === 'piezas' ? (
    <>
      <div className="herramientas">
        <p>Agrega las piezas propuestas para esta reparación.</p>
        <button
          disabled={orden.estado !== 'EN_DIAGNOSTICO'}
          onClick={() => setEsEditorVisible(!esEditorVisible)}
        >
          + Agregar pieza
        </button>
      </div>
      {esEditorVisible && (
        <form className="formulario-partida" onSubmit={manejarAgregar}>
          <label>
            Pieza
            <input name="nombre" required maxLength="100" />
          </label>
          <label>
            Cantidad
            <input name="cantidad" type="number" min="1" step="1" required />
          </label>
          <label>
            Costo unitario
            <input name="costo" type="number" min="0" step="0.01" required />
          </label>
          <label>
            Disponibilidad
            <select name="disponibilidad">
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
                      setPiezas(piezas.filter((elemento, posicion) => posicion !== indice))
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
              aria-label="Mano de obra"
              type="number"
              min="0"
              step="0.01"
              value={manoObra}
              onChange={(evento) => setManoObra(evento.target.value)}
            />
          </label>
          <div className="total">
            Total estimado<strong>{MONEDA.format(costoRefacciones + Number(manoObra || 0))}</strong>
          </div>
          <button
            disabled={orden.estado !== 'EN_DIAGNOSTICO' || !orden.esDiagnosticoConcluido}
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
            disabled={orden.estado !== 'EN_DIAGNOSTICO'}
            onClick={() => manejarOperacion(`ordenes/${orden.id}`, { accion: 'enviarCotizacion' })}
          >
            Enviar a Recepción
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
      <form onSubmit={manejarReparacion}>
        <h2>Registro de reparación (UC06)</h2>
        <label>
          Trabajo realizado
          <textarea name="descripcion" required defaultValue={orden.reparacion || ''} />
        </label>
        <h3>Piezas instaladas</h3>
        {(orden.piezas || []).map((pieza, indice) => (
          <p key={indice}>✓ {pieza.nombre}</p>
        ))}
        <label>
          Pruebas finales
          <textarea name="pruebasFinales" required defaultValue={orden.pruebasFinales || ''} />
        </label>
        <label>
          Tiempo invertido (minutos)
          <input
            name="minutosTrabajo"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={orden.minutosTrabajo || ''}
          />
        </label>
        <button disabled={orden.estado !== 'EN_REPARACION'}>Guardar reparación</button>
      </form>
      <article>
        <h2>Estado de la orden (UC07)</h2>
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
            disabled={!orden.tieneAutorizacion}
            onClick={() =>
              manejarOperacion(`ordenes/${orden.id}`, { accion: 'estado', estado: 'EN_REPARACION' })
            }
          >
            Iniciar reparación
          </button>
        )}
        {orden.estado === 'EN_REPARACION' && (
          <button
            disabled={!orden.reparacion}
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
