// Nombre: Desarrollo asistido por Codex; revisión pendiente del Equipo 5
// Proyecto: Sistema de Gestión para Servicio Técnico de Computadoras
// Archivo: Formulario.jsx
// Descripción: Presenta campos accesibles y captura valores del formulario.
// Fecha: 9 de noviembre de 2026

/* Importación del entorno JSX. */
import React, { useState } from 'react';
import { useTecnoFixStore } from '../store/tecnofix.js';
import { guardarEnSesion, leerEnSesion } from '../utils/almacenSesion.js';

/* Componente reutilizable de captura. */
/** Construye formularios accesibles y entrega sus valores al manejador de la pantalla. */
function Formulario({ titulo, campos, manejarEnvio, etiqueta = 'Guardar', claveBorrador }) {
  const bloqueado = useTecnoFixStore((state) => state.enviando || state.datosDesactualizados);
  const [borrador] = useState(() => (claveBorrador ? leerEnSesion(claveBorrador) : null));
  /* Captura de valores sin estado duplicado. */
  const manejarFormulario = async (evento) => {
    evento.preventDefault();
    if (bloqueado) return;
    const formulario = evento.currentTarget;
    const datos = Object.fromEntries(new FormData(formulario));
    if ((await manejarEnvio(datos, formulario)) === true && claveBorrador) {
      guardarEnSesion(claveBorrador, null);
    }
  };

  return (
    <form
      onSubmit={manejarFormulario}
      onChange={(evento) => {
        if (claveBorrador) {
          guardarEnSesion(claveBorrador, Object.fromEntries(new FormData(evento.currentTarget)));
        }
      }}
      aria-busy={bloqueado}
    >
      {titulo && <h3>{titulo}</h3>}
      {campos.map((campo) => (
        <label key={campo.nombre}>
          {campo.etiqueta}
          {campo.opciones ? (
            <select
              name={campo.nombre}
              defaultValue={borrador?.[campo.nombre] ?? campo.valor ?? ''}
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
              defaultValue={borrador?.[campo.nombre] ?? campo.valor ?? ''}
              placeholder={campo.placeholder}
              type={campo.tipo || 'text'}
              required={!campo.esOpcional}
              pattern={campo.patron}
              title={campo.ayuda}
              min={campo.tipo === 'number' ? '0' : undefined}
              step={campo.tipo === 'number' ? '0.01' : undefined}
              maxLength="1000"
            />
          )}
        </label>
      ))}
      <button disabled={bloqueado}>{etiqueta}</button>
    </form>
  );
}

export default Formulario;
