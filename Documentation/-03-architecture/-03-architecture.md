# 03 — Arquitectura hexagonal y plan de migración

Cómo está organizado el código, qué va en cada carpeta, cómo se conectan las piezas y en qué fase va la migración desde el archivo único `app.js` (partido en módulos el 2026-10-08, ver [sección 10](#10-partición-de-la-interfaz-2026-10-08)).

## 1. Por qué

Hasta ahora todo el sistema vivía en un solo `app.js` de ~8.000 líneas donde se mezclaban, a veces en la misma función, tres cosas:

- **reglas del negocio** (cuánto efectivo debe haber en el cajón, qué lote sale primero, qué número de factura sigue);
- **interfaz** (el HTML de cada pantalla, los botones, los avisos);
- **infraestructura** (Firebase, `localStorage`, impresión).

Con arquitectura hexagonal (*puertos y adaptadores*) las reglas quedan en un **núcleo** que no sabe nada de Firebase ni del HTML. Ventajas concretas para este proyecto:

- **Revisar es más fácil**: un cambio en la fórmula de la caja está en `src/dominio/caja.js` (31 líneas), no perdido entre pantallas.
- **Las reglas se prueban en milisegundos**, sin navegador ni base de datos (`npm test`).
- **Cambiar de tecnología no toca las reglas**: el inicio de sesión con Firebase (S1, Plan B) será un adaptador nuevo; mañana podría ser otra base de datos.

## 2. La regla de dependencias

```
            ┌───────────────────────────────────────────────┐
            │  adaptadores/entrada/ui   (pantallas, eventos) │
            └──────────────────────┬────────────────────────┘
                                   │ usa
            ┌──────────────────────▼────────────────────────┐
            │  aplicacion/   casos de uso + PUERTOS          │
            └──────────┬───────────────────────────┬────────┘
                       │ usa                       │ define el contrato que cumplen
            ┌──────────▼──────────┐     ┌──────────▼────────────────────────┐
            │  dominio/  (reglas) │     │ adaptadores/salida (Firebase, …)   │
            └─────────────────────┘     └────────────────────────────────────┘
```

| Capa | Puede importar | NO puede importar |
|---|---|---|
| `dominio/` | Solo otros archivos de `dominio/` | `window`, `document`, Firebase, `localStorage`, HTML, adaptadores |
| `aplicacion/` | `dominio/` y los puertos | Adaptadores concretos (los recibe ya creados) |
| `adaptadores/salida/` | Su tecnología (Firebase, `localStorage`…) y los puertos que implementa | La interfaz |
| `adaptadores/entrada/` | `aplicacion/`, `dominio/` | Adaptadores de salida directamente (los recibe por el arranque) |
| `arranque.js` | Todo | — (es el único que conoce todas las piezas) |

Si una regla del negocio necesita un dato externo (la fecha de hoy, un id nuevo, una sal aleatoria), lo **recibe como parámetro**; no lo busca.

## 3. Estructura

```
index.html                          Página única + estilos. Carga src/arranque.js
firebase-config.js, logo.js         Configuración y logo (scripts clásicos)
src/
  arranque.js                       RAÍZ DE COMPOSICIÓN: crea adaptadores, verifica puertos, publica el puente, carga la UI
  dominio/                          NÚCLEO: reglas puras, probadas con npm test
    fechas.js                       fecha local, jornada, días hasta / desde
    pagos.js                        pago dividido, reparto, método, liquidación del cobro (cambio)
    caja.js                         caja abierta por sucursal, movimientos, efectivo esperado, liquidación del cierre
    inventario.js                   lotes FEFO, cambio de stock, combos, requerimientos, faltantes
    facturas.js                     consecutivo: número, mayor, formato, elección
    contrasenas.js                  SHA-256, hash con sal, verificación, migración
    cuentas.js                      S1: clave del índice login/, correo interno, perfiles, estado de la migración
    permisos.js                     roles, pantallas y acciones por rol; ¿puede este usuario…?; sucursales permitidas
    negocio.js                      perfiles por tipo de negocio, planes, ventanas por plan, inventario (F12), sucursales
    gastos.js                       conceptos de gasto sin repetidos (mayúsculas, tildes, espacios)
    ventas.js                       estadísticas por producto y persona (por id) y resumen de ventas del panel (R1)
  aplicacion/
    puertos/datos.js                PUERTO DE SALIDA de datos: contrato + verificación al arrancar
    puertos/cuentas.js              PUERTO DE SALIDA de cuentas (S1): autenticar y administrar cuentas
    servicios/sesion.js             CASO DE USO: inicio de sesión + migración automática de cuentas viejas (S1)
  adaptadores/
    salida/
      firebase-datos.js             Implementa el puerto de datos: Firebase + respaldo local, sync por registro, transacciones,
                                    negocios_r y usuarios por negocio (S1)
      firebase-cuentas.js           Implementa el puerto de cuentas: Firebase Authentication + login/ + perfiles/
      almacen-local.js              localStorage con prefijo ws_
      cripto-navegador.js           ids y sales aleatorias
    entrada/ui/                     INTERFAZ (scripts clásicos, globales para los onclick)
      manifiesto.js                 Lista y ORDEN de carga de los archivos de abajo + VERSION_UI
      puente-legado.js              PUENTE TEMPORAL: publica dominio, datos y cuentas con los nombres de siempre
      nucleo/                       estado, permisos, componentes (modales, avisos, iconos), sonidos, tema,
                                    tablas en celular, navegación/render, arranque de la interfaz
      usuarios/                     sesión (login), cuentas S1, auditoría, usuarios (super-admin y negocio), migración de cuentas
      super-admin/                  panel, administradores, negocios, demos, informe mensual
      ventas/                       nueva venta, cuentas abiertas, pedidos, cobro (pago dividido, anular, editar)
      caja/  cocina/  citas/        caja · comanda, KDS, tiempos · agenda
      inventario/                   motor de inventario, catálogo, combos, insumos, conteo
      clientes/  reportes/  gastos/ clientes y domicilios · dashboard, reportes, historial · contable y gastos
      configuracion/  impresion/    configuración (super-admin) y Mi Negocio · facturas, reportes impresos, reimpresiones
tests/
  dominio/                          Pruebas del núcleo (npm test)
  aplicacion/sesion.test.mjs        Servicio de sesión con dobles de los puertos (npm test)
  ui/estructura.test.mjs            Interfaz partida: nombres repetidos, identificadores sin declarar, onclick rotos (npm test)
  reglas/                           Reglas de la base en el emulador (npm run test:firebase)
  integracion/                      Migración S1 con los adaptadores reales en los emuladores (npm run test:firebase)
  navegador/                        La interfaz real en Chrome sin ventana: S1 y recorrido de TODAS las pantallas (npm run test:firebase)
scripts/                            emulador.mjs, probar-firebase.mjs, preparar-pruebas.mjs (ver -00), mapa-interfaz.mjs
database.rules.json                 Reglas finales (cerradas) · database.rules.transicion.json: durante la migración
firebase.json, firebase.transicion.json, .firebaserc   Configuración de la CLI (solo alias "pruebas")
```

## 4. Cómo se conectan (flujo de una venta cobrada)

1. **Adaptador de entrada** — el cajero pulsa "Confirmar cobro"; `abrirCobro` (en `ui/ventas/cobro.js`) lee los montos del formulario.
2. **Dominio** — `pagos.liquidarCobro`, `caja.efectivoEsperado`, `inventario.requerimientos` / `aplicarCambioStock` deciden: si alcanza, cuánto es el cambio, qué sale del inventario y de qué lote.
3. **Puerto de salida** — la interfaz pide "guarda esta venta" y "resta este stock" (`Datos.guardar`, `Datos.modificarRegistro`), sin saber cómo.
4. **Adaptador de salida** — `firebase-datos.js` lo traduce a Firebase: sube solo los campos cambiados, usa una transacción para el stock y guarda la copia local.
5. **Efecto** — la venta queda en la nube y los demás equipos la reciben.

El arranque (`arranque.js`) es el que crea `firebase-datos.js`, verifica que cumple `puertos/datos.js` y se lo entrega a la interfaz: es el "endpoint" del documento de arquitectura.

## 5. El puente de migración (temporal)

La interfaz (`src/adaptadores/entrada/ui/`, antes `app.js`) sigue siendo un conjunto de scripts clásicos con cientos de `onclick="cobrarPedido('…')"` que llaman funciones por nombre global. Para no reescribir todo de una vez:

- `puente-legado.js` publica en `window` el dominio y el adaptador **con los nombres que la interfaz ya usa** (`misDatos`, `guardarMisDatos`, `pagosDe`, `cajaDe`…). También publica los espacios de nombres explícitos `Datos`, `Dominio` y `Cripto`, que es lo que debe usar el código nuevo.
- La interfaz **no debe declarar** funciones con esos nombres: las taparía y volvería a usar código viejo. `tests/ui/estructura.test.mjs` lo verifica en cada `npm test`.
- Cada fase saca los casos de uso de un grupo de pantallas a `src/aplicacion/` y convierte esos archivos en módulos; los nombres que ya no se necesiten se borran del puente. En la última fase el puente y los scripts clásicos desaparecen.

Equivalencias de los nombres de siempre:

| Nombre que usa la interfaz | Ahora vive en |
|---|---|
| `DB.get/DB.set`, `misDatos`, `datosDe`, `claveDe` | `Datos` (`adaptadores/salida/firebase-datos.js`) |
| `guardarMisDatos`, `eliminarMisDatos` | `Datos.guardar`, `Datos.eliminar` |
| `cambiarStock`, `transaccionUnica` | `Datos.modificarRegistro`, `Datos.transaccionUnica` |
| `sincronizarNegocio/Todo`, `detenerSinc…`, `limpiarDatosAjenos`, `refrescarDeLaNube` (datos) | `Datos.*`, `Datos.recargar` |
| `fechaLocal`, `today`, `jornadaDe`, `mesDeJornada`, `jornadaCierre`, `diasHasta`, `diasDesde` | `Dominio.fechas` |
| `pagosDe`, `reparte`, `metodoPrincipal`, `metodoTexto`, `sumaPorMetodo`, `efectivoRecibido`, `tercerosNoEfectivo`, `bancoPendiente` | `Dominio.pagos` |
| `cajaDe`, `efectivoEsperado` | `Dominio.caja` |
| `ordenarLotes`, `sumaLotes`, `descontarDeLotes`, `difRequerimientos`, `esCombo` | `Dominio.inventario` |
| `requerimientos`, `faltantesPara`, `disponiblesCombo`, `faltantesParaAgregar`, `precioSuelto`, `lotesAlerta`, `reingresarALotes` | Envolturas en la interfaz que llaman a `Dominio.inventario` con los datos del negocio |
| `verificarPass`, `hashPass`, `sha256Hex` | `Dominio.contrasenas` (`ponerPass` es envoltura en `ui/usuarios/sesion.js` con `Cripto.nuevaSal`) |
| `uid` | `Cripto.nuevoId` |
| `ROLES`, `PANTALLAS_POR_ROL`, `ACCIONES`, `PERMISOS_POR_ROL` | `Dominio.permisos` (`tienePermiso`, `puedeVerSucursal` son envolturas en `ui/nucleo/permisos.js`) |
| `PERFILES`, `PLANES`, `planDe`, `VENTANAS_POR_PLAN`, `inventarioHabilitado`, `sucursalesDe`, `usaSucursales` | `Dominio.negocio` (`usaInventario`, `diasAvisoVence` son envolturas) |
| `CONCEPTOS_BASE`, `normConcepto`, `claveConcepto` | `Dominio.gastos` (`getConceptosGasto`, `acumConcepto` son envolturas en `ui/gastos/gastos.js`) |
| (nuevo, S1) inicio de sesión con Firebase, migración de cuentas | `ServicioSesion.crear(PANTALLAS_POR_ROL)` → `iniciarSesion`, `restaurar` (`aplicacion/servicios/sesion.js`) |
| (nuevo, S1) crear/reemplazar/borrar cuentas, perfiles, índice | `Cuentas` (`adaptadores/salida/firebase-cuentas.js`); envolturas en `ui/usuarios/cuentas.js`: `crearCuentaPara`, `reemplazarCuenta`, `sincronizarPerfil`, `borrarCuentaDe` |
| `maxFacturaLocal`, `reservarFactura`, `siguienteFactura` | Envolturas en `ui/ventas/nueva-venta.js` sobre `Dominio.facturas` + `Datos.reservarConsecutivo` |

## 6. Plan de fases

Cada fase deja la app funcionando, pasa `npm test` y las pruebas de navegador, y se revisa antes de seguir.

| Fase | Contenido | Estado |
|---|---|---|
| **1** | Estructura de carpetas; dominio de fechas, pagos, caja, inventario, facturas y contraseñas con pruebas; puerto de datos; adaptadores de Firebase, almacenamiento local y cripto; raíz de composición; puente. | ✅ Hecha |
| **1.5** | Interfaz partida en 46 archivos por módulo + manifiesto de carga; permisos, negocio y gastos al dominio; prueba estructural y recorrido completo en navegador (sección 10). | ✅ Hecha (2026-10-08) |
| 2 | **Caja**: casos de uso `abrirCaja`, `registrarMovimiento`, `cerrarCaja`, `retirarConCajaCerrada` en `aplicacion/caja.js`; pantalla de caja e impresión del cierre como módulos de UI. | Pendiente |
| 3 | **Ventas**: carrito, cobro (usar `pagos.liquidarCobro`), pedidos, edición y ajuste de cobro, cuentas abiertas. | Pendiente |
| 4 | **Inventario**: catálogo, combos, insumos, recetas, lotes, conteo. | Pendiente |
| 5 | **Operación**: clientes, domicilios y cuadre, citas, cocina, tiempos. | Pendiente |
| 6 | **Gestión**: dashboard, reportes, historial, contable, gastos, impresión (adaptador de impresión). | Pendiente |
| 7 | **Administración**: login, usuarios, permisos, super-admin, configuración, Mi Negocio. **S1 (Plan B) ya se adelantó**: puerto y adaptador de cuentas + servicio de sesión. Falta mover las pantallas de usuarios y super-admin a módulos. | Parcial (S1 ✅) |
| 8 | **Cierre**: estilos de `index.html` a `src/adaptadores/entrada/ui/estilos.css`; eliminar los scripts clásicos y el puente; cambiar los `onclick` por eventos delegados (`data-accion`). | Pendiente |

## 7. Cómo agregar o cambiar algo

| Quiero… | Dónde |
|---|---|
| Cambiar una regla (fórmula, validación, cálculo) | `src/dominio/…` + su prueba en `tests/dominio/` |
| Agregar una operación de la app (un "caso de uso") | `src/aplicacion/…` (desde la fase 2) |
| Necesito algo nuevo de la base de datos | Agregarlo al puerto `aplicacion/puertos/datos.js` **y** a `adaptadores/salida/firebase-datos.js` (si falta, `verificarPuertoDatos` avisa al arrancar) |
| Una pantalla o botón | El archivo de su módulo en `src/adaptadores/entrada/ui/<módulo>/` (buscar la función en [mapa-interfaz.md](mapa-interfaz.md)) |
| Un archivo nuevo de interfaz | Crearlo en su carpeta y **agregarlo a `ui/manifiesto.js`**; solo declarar funciones y variables (no ejecutar código de otros archivos al cargar). `npm test` revisa la estructura; luego `node scripts/mapa-interfaz.mjs` |
| Una regla que hoy está en la interfaz | Moverla a `src/dominio/`, publicarla en el puente con el mismo nombre si la interfaz la usa por nombre, y dejar en la interfaz solo la envoltura que le pasa `STATE` |
| Conectar una pieza nueva | `src/arranque.js` |

## 8. Cómo se verificó la fase 1

- `npm test`: 21 pruebas del dominio.
- Navegador sin interfaz (Chromium) contra una copia del proyecto servida por HTTP, con Firebase simulado en memoria y en modo local:
  - las 44 comprobaciones de seguridad y datos de [-02-corrections](../-02-corrections/-02-corrections.md) siguen pasando;
  - recorrido completo: 18 negocios demo (uno por plantilla), las 23 pantallas de cada uno (414 vistas), las 5 pestañas de configuración, usuarios y administradores, y una venta cobrada por negocio. Sin errores de JavaScript.
- No se probó contra Firebase real ni en móviles.

## 9. Realtime Database vs. Cloud Firestore

Firebase ofrece dos bases de datos. Wallace System usa **Realtime Database**. Esta sección explica la diferencia, qué ganaría el sistema con **Cloud Firestore** y por qué la recomendación es no cambiar todavía.

### 9.1 Diferencias

| Aspecto | Realtime Database (actual) | Cloud Firestore |
|---|---|---|
| Modelo de datos | Un solo árbol JSON gigante. | Colecciones de documentos (`negocios/{id}/ventas/{id}`), con subcolecciones. |
| Consultas | Muy limitadas: un solo orden o filtro por consulta. Para "ventas de marzo del negocio N1 pagadas con tarjeta" hay que bajar todo y filtrar en el navegador. | Filtros combinados, orden, paginación y agregaciones (`count`, `sum`, `average`) en el servidor. |
| Qué se descarga | Al escuchar un nodo se baja **todo su contenido**. Hoy el panel del super-admin baja la base completa en cada cambio. | Solo los documentos que pide la consulta. |
| Funcionamiento sin internet (web) | El SDK web **no guarda** datos entre recargas. Por eso la app tiene su propio respaldo en `localStorage` y su cola de cambios pendientes. | El SDK web trae persistencia en el navegador (IndexedDB) y cola de escrituras pendientes. |
| Transacciones | Sobre un solo nodo. | Sobre varios documentos a la vez, y escrituras en lote (hasta 500 operaciones). |
| Reglas de seguridad | JSON en cascada; difíciles de leer cuando crecen (ver las reglas del Plan B). | Lenguaje propio con funciones y validación por documento; el modelo multi-negocio (`negocios/{negId}/…`) se expresa de forma más natural. |
| Latencia | Muy baja; ideal para estado en vivo (presencia, `.info/connected`). | Algo mayor, suficiente para un punto de venta. |
| Límite de escrituras | Alto (del orden de 1.000 escrituras por segundo por base). | **~1 escritura por segundo sostenida por documento.** Afecta documentos "calientes" como un contador de facturas o la caja abierta. |
| Tamaño máximo | 256 MB por escritura. | 1 MiB por documento (alcanza para un negocio con su logo). |
| Cómo se cobra | Por **GB guardados y GB descargados**. | Por **número de lecturas, escrituras y borrados** de documentos, más almacenamiento. |
| Plan gratuito (Spark), aproximado | 1 GB guardado, 10 GB descargados al mes, **100 conexiones simultáneas**. | 1 GiB guardado, ~50.000 lecturas, ~20.000 escrituras y ~20.000 borrados **por día**; sin el límite de 100 conexiones. |

Las cifras de planes y límites cambian; confirmarlas en la página de precios de Firebase antes de decidir.

### 9.2 Qué ganaría Wallace System con Firestore

- **Panel del super-admin y reportes sin bajar toda la base**: totales del mes, ventas por negocio o por día calculados en el servidor con consultas y agregaciones.
- **Menos código propio**: buena parte de `adaptadores/salida/firebase-datos.js` (respaldo local, cola sin internet, sincronización por registro, marcas de borrado) existe porque Realtime Database no lo trae para web; Firestore sí.
- **Más de 100 equipos conectados a la vez** sin pasar a pago.
- **Reglas multi-negocio más claras** para S1 (`match /negocios/{negId}/{doc=**}`).
- **Transacciones de varios documentos**: cobrar (venta + stock + cliente) podría ser una sola operación atómica.

### 9.3 Qué costaría

- **Reescribir el adaptador de datos** completo (`firebase-datos.js`) y **migrar los datos** de producción a la nueva estructura. Gracias a la arquitectura hexagonal el resto de la app no cambia: el nuevo adaptador cumple el mismo puerto (`aplicacion/puertos/datos.js`).
- **Cambiar la forma de leer**: hoy cada equipo escucha tablas completas (`ventas`). En Firestore cada documento leído cuenta. Con varios equipos abriendo la app y escuchando todo el historial, las 50.000 lecturas diarias gratuitas se pueden agotar. Habría que leer solo lo necesario (la jornada actual, el mes del reporte).
- **Documentos calientes**: el consecutivo de facturas y la caja abierta reciben muchas escrituras seguidas; habría que diseñarlos para el límite de ~1 escritura por segundo por documento (en un negocio pequeño normalmente alcanza).
- **Rehacer S1** sobre las reglas de Firestore, si se migra antes.

### 9.4 Recomendación

**Seguir con Realtime Database por ahora** y terminar primero S1 y las fases de la reorganización:
- Los problemas urgentes (seguridad, concurrencia) ya tienen solución sobre Realtime Database.
- Cambiar de base y de modelo de datos a la vez que se reorganiza el código suma riesgo sin necesidad.
- Cuando la reorganización termine, el cambio se reduce a escribir un **adaptador nuevo** (`firestore-datos.js`) que cumpla el puerto, probarlo en el proyecto de pruebas y migrar los datos.

**Señales para reconsiderar Firestore:**
- el panel del super-admin o los reportes se vuelven lentos por la cantidad de datos;
- se acercan las 100 conexiones simultáneas o los 10 GB de descarga mensual del plan gratuito;
- se necesitan reportes históricos con filtros que hoy obligarían a bajar todo;
- se quiere un funcionamiento sin internet más robusto sin mantener código propio.

## 10. Partición de la interfaz (2026-10-08)

El `app.js` de 7.700 líneas se partió en **46 archivos** (45 al partirlo + `reportes/resumen.js` de R1) por módulo dentro de `src/adaptadores/entrada/ui/`, y las reglas puras que todavía vivían en la interfaz pasaron al dominio.

### 10.1 Cómo se hizo sin romper nada

- **Siguen siendo scripts clásicos.** Los scripts clásicos de una página comparten el mismo ámbito global, así que una función declarada en `ventas/cobro.js` se llama igual desde `ventas/pedidos.js` o desde un `onclick`. Convertir la interfaz a módulos ES exige cambiar los ~900 `onclick` por eventos delegados: es la fase 8.
- **El corte lo hizo un analizador (acorn), no a mano.** Cada sentencia de primer nivel, con sus comentarios, fue al archivo de su sección; la suma de los fragmentos tiene exactamente los mismos caracteres que el original. Antes se verificó que **ninguna sentencia que se ejecuta al cargar usa algo de otra parte del archivo** (solo hay declaraciones, dos `setInterval`, un `addEventListener` y un observador de tablas), así que el orden de carga no puede romper nada.
- **Carga:** `src/arranque.js` inserta los archivos de `ui/manifiesto.js` con `async=false` (se descargan en paralelo y se ejecutan en orden) y al terminar llama `iniciarInterfaz()`. Las rutas llevan `?v=VERSION_UI` para que tras publicar no se mezclen archivos viejos y nuevos: **cambiar `VERSION_UI` en cada publicación**.

### 10.2 Qué pasó al dominio

| Antes en la interfaz | Ahora | La interfaz conserva |
|---|---|---|
| `ROLES`, `PANTALLAS_POR_ROL`, `ACCIONES`, `PERMISOS_POR_ROL`, lógica de `tienePermiso`, `puedeVerSucursal`, pantallas del rol en `armarMenu` | `dominio/permisos.js` (`puede`, `pantallasDe`, `puedeVerSucursal`) | `tienePermiso(accion)` y `puedeVerSucursal(id)` como envolturas que pasan `STATE.user` |
| `PERFILES`, `PLANES`, `planDe`, `VENTANAS_POR_PLAN`, `inventarioHabilitado`, `usaInventario`, `diasAvisoVence`, `sucursalesDe`, `usaSucursales` | `dominio/negocio.js` | `usaInventario(neg)` y `diasAvisoVence()` con el negocio de la sesión por defecto |
| `CONCEPTOS_BASE`, `normConcepto`, `claveConcepto`, deduplicación y suma por concepto | `dominio/gastos.js` (`conceptosUnicos`, `acumularConcepto`) | `getConceptosGasto()` y `acumConcepto()` leen los datos y delegan |
| `difDe` (diferencia del conteo) | `dominio/inventario.js` → `diferenciaConteo` | `difDe` como envoltura |

El puente publica las constantes y funciones puras con su nombre de siempre, así que el resto de la interfaz no cambió. `PANTALLAS_POR_ROL` ya no viaja de la interfaz al servicio de sesión: el arranque se la pasa directamente desde el dominio.

### 10.3 Pruebas que lo cuidan

| Prueba | Qué detecta |
|---|---|
| `tests/ui/estructura.test.mjs` (`npm test`) | Archivo fuera del manifiesto; nombre global repetido entre archivos o que tapa uno del puente; código que al cargar usa otro archivo; identificador sin declarar (sería `ReferenceError`); `onclick` que llama una función inexistente; funciones que `arranque.js` llama por `window`. Se comprobó metiendo errores a propósito. |
| `tests/navegador/recorrido.test.mjs` (`npm run test:firebase`) | Modo local en Chrome sin ventana: crea los 18 demos, dibuja las pantallas del super-admin (incluidas las 5 pestañas de configuración de cada negocio) y **todas** las pantallas del menú de cada negocio (más de 300), y en cada negocio con caja hace una venta con pago dividido, la anula (el stock vuelve, queda en auditoría) y cierra la caja. Falla también con los errores que la app atrapa y oculta ("Error en pantalla"). |
| `tests/dominio/negocio.test.mjs` | Las reglas movidas al dominio. |

### 10.4 Lo que falta para que la interfaz sea "hexagonal" del todo

- **Los casos de uso siguen en la interfaz** (cobrar, anular, abrir y cerrar caja, mover inventario…): leen y escriben datos con `misDatos`/`guardarMisDatos` directamente. Sacarlos a `src/aplicacion/` es el contenido de las fases 2 a 7; ahora cada uno está en un archivo chico y con su prueba de recorrido, lo que hace ese trabajo mucho más seguro.
- **363 nombres globales.** Bajarán a medida que cada módulo pase a ser módulo ES (fase 8).
- Mapa función → archivo: [mapa-interfaz.md](mapa-interfaz.md) (generado con `node scripts/mapa-interfaz.mjs`).
