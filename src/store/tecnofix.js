import { create } from 'zustand';
import { solicitar } from '../api/tecnofix.js';
import { borrarBorradores } from '../utils/almacenSesion.js';
import { borrarPagoPendiente, prepararPago } from './pagosPendientes.js';

const datosVacios = () => ({ clientes: [], equipos: [], ordenes: [], tecnicos: [] });
const sesionVacia = () => ({ usuario: null, datos: datosVacios(), datosDesactualizados: false });
let consultaSesion;

async function consultarDatos() {
  const datos = await solicitar('datos');
  if (!Object.keys(datosVacios()).every((campo) => Array.isArray(datos[campo]))) {
    throw new Error('No se pudieron leer los datos del taller. Intenta actualizar.');
  }
  return datos;
}

// Compartimos sesión y datos, como usePokemonStore. La base real sigue en el servidor.
export const useTecnoFixStore = create((set, get) => ({
  ...sesionVacia(),
  mensaje: '',
  esError: false,
  cargando: true,
  inicializada: false,
  enviando: false,
  limpiarAviso: () => {
    if (!get().datosDesactualizados) set({ mensaje: '', esError: false });
  },
  manejarError: (error) => set({ mensaje: error.message, esError: true }),

  recuperarSesion: () => {
    if (get().inicializada) return Promise.resolve();
    // StrictMode puede ejecutar el efecto dos veces; compartimos una sola consulta.
    if (!consultaSesion) {
      consultaSesion = (async () => {
        let sesionConsultada = false;
        set({ cargando: true });
        try {
          const resultado = await solicitar('sesion');
          sesionConsultada = true;
          set({ usuario: resultado.usuario || null, mensaje: '', esError: false });
          if (resultado.usuario) set({ datos: await consultarDatos() });
        } catch (error) {
          set({
            mensaje: error.message,
            esError: true,
            datosDesactualizados: Boolean(get().usuario),
          });
        } finally {
          set({ cargando: false, inicializada: sesionConsultada });
        }
      })().finally(() => {
        consultaSesion = undefined;
      });
    }
    return consultaSesion;
  },

  manejarOperacion: async (ruta, valores, formulario) => {
    if (get().enviando || get().datosDesactualizados) return false;
    const usuarioPago = get().usuario?.id;
    const esPago = valores?.accion === 'pago';
    let pago;
    set({ enviando: true });
    try {
      if (esPago) pago = prepararPago(usuarioPago, ruta, valores);
      const resultado = await solicitar(ruta, 'POST', pago ? { ...valores, ...pago } : valores);
      if (ruta === 'login') {
        if (!resultado.usuario?.id || !resultado.usuario.rol) {
          throw new Error('No se pudo confirmar el inicio de sesión. Intenta de nuevo.');
        }
        set({ usuario: resultado.usuario, inicializada: true });
      } else if (resultado.correcto !== true) {
        throw new Error('No se pudo confirmar la operación.');
      }
      if (pago) borrarPagoPendiente(usuarioPago, ruta);
      formulario?.reset();
      try {
        set({
          datos: await consultarDatos(),
          mensaje: 'Operación completada correctamente.',
          esError: false,
        });
      } catch {
        set({
          datosDesactualizados: true,
          mensaje: ruta === 'login' ? 'Sesión iniciada.' : 'El servidor confirmó el guardado.',
          esError: false,
        });
      }
      return true;
    } catch (error) {
      const rechazado =
        error.estado >= 400 && error.estado < 500 && ![401, 408].includes(error.estado);
      if (pago && rechazado) borrarPagoPendiente(usuarioPago, ruta);
      if (error.estado === 401) set(sesionVacia());
      set({
        mensaje:
          pago && !rechazado
            ? `${error.message} Si ya recibiste el dinero, reintenta con el mismo monto y método.`
            : error.message,
        esError: true,
      });
      return false;
    } finally {
      set({ enviando: false });
    }
  },

  actualizarDatos: async () => {
    if (get().enviando) return false;
    set({ enviando: true });
    try {
      const datos = await consultarDatos();
      set({ datos, datosDesactualizados: false, mensaje: 'Datos actualizados.', esError: false });
      return true;
    } catch (error) {
      if (error.estado === 401) set(sesionVacia());
      set({ mensaje: error.message, esError: true });
      return false;
    } finally {
      set({ enviando: false });
    }
  },

  cerrarSesion: async () => {
    if (get().enviando) return false;
    set({ enviando: true });
    try {
      await solicitar('logout', 'POST', {});
    } catch (error) {
      if (error.estado !== 401) {
        set({ mensaje: error.message, esError: true });
        return false;
      }
    } finally {
      set({ enviando: false });
    }
    borrarBorradores(get().usuario?.id);
    set({ ...sesionVacia(), mensaje: '', esError: false });
    return true;
  },
}));
