# TecnoFix explicado sin tanto rollo

Esta guía es para abrir el código junto con el profe y entender qué hace. No necesitas aprenderte cada línea de memoria. Primero ubica **qué entra, qué se hace con eso y qué sale**.

Si te señala un bloque, una forma sencilla de contestar es: “Aquí recibo estos datos, reviso esta condición y después actualizo la pantalla o le pido al servidor que guarde”. Luego señalas las líneas que hacen cada paso.

## 1. Qué es cada parte

- **React** arma las pantallas y las actualiza cuando cambian los datos.
- **Vite** levanta el entorno de desarrollo y prepara la compilación. No guarda clientes ni es nuestra base de datos.
- **React Router** decide qué pantalla mostrar según la dirección del navegador.
- **Zustand** comparte datos de la sesión y del sistema entre componentes.
- **Node.js** ejecuta el servidor que revisa permisos, hace las operaciones y guarda los datos.
- **JSON** es el formato del archivo donde esta versión guarda la información.

En la Pokédex, `fetch` consulta PokeAPI. Aquí consulta nuestra API de TecnoFix. La idea de pedir información es parecida, pero aquí también necesitamos registrar cosas y controlar qué puede hacer cada empleado.

## 2. El camino desde que abres la página

```text
index.html
  → src/main.jsx
  → App.jsx revisa si hay sesión
  → Layout.jsx dibuja menú y cabecera
  → Home.jsx o Detalle.jsx muestra la pantalla
  → api/tecnofix.js manda solicitudes
  → server.js valida y guarda en data/base.json
```

Cuando guardas un formulario, el store vuelve a pedir los datos al servidor y React pinta la información nueva. Lo guardado de verdad está en el servidor; lo del store es la copia que usa la pantalla.

## 3. `index.html` y `main.jsx`: dónde empieza

En [index.html](index.html) está el espacio de React:

```html
<div id="root"></div>
```

En [src/main.jsx](src/main.jsx) usamos `createRoot(document.getElementById('root'))`. Eso encuentra ese espacio y monta la aplicación ahí.

**Si te pregunta por JSX:** se parece a HTML, pero está dentro de JavaScript. Por ejemplo, `<Home />` significa que React debe mostrar el componente `Home`. Las llaves, como `{usuario.nombre}`, sirven para meter un valor de JavaScript en la pantalla.

**`StrictMode`:** ayuda a detectar problemas mientras desarrollamos. En desarrollo puede volver a ejecutar ciertos efectos; por eso la recuperación de sesión comparte una sola consulta pendiente. No significa que el sistema deba registrar dos veces una orden.

## 4. Las rutas: igual que en la Pokédex

En [src/main.jsx](src/main.jsx) aparece este bloque real:

```jsx
<Route path="dashboard" element={<Layout />}>
  <Route index element={<Home />} />
```

Se lee así: “Cuando la dirección sea `/dashboard`, muestra el marco `Layout`. Si no viene otra sección, coloca `Home` adentro”.

También está:

```jsx
<Route path="detalle/:id" element={<Detalle />} />
```

El `:id` es una parte variable. En la Pokédex puede ser el ID de un Pokémon; aquí es el de una orden. Por ejemplo, `/dashboard/detalle/abc123` permite consultar la orden `abc123` si el usuario tiene acceso a ella.

Las otras rutas muestran asignación, reportes, usuarios, historial, recepción, cotizaciones, entregas y las pantallas del técnico. `:id?` significa que ese identificador es opcional: puedes entrar a la pantalla y después elegir la orden.

**`Navigate`:** redirige a otra ruta. **`NotFound`:** muestra un aviso si la ruta no corresponde a una pantalla conocida.

## 5. `Layout.jsx`: lo que se repite

[src/Layout.jsx](src/Layout.jsx) contiene el menú lateral, el nombre de TecnoFix, la cabecera, los mensajes y el pie. Así no copiamos todo eso en cada pantalla.

```jsx
<Outlet context={propiedades} />
```

`Outlet` es el espacio donde se mete la página hija de la ruta. `context={propiedades}` comparte los datos y funciones con esa página. En `Home` los recibimos con `useOutletContext()`.

**Si te pregunta por `NavLink`:** es un enlace que también sabe si su ruta está activa. Lo usamos para pintar la opción seleccionada del menú. A diferencia de un botón que solo cambia una variable, ahora también cambia la URL y puedes usar Atrás o recargar.

**`useNavigate`:** permite cambiar de ruta desde una función, por ejemplo después de guardar un diagnóstico. **`useLocation`:** permite saber en qué dirección estamos.

Las opciones del menú están en [src/config/navegacion.js](src/config/navegacion.js). Cambian según el rol. Esto organiza la pantalla, pero los permisos importantes también se revisan en el servidor.

## 6. `Detalle.jsx`: qué hace `useParams`

En [src/Detalle.jsx](src/Detalle.jsx):

```jsx
const { id } = useParams();
const orden = datos.ordenes.find((elemento) => elemento.id === id);
```

La primera línea saca el ID de la dirección. La segunda busca en las órdenes disponibles una que tenga ese ID.

`find` devuelve **un elemento**, no una lista. Si no encuentra la orden, mostramos un aviso. El navegador no recibe por eso permiso para ver órdenes ajenas: el servidor ya limita la información que le entrega al usuario.

## 7. `App.jsx`: revisar si alguien ya inició sesión

[src/App.jsx](src/App.jsx) obtiene el usuario del store y llama a `recuperarSesion` dentro de `useEffect`.

```jsx
useEffect(() => {
  recuperarSesion();
}, [recuperarSesion]);
```

**`useEffect`** sirve para hacer algo después del render, como consultar una sesión existente. No hacemos esa consulta directamente cada vez que la función del componente vuelve a ejecutarse.

Si estamos cargando, aparece un aviso. Si no hay usuario, se muestra el formulario de acceso. Si sí hay usuario, se muestran las rutas mediante `Outlet`.

Elegir “Administrador”, “Recepción” o “Técnico” en la pantalla de acceso solo cambia la presentación y el usuario sugerido. No te da permisos. El servidor revisa la cuenta y devuelve el rol real.

## 8. Zustand: la cajita de datos compartidos

Abre [src/store/tecnofix.js](src/store/tecnofix.js). La idea es la misma que `store/pokemon.js`:

```js
export const useTecnoFixStore = create((set, get) => ({
```

- `create` construye el store.
- `set` actualiza datos del store.
- `get` lee el estado actual desde una función del store.

Guardamos `usuario`, `datos`, `mensaje`, `esError` y el estado de carga. También guardamos funciones para consultar sesión, realizar operaciones y salir.

```js
const usuario = useTecnoFixStore((state) => state.usuario);
```

Eso significa: “De todo el store, este componente necesita el usuario”. Cuando cambia ese dato, el componente puede actualizarse.

**Ojo:** Zustand no es la base de datos. Al recargar la pestaña, esa memoria se vuelve a crear. Recuperamos la sesión con la cookie y pedimos otra vez los datos al servidor.

`consultaSesion` evita mandar dos solicitudes iguales al arrancar en `StrictMode`. Se comparte la promesa mientras está pendiente. No guarda la contraseña ni reemplaza al servidor.

## 9. `useState`: datos que solo necesita una pantalla

En [src/Layout.jsx](src/Layout.jsx):

```js
const [busqueda, setBusqueda] = useState('');
```

`busqueda` es el texto actual y `setBusqueda` lo cambia. Usamos `useState` para filtros o selecciones que pertenecen a la interfaz. El usuario y los datos que comparten varias pantallas van en Zustand.

En `Tecnico.jsx`, las piezas que estás editando también tienen estado local. Agregar una pieza a la lista de la pantalla todavía no equivale a guardarla en el servidor: hay que confirmar la operación.

## 10. La API y `fetch`

En [src/api/tecnofix.js](src/api/tecnofix.js) está `solicitar`. Es el equivalente a separar las consultas en `api/traerPokemones.js`.

```js
const respuesta = await fetch(`/api/${ruta}`, {
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: datos ? JSON.stringify(datos) : undefined,
});
```

`fetch` manda la solicitud. `GET` pide datos y `POST` manda una operación con datos. `JSON.stringify` convierte un objeto de JavaScript a texto JSON para enviarlo. `respuesta.json()` hace la conversión contraria al recibir.

`async` permite usar `await`. `await` espera el resultado de esa operación sin bloquear toda la interfaz. No garantiza que la solicitud salga bien; por eso usamos `try/catch` y revisamos `respuesta.ok`.

La sesión viaja mediante una cookie del mismo origen. No guardamos el token en `localStorage`. En desarrollo, el proxy de Vite permite que `/api` llegue al servidor Node.

El archivo anterior [src/services/apiService.js](src/services/apiService.js) quedó como puente para no romper los imports de las pantallas existentes. Reexporta la misma función.

## 11. Qué pasa cuando das Guardar

En [src/components/Formulario.jsx](src/components/Formulario.jsx):

```js
evento.preventDefault();
const datos = Object.fromEntries(new FormData(evento.currentTarget));
manejarEnvio(datos, evento.currentTarget);
```

1. `preventDefault` evita que el formulario recargue la página como un formulario HTML tradicional.
2. `FormData` recoge los valores de los campos usando su atributo `name`.
3. `Object.fromEntries` los convierte a un objeto normal.
4. `manejarEnvio` llama a la función que recibió este formulario por props.

**Props** son datos o funciones que un componente le pasa a otro. Este formulario se reutiliza porque no tiene escrita una operación fija: recibe sus campos y la función que debe ejecutar.

En el store, `manejarOperacion` manda el POST, vuelve a pedir los datos y muestra un mensaje. Si todo sale bien, puede limpiar el formulario. Si falla, conserva los datos que ya se tenían y muestra el error.

## 12. `map`, `filter`, `find` y `reduce`

Estas cuatro salen mucho y vale la pena reconocerlas:

| Función | Explicación sencilla | Ejemplo de TecnoFix |
|---|---|---|
| `map` | Recorro una lista y transformo cada elemento. | Una orden se convierte en una fila de la tabla. |
| `filter` | Me quedo con los que cumplen una condición. | Órdenes que coinciden con la búsqueda o el estado. |
| `find` | Encuentro el primer elemento que cumple. | La orden cuyo ID viene en la URL. |
| `reduce` | Acumulo un resultado al recorrer la lista. | La suma de costos de las piezas. |

En [src/Home.jsx](src/Home.jsx), la búsqueda junta folio, cliente, serie, teléfono y equipo. Los pasa a minúsculas y usa `includes` para buscar sin importar mayúsculas. Es una idea muy parecida al buscador de Pokémon.

`key={orden.id}` le ayuda a React a identificar cada fila al actualizar la lista. No es un permiso ni una contraseña.

## 13. Las pantallas del negocio

- [Recepcion.jsx](src/pages/Recepcion.jsx): selecciona o registra cliente y equipo, crea la orden, registra la decisión de cotización y maneja pagos y entrega.
- [Tecnico.jsx](src/pages/Tecnico.jsx): diagnóstico, pruebas de hardware, piezas, mano de obra, cotización y reparación.
- [Administracion.jsx](src/pages/Administracion.jsx): indicadores, asignación, reportes y empleados.
- [Historial.jsx](src/pages/Historial.jsx): busca los servicios por cliente o equipo.
- [TablaOrdenes.jsx](src/components/TablaOrdenes.jsx): reutiliza la presentación de órdenes y avisa qué orden se abrió.

Se conservaron sus funciones durante la adaptación. `Home.jsx` decide cuál mostrar según la sección. Cambiar la organización del código no significa que el backend se haya convertido en PokeAPI ni que se hayan quitado pagos o reportes.

## 14. El servidor y el archivo JSON

Abre [src/server.js](src/server.js). `http.createServer` recibe solicitudes y decide qué hacer según la ruta y el método.

En cada operación se lee `data/base.json`, se revisa la sesión y se valida qué puede hacer el usuario. Si los datos cumplen, se modifica el objeto y se guarda.

```js
writeFileSync(`${DIRECTORIO}/base.tmp`, JSON.stringify(base, null, 2));
renameSync(`${DIRECTORIO}/base.tmp`, `${DIRECTORIO}/base.json`);
```

Primero escribe un archivo temporal y luego lo cambia por el principal. Eso ayuda a no dejar el archivo principal a medio escribir. No convierte JSON en SQL Server ni vuelve segura cualquier combinación de procesos: esta versión está pensada para un solo servidor local.

`randomUUID` genera identificadores. El folio visible de la orden es otra cosa: es el código con año y consecutivo que consulta el taller.

## 15. Por qué validar también en Node

El campo `required` ayuda a no enviar formularios vacíos, pero alguien podría mandar una petición por fuera de la pantalla. Por eso el servidor también revisa campos, costos y permisos.

La función `exigir` hace esto:

```js
if (!condicion) {
  throw new Error(mensaje);
}
```

Si la condición no se cumple, se detiene la operación y se informa el problema. El `catch` del servidor convierte ese error en una respuesta JSON que la interfaz puede mostrar.

## 16. Contraseñas, cookies y `Map`

No guardamos la contraseña tal cual. `scryptSync` calcula un hash con una sal aleatoria. Al entrar, calculamos el hash de la contraseña capturada con esa sal y lo comparamos con el registrado. Un hash no se “descifra” para recuperar la contraseña.

`SESIONES` es un `Map`: relaciona el token de sesión con una cuenta y su vencimiento. `INTENTOS` cuenta fallos y bloquea temporalmente. Ambos viven en memoria, así que se pierden al reiniciar el servidor.

La cookie es `HttpOnly`: el JavaScript de la página no puede leerla mediante `document.cookie`. El navegador sí la envía en las solicitudes correspondientes. El servidor revisa la cuenta activa y su rol antes de permitir las operaciones.

## 17. Los estados de una reparación

En [src/utils/ordenUtils.js](src/utils/ordenUtils.js) está el mapa de transiciones:

```js
RECIBIDO: ['EN_DIAGNOSTICO', 'CANCELADO'],
EN_DIAGNOSTICO: ['EN_REPARACION', 'CANCELADO'],
EN_REPARACION: ['LISTO'],
LISTO: ['ENTREGADO'],
ENTREGADO: [],
CANCELADO: [],
```

Cada estado tiene una lista de siguientes estados permitidos. Una lista vacía significa que ya no debe avanzar. Además se revisa el rol, la asignación, el diagnóstico, la autorización y la reparación. El servidor comprueba el pago antes de entregar.

“Esperando aprobación” es una etiqueta que calcula `obtenerEstado` en `vistaUtils.js`; no añade otro estado guardado a esta lista.

## 18. El dinero

`calcularCosto` convierte entradas a número, rechaza negativos o valores inválidos y calcula con centavos.

```js
return importes.reduce((total, importe) => total + Math.round(importe * 100), 0) / 100;
```

Multiplica por 100, redondea a centavos enteros, suma y al final divide entre 100. Esto evita ciertos errores de decimales de JavaScript. `Intl.NumberFormat` solo presenta el resultado como moneda; no calcula impuestos ni cambia lo guardado.

## 19. Cómo salen el PDF y los reportes

`generarReporte` filtra por periodo, cuenta estados, suma importes de órdenes concluidas y calcula atendidas y promedio por técnico. `crearPdf` arma un PDF básico con líneas de texto y páginas. No usa un servicio externo.

Si el profe señala `crearPdf`, puedes decir: “Esta parte prepara los objetos de páginas y contenido, escribe dónde empieza cada objeto y devuelve los bytes del archivo. El navegador lo recibe con tipo `application/pdf`”. No necesitas confundir eso con un componente React: sucede en Node.

La cotización actual tiene siete días ilustrativos y no desglosa IVA. Los reportes se filtran por fecha de recepción en UTC. Estas limitaciones ya existían y no cambiaron con Router o Zustand.

## 20. `vite.config.js`: por qué hay proxy

Durante desarrollo hay dos servidores: Vite en 5173 y Node en 3000. En [vite.config.js](vite.config.js), las peticiones que empiezan por `/api` se pasan a Node.

`changeOrigin: false` conserva el encabezado Host que necesita nuestra comprobación de Origin. No desactivamos esa validación para que funcione Vite. `API_TARGET` sirve para apuntar a otro puerto cuando probamos una copia aislada.

`plugins: [react()]` activa la integración de React y la actualización de componentes durante desarrollo. `npm run build` genera `dist`; después Node sirve esa carpeta.

En `server.js` hay una condición para `/dashboard` y sus subrutas: devuelve `index.html` para que React Router encuentre la página al pegar una URL o recargarla. Las peticiones de API siguen siendo peticiones de API y no se convierten en HTML.

## 21. Símbolos que pueden preguntarte

- `{ nombre } = objeto`: sacar una propiedad del objeto; se llama desestructuración.
- `{ ...valores, accion: 'pago' }`: copiar propiedades y agregar una. No modifica el objeto original por sí solo.
- `condicion ? valor1 : valor2`: escoger un valor según una condición.
- `condicion && <Pantalla />`: mostrar algo solo si la condición se cumple.
- `usuario?.rol`: leer el rol solo si existe el usuario.
- `formulario?.reset()`: limpiar el formulario solo si nos pasaron uno.
- `===`: comparar valor y tipo sin hacer conversión automática.
- `return`: devolver un resultado o la parte de pantalla que debe mostrar el componente.
- `export` / `import`: permitir usar algo desde otro archivo y traerlo donde se necesita.

## 22. Preguntas rápidas para practicar

**¿Dónde están las rutas?** En `src/main.jsx`.

**¿Qué hace Outlet?** Coloca la pantalla hija dentro del marco común.

**¿Cómo sabes qué orden mostrar?** Con el ID de la URL y `find` sobre las órdenes disponibles.

**¿Por qué Zustand y también useState?** Zustand comparte sesión y datos; useState maneja ediciones o filtros de una pantalla.

**¿Vite guarda los clientes?** No. Vite ayuda a desarrollar y compilar; Node los guarda en el JSON.

**¿Basta con esconder el botón de Administrador?** No. Node también revisa los permisos.

**¿Qué ocurre cuando guardas?** El formulario captura, la API manda el POST, Node valida/guarda y el store recarga los datos.

**¿Qué se tomó de la Pokédex?** Rutas, Layout/Outlet, detalle por ID, consultas en api y estado compartido con Zustand. Las reglas de reparación son de TecnoFix.

**¿Qué pruebas hay?** Reglas de costos/estados, flujo HTTP con permisos/PDF/reportes/persistencia, recuperación de rutas y comportamiento del store. Son pruebas técnicas; no reemplazan los resultados reales pendientes de A13.

## Orden recomendado para repasarlo

Primero abre `main.jsx`, `Layout.jsx`, `Detalle.jsx`, `store/tecnofix.js` y `api/tecnofix.js`. Luego sigue un formulario de Recepción hasta `server.js`. Al final revisa una regla de estados y una suma de costos. Con ese recorrido puedes conectar lo que ves en pantalla con lo que hace el código.

Referencias de las herramientas: [rutas de React Router](https://reactrouter.com/start/declarative/routing), [Zustand](https://github.com/pmndrs/zustand) y [proxy de Vite](https://vite.dev/config/server-options.html#server-proxy).
