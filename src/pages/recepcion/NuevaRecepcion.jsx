import React, { useEffect, useState } from 'react';
import Formulario from '../../components/Formulario.jsx';
import { guardarEnSesion, leerEnSesion } from '../../utils/almacenSesion.js';

/** Flujo por pasos para registrar cliente, equipo y nueva orden de servicio. */
export default function NuevaRecepcion({ datos, usuario, manejarOperacion, manejarNavegar }) {
  const claveBorrador = `tecnofix:borrador:${usuario.id}:recepcion`;
  const [borrador] = useState(() => leerEnSesion(claveBorrador) || {});
  const [pasoGuardado, setPaso] = useState(borrador.paso || 1);
  const [clienteGuardado, setIdCliente] = useState(borrador.idCliente || '');
  const [equipoGuardado, setIdEquipo] = useState(borrador.idEquipo || '');
  const [esNuevoCliente, setEsNuevoCliente] = useState(Boolean(borrador.esNuevoCliente));
  const [esNuevoEquipo, setEsNuevoEquipo] = useState(Boolean(borrador.esNuevoEquipo));

  const idCliente = datos.clientes.some((cliente) => cliente.id === clienteGuardado)
    ? clienteGuardado
    : '';
  const equipos = datos.equipos.filter((equipo) => equipo.idCliente === idCliente);
  const idEquipo = equipos.some((equipo) => equipo.id === equipoGuardado) ? equipoGuardado : '';
  const paso = Math.min(pasoGuardado, idEquipo ? 3 : idCliente ? 2 : 1);

  useEffect(() => {
    guardarEnSesion(claveBorrador, {
      paso: pasoGuardado,
      idCliente: clienteGuardado,
      idEquipo: equipoGuardado,
      esNuevoCliente,
      esNuevoEquipo,
    });
  }, [claveBorrador, pasoGuardado, clienteGuardado, equipoGuardado, esNuevoCliente, esNuevoEquipo]);

  const manejarCrear = async (ruta, valores, formulario) => {
    if (!(await manejarOperacion(ruta, valores, formulario))) return false;
    if (ruta === 'clientes') {
      setEsNuevoCliente(false);
    } else if (ruta === 'equipos') {
      setEsNuevoEquipo(false);
    } else {
      guardarEnSesion(claveBorrador, null);
      setPaso(1);
      setIdCliente('');
      setIdEquipo('');
      manejarNavegar('inicio');
    }
    return true;
  };

  const opcionesClientes = datos.clientes.map((cliente) => ({
    valor: cliente.id,
    texto: `${cliente.nombre} · ${cliente.telefono}`,
  }));

  return (
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
          <h2>Cliente</h2>
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
              claveBorrador={`${claveBorrador}:cliente`}
              campos={[
                { nombre: 'nombre', etiqueta: 'Nombre completo' },
                {
                  nombre: 'telefono',
                  etiqueta: 'Teléfono (10 dígitos)',
                  tipo: 'tel',
                  patron: '[0-9]{10}',
                  ayuda: 'Escribe 10 dígitos sin espacios.',
                },
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
          <h2>Equipo</h2>
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
                  key={idCliente}
                  claveBorrador={`${claveBorrador}:equipo:${idCliente}`}
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
          <h2>Orden de servicio</h2>
          {!idEquipo ? (
            <p>Selecciona un equipo para generar la orden.</p>
          ) : (
            <Formulario
              key={idEquipo}
              claveBorrador={`${claveBorrador}:orden:${idEquipo}`}
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
  );
}
