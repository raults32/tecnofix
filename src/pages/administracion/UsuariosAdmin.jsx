import React, { useEffect, useState } from 'react';
import Formulario from '../../components/Formulario.jsx';
import { solicitar } from '../../services/apiService.js';

async function consultarUsuarios() {
  const usuarios = await solicitar('usuarios');
  if (!Array.isArray(usuarios)) throw new Error('No se pudo leer la lista de usuarios.');
  return usuarios;
}

/** Lista, crea y edita cuentas de empleados y su estado activo. */
export default function UsuariosAdmin({ manejarOperacion, manejarError }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [esNuevoUsuario, setEsNuevoUsuario] = useState(false);

  useEffect(() => {
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
  }, [manejarError]);

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

  return (
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
  );
}
