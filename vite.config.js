import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ServerResponse } from 'node:http';

const proxyApi = {
  '/api': {
    target: process.env.API_TARGET || 'http://127.0.0.1:3000',
    // Conserva Host para que la API valide Origin en desarrollo.
    changeOrigin: false,
    configure(proxy) {
      proxy.on('error', (_error, _peticion, respuesta) => {
        if (
          respuesta instanceof ServerResponse &&
          !respuesta.headersSent &&
          !respuesta.writableEnded
        ) {
          respuesta.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
          respuesta.end(
            JSON.stringify({
              error:
                'La API de TecnoFix no está disponible. Inicia el servidor e intenta de nuevo.',
            }),
          );
        }
      });
    },
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: proxyApi,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    proxy: proxyApi,
  },
});
