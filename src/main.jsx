import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import App from './App.jsx';
import Layout from './Layout.jsx';
import Home from './Home.jsx';
import Detalle from './Detalle.jsx';
import NotFound from './NotFound.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Layout />}>
            <Route index element={<Home />} />
            {[
              'asignar',
              'reportes',
              'usuarios',
              'historial',
              'nueva',
              'cotizaciones',
              'entregas',
            ].map((ruta) => (
              <Route key={ruta} path={ruta} element={<Home />} />
            ))}
            {['diagnostico', 'piezas', 'cotizacion', 'reparacion'].map((ruta) => (
              <Route key={ruta} path={`${ruta}/:id?`} element={<Home />} />
            ))}
            <Route path="detalle/:id" element={<Detalle />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
