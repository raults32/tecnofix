import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { NAVEGACION, ROLES, TITULOS } from './config/navegacion.js';
import { useTecnoFixStore } from './store/tecnofix.js';

// El marco compartido funciona como Layout.jsx + Outlet de la Pokédex.
export default function Layout() {
  const usuario = useTecnoFixStore((state) => state.usuario);
  const datos = useTecnoFixStore((state) => state.datos);
  const mensaje = useTecnoFixStore((state) => state.mensaje);
  const esError = useTecnoFixStore((state) => state.esError);
  const manejarOperacion = useTecnoFixStore((state) => state.manejarOperacion);
  const cerrarSesion = useTecnoFixStore((state) => state.cerrarSesion);
  const manejarError = useTecnoFixStore((state) => state.manejarError);
  const limpiarAviso = useTecnoFixStore((state) => state.limpiarAviso);
  const enviando = useTecnoFixStore((state) => state.enviando);
  const datosDesactualizados = useTecnoFixStore((state) => state.datosDesactualizados);
  const actualizarDatos = useTecnoFixStore((state) => state.actualizarDatos);
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const { id } = useParams();
  const seccion = ubicacion.pathname.split('/')[2] || 'inicio';
  const [seleccion, setSeleccion] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todas');
  const ordenSeleccionada = id || seleccion;
  const orden = datos.ordenes.find((elemento) => elemento.id === ordenSeleccionada);
  const esAdministrador = usuario.rol === 'administrador';

  function rutaDestino(destino) {
    const necesitaOrden = ['diagnostico', 'piezas', 'cotizacion', 'reparacion', 'detalle'].includes(
      destino,
    );
    const final =
      necesitaOrden && ordenSeleccionada ? `/${encodeURIComponent(ordenSeleccionada)}` : '';
    return destino === 'inicio' ? '/dashboard' : `/dashboard/${destino}${final}`;
  }
  function manejarNavegar(destino) {
    if (orden) setSeleccion(orden.id);
    limpiarAviso();
    navegar(rutaDestino(destino));
  }
  function manejarAbrir(idOrden) {
    setSeleccion(idOrden);
    limpiarAviso();
    navegar(
      `/dashboard/${usuario.rol === 'tecnico' ? 'diagnostico' : 'detalle'}/${encodeURIComponent(idOrden)}`,
    );
  }
  function seleccionarOrden(idOrden) {
    setSeleccion(idOrden);
    navegar(`/dashboard/${seccion}${idOrden ? `/${encodeURIComponent(idOrden)}` : ''}`, {
      replace: true,
    });
  }
  async function manejarSalir() {
    if (await cerrarSesion()) navegar('/', { replace: true });
  }
  const propiedades = {
    datos,
    usuario,
    orden,
    seccion,
    manejarOperacion,
    manejarNavegar,
    manejarAbrir,
    manejarError,
    limpiarAviso,
    esAdministrador,
    busqueda,
    setBusqueda,
    filtroEstado,
    setFiltroEstado,
    ordenSeleccionada,
    seleccionarOrden,
  };
  const titulo =
    seccion === 'inicio'
      ? esAdministrador
        ? 'Dashboard'
        : usuario.rol === 'tecnico'
          ? 'Mis órdenes asignadas'
          : 'Inicio · Panel de recepción'
      : seccion === 'detalle'
        ? `Orden de servicio · ${orden?.folio || ''}`
        : TITULOS[seccion] || 'TecnoFix';
  return (
    <main className={`aplicacion rol-${usuario.rol}`}>
      <aside className="barra-lateral">
        <div className="logotipo">
          TecnoFix
          <span />
        </div>
        <nav aria-label="Navegación principal">
          {NAVEGACION[usuario.rol].map(([destino, etiqueta]) => (
            <NavLink
              key={destino}
              to={rutaDestino(destino)}
              end={destino === 'inicio'}
              className={({ isActive }) => (isActive ? 'activo' : '')}
              onClick={limpiarAviso}
            >
              {etiqueta}
            </NavLink>
          ))}
        </nav>
        <button className="cerrar-sesion" onClick={manejarSalir}>
          Cerrar sesión
        </button>
      </aside>
      <div className="area-principal">
        <header className="cabecera">
          <h1>{titulo}</h1>
          <span className="caso">TecnoFix · Servicio técnico</span>
          <span className="perfil">
            <b>{ROLES[usuario.rol][0]}</b>
            {ROLES[usuario.rol]}
          </span>
        </header>

        <div className="contenido">
          {datosDesactualizados && (
            <div className="aviso" role="status">
              <p>Actualiza los datos antes de registrar otro cambio.</p>
              <button type="button" onClick={actualizarDatos} disabled={enviando}>
                {enviando ? 'Actualizando…' : 'Actualizar datos'}
              </button>
            </div>
          )}
          {mensaje && (
            <p role={esError ? 'alert' : 'status'} className={`aviso ${esError ? 'error' : ''}`}>
              {mensaje}
            </p>
          )}
          <Outlet context={propiedades} />
        </div>
        <footer>
          Equipo 5 · Validación y Verificación del Software · Aplicaciones Web · Implementación
          académica
        </footer>
      </div>
    </main>
  );
}
