// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: Formulario.jsx
// Descripción: Presenta campos accesibles y captura valores del formulario.
// Fecha: 9 de noviembre de 2026

/* Importación del entorno JSX. */
import React from 'react';

/* Componente reutilizable de captura. */
/** Construye formularios accesibles y entrega sus valores al manejador de la pantalla. */
function Formulario({ titulo, campos, manejarEnvio, etiqueta = 'Guardar' }) {
  /* Captura de valores sin estado duplicado. */
  const manejarFormulario = (evento) => {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(evento.currentTarget));
    manejarEnvio(datos, evento.currentTarget);
  };

  return (
    <form onSubmit={manejarFormulario}>
      {titulo && <h3>{titulo}</h3>}
      {campos.map((campo) => (
        <label key={campo.nombre}>
          {campo.etiqueta}
          {campo.opciones ? (
            <select
              name={campo.nombre}
              defaultValue={campo.valor || ''}
              required={!campo.esOpcional}
            >
              <option value="">Seleccionar…</option>
              {campo.opciones.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.texto}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={campo.nombre}
              defaultValue={campo.valor || ''}
              placeholder={campo.placeholder}
              type={campo.tipo || 'text'}
              required={!campo.esOpcional}
              min={campo.tipo === 'number' ? '0' : undefined}
              step={campo.tipo === 'number' ? '0.01' : undefined}
              maxLength="1000"
            />
          )}
        </label>
      ))}
      <button>{etiqueta}</button>
    </form>
  );
}

export default Formulario;
