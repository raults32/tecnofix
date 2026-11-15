// Nombre: Desarrollo asistido por Codex; revisiÃ³n pendiente del Equipo 5
// Proyecto: Sistema de GestiÃ³n para Servicio TÃ©cnico de Computadoras
// Archivo: Administracion.jsx
// DescripciÃ³n: Pantallas funcionales basadas en los prototipos TecnoFix.
// Fecha: 9 de noviembre de 2026

/* Importaciones de presentación y consulta. */
import React, { useEffect, useState } from 'react';
import Formulario from '../components/Formulario.jsx';
import { solicitar } from '../services/apiService.js';
import { MONEDA, obtenerEstado, capturarFormulario } from '../utils/vistaUtils.js';

/* Configuración inicial del periodo de reporte. */
const HOY = new Date().toISOString().slice(0, 10);

/** Presenta indicadores, asignación de carga, reportes y gestión de cuentas. */
function Administracion({ datos, usuario, seccion, manejarOperacion, manejarError }) {
  /* Estado de reportes y edición de cuentas. */
  const [usuarios, setUsuarios] = useState([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [esNuevoUsuario, setEsNuevoUsuario] = useState(false);
  const [reporte, setReporte] = useState(null);
  const [tipoReporte, setTipoReporte] = useState('Órdenes');

  /* Consulta de cuentas solo dentro de su pantalla autorizada. */
  useEffect(() => {
    if (seccion === 'usuarios') {
      solicitar('usuarios').then(setUsuarios).catch(manejarError);
    }
  }, [seccion]);

  /* Operaciones administrativas con actualización de las listas. */
  const manejarUsuarios = async (valores) => {
    const ruta = cuentaSeleccionada ? `usuarios/${cuentaSeleccionada.id}` : 'usuarios';
    if (await manejarOperacion(ruta, valores)) {
      try {
        setUsuarios(await solicitar('usuarios'));
        setCuentaSeleccionada(null);
        setEsNuevoUsuario(false);
      } catch (error) {
        manejarError(error);
      }
    }
  };
  const manejarReporte = async (evento) => {
    const valores = capturarFormulario(evento);
    try {
      setReporte(await solicitar(`reportes?${new URLSearchParams(valores)}`));
    } catch (error) {
      manejarError(error);
    }
  };
  const manejarAsignar = (evento, orden) => {
    const valores = capturarFormulario(evento);
    manejarOperacion(`ordenes/${orden.id}`, { accion: 'asignar', ...valores });
  };
  const mesActual = HOY.slice(0, 7);
  const mensuales = datos.ordenes.filter((orden) => orden.fecha.startsWith(mesActual));
  const concluidas = mensuales.filter((orden) => ['LISTO', 'ENTREGADO'].includes(orden.estado));
  const ingresos = concluidas.reduce((total, orden) => total + orden.total, 0);
  const gastos = concluidas.reduce((total, orden) => total + (orden.costoRefacciones || 0), 0);
  const semanales = [0, 1, 2, 3].map((semana) =>
    mensuales
      .filter(
        (orden) => Math.min(3, Math.floor((Number(orden.fecha.slice(8, 10)) - 1) / 7)) === semana,
      )
      .reduce((total, orden) => total + (orden.costoRefacciones || 0), 0),
  );
  const maximo = Math.max(...semanales, 1);
  const camposUsuario = [
    { nombre: 'nombre', etiqueta: 'Nombre', valor: cuentaSeleccionada?.nombre },
    { nombre: 'usuario', etiqueta: 'Usuario', valor: cuentaSeleccionada?.usuario },
    ...(!cuentaSeleccionada
      ? [{ nombre: 'contrasena', etiqueta: 'Contraseña (mínimo 10 caracteres)', tipo: 'password' }]
      : []),
    {
      nombre: 'rol',
      etiqueta: 'Rol',
      valor: cuentaSeleccionada?.rol,
      opciones: ['administrador', 'recepcion', 'tecnico'].map((rol) => ({
        valor: rol,
        texto: rol,
      })),
    },
    ...(cuentaSeleccionada
      ? [
          {
            nombre: 'esActivo',
            etiqueta: 'Estado',
            valor: String(cuentaSeleccionada.esActivo),
            opciones: [
              { valor: 'true', texto: 'Activo' },
              { valor: 'false', texto: 'Inactivo' },
            ],
          },
        ]
      : []),
  ];

  return seccion === 'inicio' ? (
    <>
      <p className="periodo">
        Periodo de recepción ·{' '}
        {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
      </p>
      <section className="indicadores">
        {[
          ['Ingresos del mes', MONEDA.format(ingresos)],
          ['Gastos (piezas)', MONEDA.format(gastos)],
          ['Utilidad estimada', MONEDA.format(ingresos - gastos)],
          [
            'Órdenes abiertas',
            datos.ordenes.filter((orden) => !['ENTREGADO', 'CANCELADO'].includes(orden.estado))
              .length,
          ],
        ].map(([etiqueta, valor]) => (
          <article key={etiqueta}>
            <small>{etiqueta}</small>
            <strong>{valor}</strong>
          </article>
        ))}
      </section>
      <section className="graficas">
        <article>
          <h2>Gastos por semana</h2>
          <div
            className="grafica-barras"
            aria-label="Gastos de piezas propuestos por semana del mes"
          >
            {semanales.map((importe, indice) => (
              <div key={indice}>
                <span>{MONEDA.format(importe)}</span>
                <div
                  className="barra"
                  style={{ height: `${Math.max(2, (importe / maximo) * 220)}px` }}
                />
                <small>Semana {indice + 1}</small>
              </div>
            ))}
          </div>
          <small>
            Costos registrados en órdenes recibidas en el mes; no son compras contables.
          </small>
        </article>
        <article>
          <h2>Órdenes por estado</h2>
          {[
            'Recibido',
            'En diagnóstico',
            'Esperando aprobación',
            'En reparación',
            'Listo',
            'Entregado',
            'Cancelado',
          ].map((estado) => {
            const cantidad = datos.ordenes.filter(
              (orden) => obtenerEstado(orden) === estado,
            ).length;
            return (
              <div className="fila-estado" key={estado}>
                <span className="estado">{estado}</span>
                <meter min="0" max={Math.max(datos.ordenes.length, 1)} value={cantidad} />
                <strong>{cantidad}</strong>
              </div>
            );
          })}
        </article>
      </section>
    </>
  ) : seccion === 'asignar' ? (
    <>
      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Equipo</th>
              <th>Falla</th>
              <th>Estado</th>
              <th>Técnico / acción</th>
            </tr>
          </thead>
          <tbody>
            {datos.ordenes
              .filter((orden) =>
                ['RECIBIDO', 'EN_DIAGNOSTICO', 'EN_REPARACION'].includes(orden.estado),
              )
              .map((orden) => (
                <tr key={orden.id}>
                  <td>
                    <strong>{orden.folio}</strong>
                  </td>
                  <td>{orden.equipo}</td>
                  <td>{orden.falla}</td>
                  <td>
                    <span className="estado">
                      {orden.idTecnico ? obtenerEstado(orden) : 'Sin asignar'}
                    </span>
                  </td>
                  <td>
                    <form
                      className="asignacion"
                      onSubmit={(evento) => manejarAsignar(evento, orden)}
                    >
                      <select
                        name="idTecnico"
                        required
                        aria-label={`Técnico para ${orden.folio}`}
                        defaultValue={orden.idTecnico || ''}
                      >
                        <option value="">Elegir…</option>
                        {datos.tecnicos.map((tecnico) => (
                          <option key={tecnico.id} value={tecnico.id}>
                            {tecnico.nombre}
                          </option>
                        ))}
                      </select>
                      {orden.idTecnico && (
                        <input
                          name="descripcion"
                          required
                          placeholder="Motivo de reasignación"
                          aria-label="Motivo de reasignación"
                        />
                      )}
                      <button className="secundario">
                        {orden.idTecnico ? 'Reasignar' : 'Asignar'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!datos.ordenes.length && <p className="vacio">No hay órdenes para asignar.</p>}
      </div>
      <h2>Carga actual de técnicos</h2>
      <section className="tres-columnas">
        {datos.tecnicos.map((tecnico) => (
          <article key={tecnico.id} className="carga-tecnico">
            <b>{tecnico.nombre[0]}</b>
            <div>
              <strong>{tecnico.nombre}</strong>
              <p>
                {
                  datos.ordenes.filter(
                    (orden) =>
                      orden.idTecnico === tecnico.id &&
                      !['LISTO', 'ENTREGADO', 'CANCELADO'].includes(orden.estado),
                  ).length
                }{' '}
                órdenes activas
              </p>
            </div>
          </article>
        ))}
      </section>
    </>
  ) : seccion === 'usuarios' ? (
    <>
      <div className="herramientas">
        <p>Administración de empleados</p>
        <button
          onClick={() => {
            setCuentaSeleccionada(null);
            setEsNuevoUsuario(true);
          }}
        >
          + Nuevo empleado
        </button>
      </div>
      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((cuenta) => (
              <tr key={cuenta.id}>
                <td>
                  <strong>{cuenta.nombre}</strong>
                </td>
                <td>{cuenta.usuario}</td>
                <td>{cuenta.rol}</td>
                <td>
                  <span className={`estado ${cuenta.esActivo ? 'verde' : 'gris'}`}>
                    {cuenta.esActivo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <button
                    className="secundario"
                    onClick={() => {
                      setCuentaSeleccionada(cuenta);
                      setEsNuevoUsuario(false);
                    }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(esNuevoUsuario || cuentaSeleccionada) && (
        <article className="editor-usuario">
          <Formulario
            key={cuentaSeleccionada?.id || 'nueva'}
            titulo={cuentaSeleccionada ? 'Editar empleado' : 'Nuevo empleado'}
            campos={camposUsuario}
            manejarEnvio={manejarUsuarios}
          />
          <button
            className="secundario"
            onClick={() => {
              setEsNuevoUsuario(false);
              setCuentaSeleccionada(null);
            }}
          >
            Cancelar
          </button>
        </article>
      )}
      <article className="nota-permisos">
        <h2>Permisos por rol</h2>
        <p>
          Recepción: clientes, equipos, órdenes, aprobación, pagos y entrega · Técnico: diagnóstico,
          piezas, reparación y estado · Administración: usuarios, asignaciones, reportes y consulta.
        </p>
      </article>
    </>
  ) : (
    <>
      <div className="pestanas">
        {['Órdenes', 'Ingresos', 'Gastos', 'Productividad'].map((nombre) => (
          <button
            key={nombre}
            className={tipoReporte === nombre ? 'activo' : 'secundario'}
            onClick={() => setTipoReporte(nombre)}
          >
            {nombre}
          </button>
        ))}
      </div>
      <section className="documento-acciones">
        <div>
          <h2>{tipoReporte}</h2>
          {!reporte ? (
            <p className="vacio">Selecciona un periodo y consulta el reporte.</p>
          ) : (
            <>
              {tipoReporte === 'Órdenes' && (
                <table>
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Órdenes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reporte.estados).map(([estado, cantidad]) => (
                      <tr key={estado}>
                        <td>{estado}</td>
                        <td>{cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {['Ingresos', 'Gastos'].includes(tipoReporte) && (
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Orden</th>
                      <th>Concepto</th>
                      <th>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.ordenes
                      .filter(
                        (orden) =>
                          orden.fecha.slice(0, 10) >= reporte.inicio &&
                          orden.fecha.slice(0, 10) <= reporte.fin &&
                          (tipoReporte === 'Gastos' ||
                            ['LISTO', 'ENTREGADO'].includes(orden.estado)),
                      )
                      .map((orden) => (
                        <tr key={orden.id}>
                          <td>{orden.fecha.slice(0, 10)}</td>
                          <td>{orden.folio}</td>
                          <td>
                            {tipoReporte === 'Gastos'
                              ? orden.refacciones || 'Sin piezas'
                              : 'Servicio técnico'}
                          </td>
                          <td>
                            {MONEDA.format(
                              tipoReporte === 'Gastos' ? orden.costoRefacciones || 0 : orden.total,
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
              {tipoReporte === 'Productividad' && (
                <table>
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>Atendidas</th>
                      <th>Promedio días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.productividad.map((fila) => (
                      <tr key={fila.id}>
                        <td>{fila.nombre}</td>
                        <td>{fila.cantidad}</td>
                        <td>{fila.promedioDias ?? 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="total">
                Ingresos de órdenes concluidas<strong>{MONEDA.format(reporte.ingresos)}</strong>
              </div>
            </>
          )}
        </div>
        <form onSubmit={manejarReporte}>
          <h2>Periodo y exportación (UC12)</h2>
          <label>
            Desde
            <input
              name="inicio"
              type="date"
              defaultValue={`${HOY.slice(0, 7)}-01`}
              required
              max={HOY}
            />
          </label>
          <label>
            Hasta
            <input name="fin" type="date" defaultValue={HOY} required max={HOY} />
          </label>
          <button>Consultar reporte</button>
          {reporte && (
            <a
              className="boton secundario"
              href={`/api/reporte.pdf?inicio=${reporte.inicio}&fin=${reporte.fin}`}
              target="_blank"
              rel="noreferrer"
            >
              Exportar reporte PDF
            </a>
          )}
          <small>
            El PDF contiene estados, ingresos y productividad. Gastos: consulta en pantalla.
          </small>
        </form>
      </section>
    </>
  );
}

export default Administracion;
