// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: Administracion.jsx
// Descripción: Pantallas funcionales basadas en los prototipos TecnoFix.
// Fecha: 9 de noviembre de 2026

/* Importaciones de presentación y consulta. */
import React, { useEffect, useState } from 'react';
import Formulario from '../components/Formulario.jsx';
import { solicitar } from '../services/apiService.js';
import { useTecnoFixStore } from '../store/tecnofix.js';
import { fechaDelTaller } from '../utils/fechas.js';
import { MONEDA, obtenerEstado, capturarFormulario } from '../utils/vistaUtils.js';

async function consultarUsuarios() {
  const usuarios = await solicitar('usuarios');
  if (!Array.isArray(usuarios)) throw new Error('No se pudo leer la lista de usuarios.');
  return usuarios;
}

/** Presenta indicadores, asignación de carga, reportes y gestión de cuentas. */
function Administracion({ datos, usuario, seccion, manejarOperacion, manejarError, limpiarAviso }) {
  /* Estado de reportes y edición de cuentas. */
  const [usuarios, setUsuarios] = useState([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [esNuevoUsuario, setEsNuevoUsuario] = useState(false);
  const [reporte, setReporte] = useState(null);
  const [consultandoReporte, setConsultandoReporte] = useState(false);
  const [tipoReporte, setTipoReporte] = useState('Órdenes');
  const bloqueado = useTecnoFixStore((state) => state.enviando || state.datosDesactualizados);

  /* Consulta de cuentas solo dentro de su pantalla autorizada. */
  useEffect(() => {
    if (seccion === 'usuarios') {
      let vigente = true;
      consultarUsuarios()
        .then((resultado) => {
          if (vigente) setUsuarios(resultado);
        })
        .catch((error) => {
          if (vigente) manejarError(error);
        });
      return () => {
        vigente = false;
      };
    }
  }, [seccion, manejarError]);

  /* Operaciones administrativas con actualización de las listas. */
  const manejarUsuarios = async (valores) => {
    const ruta = cuentaSeleccionada ? `usuarios/${cuentaSeleccionada.id}` : 'usuarios';
    if (await manejarOperacion(ruta, valores)) {
      try {
        setUsuarios(await consultarUsuarios());
        setCuentaSeleccionada(null);
        setEsNuevoUsuario(false);
      } catch (error) {
        manejarError(error);
      }
    }
  };
  const manejarReporte = async (evento) => {
    const valores = capturarFormulario(evento);
    if (consultandoReporte) return;
    setReporte(null);
    setConsultandoReporte(true);
    limpiarAviso();
    try {
      const resultado = await solicitar(`reportes?${new URLSearchParams(valores)}`);
      if (!resultado.estados || !Array.isArray(resultado.productividad)) {
        throw new Error('No se pudo leer el reporte del periodo.');
      }
      setReporte(resultado);
    } catch (error) {
      manejarError(error);
    } finally {
      setConsultandoReporte(false);
    }
  };
  const manejarAsignar = (evento, orden) => {
    const valores = capturarFormulario(evento);
    manejarOperacion(`ordenes/${orden.id}`, { accion: 'asignar', ...valores });
  };
  const hoy = fechaDelTaller();
  const mesActual = hoy.slice(0, 7);
  const mensuales = datos.ordenes.filter((orden) =>
    fechaDelTaller(orden.fecha).startsWith(mesActual),
  );
  const concluidas = mensuales.filter((orden) => ['LISTO', 'ENTREGADO'].includes(orden.estado));
  const ingresos = concluidas.reduce((total, orden) => total + orden.total, 0);
  const gastos = concluidas.reduce((total, orden) => total + (orden.costoRefacciones || 0), 0);
  const semanales = [0, 1, 2, 3].map((semana) =>
    mensuales
      .filter(
        (orden) =>
          Math.min(3, Math.floor((Number(fechaDelTaller(orden.fecha).slice(8, 10)) - 1) / 7)) ===
          semana,
      )
      .reduce((total, orden) => total + (orden.costoRefacciones || 0), 0),
  );
  const maximo = Math.max(...semanales, 1);
  const ordenesAsignables = datos.ordenes.filter((orden) =>
    ['RECIBIDO', 'EN_DIAGNOSTICO', 'EN_REPARACION'].includes(orden.estado),
  );
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
            {ordenesAsignables.map((orden) => (
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
                  <form className="asignacion" onSubmit={(evento) => manejarAsignar(evento, orden)}>
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
                    <button className="secundario" disabled={bloqueado}>
                      {orden.idTecnico ? 'Reasignar' : 'Asignar'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ordenesAsignables.length && <p className="vacio">No hay órdenes para asignar.</p>}
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
              {['Ingresos', 'Gastos'].includes(tipoReporte) &&
                (() => {
                  const ordenesPeriodo = datos.ordenes.filter((orden) => {
                    const fecha = fechaDelTaller(orden.fecha);
                    return (
                      fecha >= reporte.inicio &&
                      fecha <= reporte.fin &&
                      (tipoReporte === 'Gastos' || ['LISTO', 'ENTREGADO'].includes(orden.estado))
                    );
                  });
                  return ordenesPeriodo.length ? (
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
                        {ordenesPeriodo.map((orden) => (
                          <tr key={orden.id}>
                            <td>{fechaDelTaller(orden.fecha)}</td>
                            <td>{orden.folio}</td>
                            <td>
                              {tipoReporte === 'Gastos'
                                ? orden.refacciones || 'Sin piezas'
                                : 'Servicio técnico'}
                            </td>
                            <td>
                              {MONEDA.format(
                                tipoReporte === 'Gastos'
                                  ? orden.costoRefacciones || 0
                                  : orden.total,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="vacio">No hay registros en este periodo.</p>
                  );
                })()}
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
        <form
          onSubmit={manejarReporte}
          onChange={() => setReporte(null)}
          aria-busy={consultandoReporte}
        >
          <h2>Periodo y exportación</h2>
          <label>
            Desde
            <input
              name="inicio"
              type="date"
              defaultValue={`${mesActual}-01`}
              required
              max={hoy}
              disabled={consultandoReporte}
            />
          </label>
          <label>
            Hasta
            <input
              name="fin"
              type="date"
              defaultValue={hoy}
              required
              max={hoy}
              disabled={consultandoReporte}
            />
          </label>
          <button disabled={consultandoReporte}>
            {consultandoReporte ? 'Consultando…' : 'Consultar reporte'}
          </button>
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
