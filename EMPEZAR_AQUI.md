# TecnoFix para Aplicaciones Web y VYV

La carpeta del proyecto es `C:\Users\ensbu\Documents\Codex\Proyecto TecnoFix`.

Repositorio: https://github.com/raults32/tecnofix

Para estudiar el código abre [GUIA_PARA_EXPLICAR_EL_CODIGO.md](GUIA_PARA_EXPLICAR_EL_CODIGO.md).

## Arrancarlo con Vite como en clase

Necesitas Node.js 22.12 o posterior. Abre una terminal dentro de la carpeta y ejecuta una vez:

```powershell
npm ci
```

Terminal 1, el servidor que guarda los datos:

```powershell
npm run dev:api
```

Terminal 2, React con Vite:

```powershell
npm run dev
```

Abre **http://127.0.0.1:5173**. Mantén las dos terminales abiertas. Detén cada una con Ctrl+C.

No arranques otra copia contra la misma base si ya tienes una en el puerto 3000. Si `npm start` ya está corriendo desde esta carpeta, puede funcionar como API de Vite y no necesitas otra terminal de API.

## Mostrar la versión compilada

```powershell
npm run build
npm start
```

Abre **http://127.0.0.1:3000**. Aquí Node entrega tanto la página compilada por Vite como la API. `INICIAR.cmd` también arranca esta versión después de compilar.

`npm run preview` muestra la compilación en 4173, pero necesita la API en 3000 igual que el modo de desarrollo.

## Entrar a la demostración

Usuarios: `administrador`, `recepcion` y `tecnico`. Contraseña de prueba de los tres: `Taller2026!`.

Los datos se guardan en `data/base.json`. Esa carpeta no se sube a GitHub. Una instalación nueva crea una base vacía y las tres cuentas demo. El repositorio tampoco guarda `node_modules`, `.env` ni `dist`; esas dependencias y la compilación se generan con los comandos anteriores.

## Qué se tomó de la Pokédex

| En la Pokédex | En TecnoFix |
|---|---|
| `BrowserRouter`, `Routes`, `Route` | Rutas en `src/main.jsx` |
| `Layout.jsx`, `NavLink` y `Outlet` | Menú compartido en `src/Layout.jsx` |
| `Detalle.jsx` y `useParams` | Detalle de una orden por su ID |
| `api/traerPokemones.js` | `api/tecnofix.js` para las consultas HTTP |
| `store/pokemon.js` con Zustand | `store/tecnofix.js` para sesión, datos y avisos |
| Componentes, props, estado y filtros | Se conservan las pantallas y formularios de TecnoFix |

Las reglas de reparación, permisos del servidor, pagos, cotización, reportes e historial se conservaron. El proyecto de la Pokédex se utilizó como referencia de estructura; no fue modificado.

## Revisar que funciona

```powershell
npm test
npm run build
npx --no-install prettier --check src tests vite.config.js index.html
```

## Documentos anteriores

Por indicación del usuario, los reportes, matrices y planes anteriores se conservan sin cambios. El README original también quedó intacto como referencia de la entrega anterior.

Hay información que se tendría que actualizar si después se autoriza: la estructura de archivos de A10, las líneas exactas de la matriz de codificación y la referencia a un repositorio remoto pendiente. A11 y A12 necesitarían identificar esta nueva versión al ejecutar A13 y añadir navegación por URL si se quiere incluirla en las pruebas. Esto no significa que los resultados pendientes ya estén aprobados.

Se mantienen las diferencias documentadas de la versión previa: almacenamiento JSON local, cotización ilustrativa de siete días, importes sin desglose fiscal adicional y ausencia de notificaciones reales. Esta adaptación no corrige ni oculta esas diferencias.
