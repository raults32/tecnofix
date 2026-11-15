// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: Recepcion.jsx
// Descripción: Pantallas funcionales basadas en los prototipos TecnoFix.
// Fecha: 9 de noviembre de 2026

/* Importaciones de presentación y captura. */
import React, { useState } from 'react';
import Formulario from '../components/Formulario.jsx';
import { capturarFormulario, MONEDA, obtenerEstado } from '../utils/vistaUtils.js';

/** Implementa recepción por pasos, aprobación de cotizaciones y entrega con pagos. */
function Recepcion({ datos, orden, seccion, manejarOperacion, manejarNavegar, manejarAbrir }) {
  /* Selecciones de registros existentes y etapa del ingreso. */
  const [paso, setPaso] = useState(1);
  const [idCliente, setIdCliente] = useState('');
  const [idEquipo, setIdEquipo] = useState('');
  const [esNuevoCliente, setEsNuevoCliente] = useState(false);
  const [esNuevoEquipo, setEsNuevoEquipo] = useState(false);
  const [idSeleccion, setIdSeleccion] = useState('');
  const actual = datos.ordenes.find((elemento) => elemento.id === idSeleccion) || orden;
  const manejarCrear = async (ruta, valores, formulario) => {
    if (await manejarOperacion(ruta, valores, formulario)) {
      if (ruta === 'clientes') {
        setEsNuevoCliente(false);
      } else if (ruta === 'equipos') {
        setEsNuevoEquipo(false);
      } else {
        manejarNavegar('inicio');
      }
    }
  };
  const manejarDecision = (evento) => {
    const valores = capturarFormulario(evento);
    manejarOperacion(`ordenes/${actual.id}`, { accion: 'autorizar', ...valores });
  };
  const manejarPago = (evento) => {
    const valores = capturarFormulario(evento);
    manejarOperacion(`ordenes/${actual.id}`, { accion: 'pago', ...valores });
  };
  const opcionesClientes = datos.clientes.map((cliente) => ({
    valor: cliente.id,
    texto: `${cliente.nombre} · ${cliente.telefono}`,
  }));
  const equipos = datos.equipos.filter((equipo) => equipo.idCliente === idCliente);

  return seccion === 'nueva' ? (
    <>
      <div className="pasos">
        {['Cliente', 'Equipo', 'Orden'].map((nombre, indice) => (
          <button
            key={nombre}
            className={paso === indice + 1 ? 'activo' : 'secundario'}
            disabled={(indice > 0 && !idCliente) || (indice === 2 && !idEquipo)}
            onClick={() => setPaso(indice + 1)}
          >
            {indice + 1} {nombre}
          </button>
        ))}
      </div>
      <section className="tres-columnas">
        <article className={paso === 1 ? 'paso-actual' : ''}>
          <h2>Cliente (UC01)</h2>
          <label>
            Buscar cliente existente
            <select
              value={idCliente}
              onChange={(evento) => {
                setIdCliente(evento.target.value);
                setIdEquipo('');
              }}
            >
              <option value="">Teléfono o nombre</option>
              {opcionesClientes.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.texto}
                </option>
              ))}
            </select>
          </label>
          <button className="enlace" onClick={() => setEsNuevoCliente(!esNuevoCliente)}>
            ¿No aparece? Registrar nuevo
          </button>
          {esNuevoCliente && (
            <Formulario
              titulo="Nuevo cliente"
              campos={[
                { nombre: 'nombre', etiqueta: 'Nombre completo' },
                { nombre: 'telefono', etiqueta: 'Teléfono (10 dígitos)' },
                { nombre: 'correo', etiqueta: 'Correo', tipo: 'email' },
              ]}
              manejarEnvio={(valores, formulario) => manejarCrear('clientes', valores, formulario)}
            />
          )}
          {idCliente && (
            <button className="secundario" onClick={() => setPaso(2)}>
              Continuar a equipo
            </button>
          )}
        </article>
        <article className={paso === 2 ? 'paso-actual' : ''}>
          <h2>Equipo (UC02)</h2>
          {!idCliente ? (
            <p>Selecciona primero al cliente.</p>
          ) : (
            <>
              <label>
                Equipo existente
                <select value={idEquipo} onChange={(evento) => setIdEquipo(evento.target.value)}>
                  <option value="">Seleccionar equipo</option>
                  {equipos.map((equipo) => (
                    <option key={equipo.id} value={equipo.id}>
                      {equipo.marca} {equipo.modelo} · {equipo.serie}
                    </option>
                  ))}
                </select>
              </label>
              <button className="enlace" onClick={() => setEsNuevoEquipo(!esNuevoEquipo)}>
                Registrar nuevo equipo
              </button>
              {esNuevoEquipo && (
                <Formulario
                  titulo="Nuevo equipo"
                  campos={[
                    { nombre: 'marca', etiqueta: 'Marca' },
                    { nombre: 'modelo', etiqueta: 'Modelo' },
                    { nombre: 'serie', etiqueta: 'Número de serie' },
                    { nombre: 'especificaciones', etiqueta: 'Tipo y especificaciones' },
                  ]}
                  manejarEnvio={(valores, formulario) =>
                    manejarCrear('equipos', { ...valores, idCliente }, formulario)
                  }
                />
              )}
              <small>Si el equipo ya existe se vincula a su historial.</small>
              {idEquipo && (
                <button className="secundario" onClick={() => setPaso(3)}>
                  Continuar a orden
                </button>
              )}
            </>
          )}
        </article>
        <article className={paso === 3 ? 'paso-actual' : ''}>
          <h2>Orden de servicio (UC03)</h2>
          {!idEquipo ? (
            <p>Selecciona un equipo para generar la orden.</p>
          ) : (
            <Formulario
              titulo=""
              etiqueta="Generar orden"
              campos={[
                {
                  nombre: 'falla',
                  etiqueta: 'Falla reportada',
                  placeholder: 'Describe el problema…',
                },
                { nombre: 'estadoFisico', etiqueta: 'Estado físico (golpes, pantalla…)' },
                { nombre: 'accesorios', etiqueta: 'Accesorios incluidos (o ninguno)' },
              ]}
              manejarEnvio={(valores, formulario) =>
                manejarCrear('ordenes', { ...valores, idEquipo }, formulario)
              }
            />
          )}
          <small>Se genera un folio único y se conserva la bitácora.</small>
        </article>
      </section>
    </>
  ) : (
    <>
      <label className="selector-orden">
        Seleccionar orden
        <select value={actual?.id || ''} onChange={(evento) => setIdSeleccion(evento.target.value)}>
          <option value="">Seleccionar…</option>
          {datos.ordenes
            .filter((elemento) =>
              seccion === 'cotizaciones'
                ? elemento.esDiagnosticoConcluido
                : ['LISTO', 'ENTREGADO'].includes(elemento.estado),
            )
            .map((elemento) => (
              <option key={elemento.id} value={elemento.id}>
                {elemento.folio} · {elemento.cliente}
              </option>
            ))}
        </select>
      </label>
      {!actual ? (
        <p className="vacio">Selecciona una orden disponible para continuar.</p>
      ) : seccion === 'cotizaciones' ? (
        <section className="columnas cotizacion-recepcion">
          <div>
            <h2>Cotización recibida del técnico · {actual.folio}</h2>
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Cant.</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {(actual.piezas || []).map((pieza, indice) => (
                  <tr key={indice}>
                    <td>{pieza.nombre}</td>
                    <td>{pieza.cantidad}</td>
                    <td>{MONEDA.format(pieza.cantidad * pieza.costo)}</td>
                  </tr>
                ))}
                <tr>
                  <td>Mano de obra</td>
                  <td>1</td>
                  <td>{MONEDA.format(actual.manoObra || 0)}</td>
                </tr>
              </tbody>
            </table>
            <div className="total">
              Total <strong>{MONEDA.format(actual.total || 0)}</strong>
            </div>
            <a
              className="boton secundario"
              href={`/api/cotizacion/${actual.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Ver PDF
            </a>
          </div>
          <form onSubmit={manejarDecision}>
            <h2>Registrar decisión del cliente</h2>
            {['aprobada', 'rechazada', 'pendiente'].map((decision) => (
              <label className="opcion" key={decision}>
                <input
                  type="radio"
                  name="decision"
                  value={decision}
                  defaultChecked={decision === 'aprobada'}
                />
                {decision}
              </label>
            ))}
            <label>
              Medio de confirmación
              <select name="medio">
                <option>WhatsApp</option>
                <option>Teléfono</option>
                <option>Presencial</option>
                <option>Correo</option>
              </select>
            </label>
            <label>
              Notas
              <textarea name="descripcion" required placeholder="Cliente confirma…" />
            </label>
            <button disabled={actual.estado !== 'EN_DIAGNOSTICO'}>Registrar aprobación</button>
            <p>Decisión actual: {actual.decision || 'Pendiente'}</p>
          </form>
        </section>
      ) : (
        <section className="columnas">
          <article>
            <h2>Resumen de la orden</h2>
            <dl>
              <dt>Cliente</dt>
              <dd>{actual.cliente}</dd>
              <dt>Equipo</dt>
              <dd>{actual.equipo}</dd>
              <dt>Trabajo</dt>
              <dd>{actual.reparacion}</dd>
              <dt>Estado</dt>
              <dd>{obtenerEstado(actual)}</dd>
            </dl>
            <button className="secundario" onClick={() => manejarAbrir(actual.id)}>
              Ver bitácora
            </button>
          </article>
          <form onSubmit={manejarPago} key={actual.id}>
            <h2>Pago (UC19)</h2>
            <div className="columnas">
              <label>
                Total del servicio
                <input readOnly value={MONEDA.format(actual.total || 0)} />
              </label>
              <label>
                Pagos registrados
                <input
                  readOnly
                  value={MONEDA.format(
                    (actual.pagos || []).reduce((total, pago) => total + pago.monto, 0),
                  )}
                />
              </label>
            </div>
            <div className="total">
              Saldo a cobrar
              <strong>
                {MONEDA.format(
                  Math.max(
                    0,
                    actual.total -
                      (actual.pagos || []).reduce((total, pago) => total + pago.monto, 0),
                  ),
                )}
              </strong>
            </div>
            <label>
              Método de pago
              <select name="metodo">
                <option>Efectivo</option>
                <option>Tarjeta</option>
                <option>Transferencia</option>
              </select>
            </label>
            <label>
              Monto recibido
              <input type="number" min="0.01" step="0.01" name="monto" required />
            </label>
            <button disabled={actual.estado === 'ENTREGADO'}>Registrar pago</button>
            <div className="separador" />
            <label className="opcion">
              <input
                type="checkbox"
                id="devolucion"
                onChange={(evento) => {
                  evento.currentTarget.setCustomValidity('');
                  evento.currentTarget.form.dataset.esVerificado = evento.target.checked
                    ? 'true'
                    : '';
                }}
              />
              Equipo y accesorios devueltos
            </label>
            <p>Confirma la devolución de equipo y accesorios antes de entregar.</p>
            <button
              type="button"
              className="secundario"
              disabled={actual.estado !== 'LISTO'}
              onClick={(evento) => {
                if (!evento.currentTarget.form.dataset.esVerificado) {
                  evento.currentTarget.form
                    .querySelector('#devolucion')
                    .setCustomValidity('Confirma la devolución del equipo antes de entregar.');
                  evento.currentTarget.form.querySelector('#devolucion').reportValidity();
                  return;
                }
                manejarOperacion(`ordenes/${actual.id}`, { accion: 'estado', estado: 'ENTREGADO' });
              }}
            >
              Entregar y cerrar orden
            </button>
          </form>
        </section>
      )}
    </>
  );
}

export default Recepcion;
