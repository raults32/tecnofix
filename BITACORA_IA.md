# Bitácora de IA y Diario de Decisiones — TecnoFix

## Bitácora de IA

### Interacción 1 — Primera versión del flujo de taller y prototipos
- **Qué le pedí (prompt):** Implementar el sistema de gestión de taller TecnoFix con base en los requerimientos del taller (clientes, equipos, órdenes con folio, diagnóstico, cotización, autorización, reparación, pagos y entrega) y adaptarlo a las pantallas de Administrador, Recepción y Técnico.
- **Qué me dio (resumen en 1-2 líneas):** Generó la aplicación en React con una API en Node.js y persistencia en `data/base.json`, separando permisos por rol y validando transiciones de estado.
- **Qué estaba mal o me faltó:** La especificación original contemplaba ASP.NET Core / SQL Server, y en la primera versión todo el código estaba concentrado en pocos archivos largos, difícil de recorrer para explicar el flujo completo.
- **Qué corregí o cambié yo:** Documentamos la adaptación a Node.js + JSON como alcance académico y pedimos reorganizar el frontend con React Router y Zustand siguiendo la estructura modular vista en clase.
- **Qué aprendí:** Antes de aceptar código generado, hay que definir la estructura de carpetas y verificar que cada rol tenga sus permisos validados en el servidor, no solo ocultos en la interfaz.

### Interacción 2 — Rutas con React Router, Zustand y modularización
- **Qué le pedí (prompt):** "Organiza el proyecto con React Router (`src/main.jsx`), un store compartido en Zustand (`src/store/tecnofix.js`) y separa el backend por operaciones para ubicar fácilmente dónde vive cada regla."
- **Qué me dio (resumen en 1-2 líneas):** Configuró `BrowserRouter` con `Layout.jsx`, centralizó las llamadas HTTP en `src/api/tecnofix.js` y dividió el backend en `src/backend/operaciones/` y `src/backend/documentos/`.
- **Qué estaba mal o me faltó:** En la primera revisión, Vite y Zustand seguían apuntando a una carpeta anterior y las pantallas `Administracion.jsx`, `Recepcion.jsx` y `Tecnico.jsx` seguían teniendo más de 400 líneas cada una en un solo archivo.
- **Qué corregí o cambié yo:** Verificamos que el proxy `/api` en `vite.config.js` apuntara al servidor local y posteriormente dividimos las pantallas grandes en subcomponentes por vista (`src/pages/administracion/`, `src/pages/recepcion/` y `src/pages/tecnico/`).
- **Qué aprendí:** Modularizar por vista y por dominio (1 pantalla = 1 archivo) hace mucho más fácil ubicar errores y defender la arquitectura del sistema.

### Interacción 3 — PDF de cotización y reportes administrativos
- **Qué le pedí (prompt):** "Genera el PDF de cotización con la identidad de TecnoFix, tabla de partidas (concepto, cantidad, precio unitario e importe) y total en MXN, además del PDF de reportes administrativos sin agregar dependencias externas."
- **Qué me dio (resumen en 1-2 líneas):** Implementó `src/backend/documentos/pdf.js` generando documentos `%PDF-1.4` directamente en Node.js con repetición de encabezados en múltiples páginas.
- **Qué estaba mal o me faltó:** Al probar una orden, la mano de obra salía en `$0` en el PDF porque solo se guardaba desde `Piezas y costos` al pulsar **Generar cotización**, y al correr `npm test` en paralelo con `npm run build` la prueba falló porque `dist/` aún no terminaba de generarse. Además, la lista de usuarios en `Administracion.jsx` fallaba al validar el formato JSON devuelto por la API.
- **Qué corregí o cambié yo:** Rastreé el dato desde `pdf.js` hasta `ordenes.js` para confirmar cuándo se persiste `manoObra`, establecimos ejecutar siempre `npm run build` antes de `npm test`, y corregimos la validación del arreglo JSON en `UsuariosAdmin.jsx` con su prueba en `tests/store.test.js`.
- **Qué aprendí:** Nunca ejecutar pruebas de integración sobre `dist/` mientras Vite sigue compilando, y siempre revisar el tipo de dato real que devuelve la API antes de validarlo en el cliente.

### Interacción 4 — Pagos idempotentes, bitácora de orden y zona horaria
- **Qué le pedí (prompt):** "Evita abonos duplicados si falla la red o se da doble clic al pagar, muestra una bitácora legible en cada orden sin etiquetas técnicas como `pago:` y usa la hora de Tijuana en los reportes."
- **Qué me dio (resumen en 1-2 líneas):** Creó `src/store/pagosPendientes.js` con `idOperacion` de 32 caracteres hexadecimales validado en `ordenes.js`, `BitacoraOrden.jsx` + `historialOrden.js` y `src/utils/fechas.js` con `America/Tijuana`.
- **Qué estaba mal o me faltó:** Faltaba comprobar en pruebas automáticas que un reintento con el mismo `idOperacion` no duplica el cobro, mientras que dos abonos legítimos por la misma cantidad sí se registran.
- **Qué corregí o cambié yo:** Revisamos `tests/store.test.js` y `tests/flujo.test.js` para validar ambos escenarios y agregamos `tests/bitacora.test.js` para órdenes anteriores con notas vacías.
- **Qué aprendí:** En operaciones de pago no basta validar el saldo; hace falta un identificador único por intento (idempotencia) para distinguir un reintento de un segundo abono real.

### Interacción 5 — Validación de casos límite y rutas desconocidas
- **Qué le pedí (prompt):** "Prueba la app con casos límite reales: rutas inválidas, textos de 200 caracteres sin espacios, doble clic rápido, recarga a mitad de formulario y órdenes sin diagnóstico."
- **Qué me dio (resumen en 1-2 líneas):** Ejecutó pruebas sobre la API y en navegador; detectó y corrigió fallos en el servidor y en la interfaz antes de publicar.
- **Qué estaba mal o me faltó:**
  1. `src/server.js` devolvía un JSON crudo `ENOENT` exponiendo la ruta de la computadora al visitar `/ruta-invalida` en lugar de mostrar `NotFound.jsx`.
  2. Desde `Detalle.jsx` se podía entrar a `Cotizaciones` en una orden en `RECIBIDO` sin diagnóstico ni técnico asignado, mostrando una cotización falsa de `$0.00`.
  3. El botón **Enviar a Recepción** en `CotizacionTecnico.jsx` duplicaba entradas en la bitácora al darle doble clic.
  4. Un nombre de 200 caracteres sin espacios aplastaba las columnas `Folio` y `Técnico` en `TablaOrdenes.jsx`.
- **Qué corregí o cambié yo:** Se actualizó `server.js` para servir `dist/index.html` en rutas de página y `404` limpio en recursos faltantes (`/favicon.ico`), se agregaron guardas por estado en `Detalle.jsx` y `Recepcion.jsx`, se hizo idempotente `enviarCotizacion` y se fijó `white-space: nowrap` en columnas cortas de `styles.css`. Se agregaron pruebas de regresión en `tests/flujo.test.js`.
- **Qué aprendí:** Probar manualmente en el navegador con datos extremos y URLs falsas descubre errores reales de experiencia de usuario que las pruebas unitarias del camino feliz no ven.

### Interacción 6 — Preparación para despliegue en Render
- **Qué le pedí (prompt):** "Revisa qué se necesita cambiar para desplegar TecnoFix en Render sin perder datos de demostración si el servidor gratuito se reinicia."
- **Qué me dio (resumen en 1-2 líneas):** Indicó cambiar el enlace de red en `src/server.js` a `0.0.0.0` cuando exista `PORT` y agregó datos semilla iniciales en `src/backend/base.js`.
- **Qué estaba mal o me faltó:** Si la semilla inicial se cargaba siempre, habría roto las aserciones de `tests/flujo.test.js` que esperan iniciar con la base vacía.
- **Qué corregí o cambié yo:** Condicionamos la semilla en `src/backend/base.js` para ejecutarse solo cuando `process.env.DATA_DIR` no está definido (producción/uso normal), manteniendo las pruebas aisladas limpias (`10/10` pasando).
- **Qué aprendí:** Al agregar datos iniciales para demo, siempre hay que aislar el entorno de pruebas (`DATA_DIR`) para no contaminar las pruebas automáticas.

---

## Diario de decisiones

1. **Persistencia en `data/base.json` con escritura atómica (`base.tmp` → `base.json`):**
   - Se eligió Node.js + JSON local en `src/backend/base.js` para que el proyecto sea portable sin instalar motores SQL externos. Escribir primero en `base.tmp` y renombrar con `renameSync` evita que el archivo se corrompa si ocurre un corte durante el guardado.
   - **Límite conocido:** En el plan gratuito de Render el disco es temporal cuando el contenedor se suspende tras 15 min de inactividad; por eso se agregaron 2 órdenes semilla para demostración y en producción se migraría a una base de datos externa.

2. **PDFs generados en Node.js sin paquetes externos (`src/backend/documentos/pdf.js`):**
   - Se armó el estándar `%PDF-1.4` directamente en Node para no depender de binarios pesados (como Chromium/Puppeteer) al desplegar o calificar en otra computadora.

3. **Doble validación (cliente + servidor):**
   - El frontend previene errores comunes (`Formulario.jsx`, bloqueo mientras `enviando` está activo y borradores en `sessionStorage`), mientras que el servidor vuelve a validar tipos, rangos en centavos y transiciones de estado en `src/backend/validaciones.js`, `src/utils/ordenUtils.js` y `src/backend/operaciones/ordenes.js`.
