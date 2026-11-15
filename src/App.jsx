import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import Formulario from './components/Formulario.jsx';
import { ROLES } from './config/navegacion.js';
import { useTecnoFixStore } from './store/tecnofix.js';

// Igual que el store de la Pokédex: cada componente toma los datos que necesita.
export default function App() {
  const usuario = useTecnoFixStore((state) => state.usuario);
  const mensaje = useTecnoFixStore((state) => state.mensaje);
  const cargando = useTecnoFixStore((state) => state.cargando);
  const recuperarSesion = useTecnoFixStore((state) => state.recuperarSesion);
  const manejarOperacion = useTecnoFixStore((state) => state.manejarOperacion);
  const [rolAcceso, setRolAcceso] = useState('administrador');

  useEffect(() => {
    recuperarSesion();
  }, [recuperarSesion]);

  if (cargando) return <p role="status">Cargando TecnoFix...</p>;
  if (usuario) return <Outlet />;
  return (
    <main className={`pantalla-acceso rol-${rolAcceso}`}>
      <section className="tarjeta-acceso">
        <div className="raya-marca" />
        <h1>TecnoFix</h1>
        <p>Sistema de gestión para servicio técnico de computadoras</p>
        <div className="roles-acceso" aria-label="Seleccionar rol de acceso">
          {Object.entries(ROLES).map(([rol, nombre]) => (
            <button
              key={rol}
              className={rol === rolAcceso ? 'activo' : 'secundario'}
              onClick={() => setRolAcceso(rol)}
            >
              {nombre}
            </button>
          ))}
        </div>
        <Formulario
          key={rolAcceso}
          titulo=""
          etiqueta="Iniciar sesión"
          campos={[
            { nombre: 'usuario', etiqueta: 'Usuario', valor: rolAcceso },
            { nombre: 'contrasena', etiqueta: 'Contraseña', tipo: 'password' },
          ]}
          manejarEnvio={(valores) => manejarOperacion('login', valores)}
        />
        {mensaje && (
          <p role="alert" className="aviso">
            {mensaje}
          </p>
        )}
        <small>Acceso exclusivo para empleados · Rol: {ROLES[rolAcceso]}</small>
        <strong className="etiqueta-caso">UC09 Iniciar sesión</strong>
      </section>
    </main>
  );
}
