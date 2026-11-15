import { create } from 'zustand';
import { solicitar } from '../api/tecnofix.js';

const datosVacios = () => ({ clientes: [], equipos: [], ordenes: [], tecnicos: [] });
let consultaSesion;

// Compartimos sesión y datos, como usePokemonStore. La base real sigue en el servidor.
export const useTecnoFixStore = create((set, get) => ({
  usuario: null,
  datos: datosVacios(),
  mensaje: '',
  esError: false,
  cargando: true,
  inicializada: false,
  limpiarAviso: () => set({ mensaje: '', esError: false }),
  manejarError: (error) => set({ mensaje: error.message, esError: true }),

  recuperarSesion: () => {
    if (get().inicializada) return Promise.resolve();
    // StrictMode puede ejecutar el efecto dos veces; compartimos una sola consulta.
    if (!consultaSesion) {
      consultaSesion = (async () => {
        try {
          const resultado = await solicitar('sesion');
          const datos = resultado.usuario ? await solicitar('datos') : datosVacios();
          set({ usuario: resultado.usuario || null, datos });
        } catch (error) {
          set({ mensaje: error.message, esError: true });
        } finally {
          set({ cargando: false, inicializada: true });
        }
      })().finally(() => {
        consultaSesion = undefined;
      });
    }
    return consultaSesion;
  },

  manejarOperacion: async (ruta, valores, formulario) => {
    try {
      const resultado = await solicitar(ruta, 'POST', valores);
      // Se conserva la sesión aunque la recarga posterior de datos falle.
      if (ruta === 'login') set({ usuario: resultado.usuario });
      const datos = await solicitar('datos');
      set({ datos, mensaje: 'Operación completada correctamente.', esError: false });
      formulario?.reset();
      return true;
    } catch (error) {
      set({ mensaje: error.message, esError: true });
      return false;
    }
  },

  cerrarSesion: async () => {
    try {
      await solicitar('logout', 'POST', {});
      set({ usuario: null, datos: datosVacios(), mensaje: '', esError: false });
      return true;
    } catch (error) {
      set({ mensaje: error.message, esError: true });
      return false;
    }
  },
}));
