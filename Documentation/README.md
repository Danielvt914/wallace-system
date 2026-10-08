# Documentación técnica — Wallace System

Sistema POS multi-negocio (SaaS) de **WALLACE COMPANY SYSTEM**. Una sola aplicación web estática (`index.html` + módulos en `src/`) que sirve a muchos negocios a la vez; cada negocio ve solo su información y un super-admin administra el conjunto. El código está en migración a **arquitectura hexagonal** (ver [-03-architecture](-03-architecture/-03-architecture.md)).

Esta carpeta documenta el sistema **por módulo**, tal como está implementado en el código (no como se desea que funcione). Cada módulo tiene un archivo con el mismo nombre de su carpeta (por ejemplo `04-kitchen-kds/04-kitchen-kds.md`) y la misma estructura:

1. Propósito y alcance (qué cubre y qué no)
2. Actores, roles y permisos
3. Configuración que lo activa
4. Flujos principales paso a paso
5. Modelo de datos (tablas y campos que lee/escribe)
6. Catálogo de funciones: archivo, alcance, quién la invoca y qué hace
7. Reglas de negocio y validaciones
8. Integración con otros módulos
9. Interfaz (clases CSS de `index.html`)
10. Limitaciones conocidas (detalle en [-01-to-review](-01-to-review/-01-to-review.md))

## Índice

| Carpeta | Módulo | Contenido principal |
|---|---|---|
| [-00-execution-protocol](-00-execution-protocol/-00-execution-protocol.md) | Protocolo de ejecución | Cómo correr, configurar, desplegar, respaldar y probar el sistema; entorno de pruebas en Firebase |
| [-01-to-review](-01-to-review/-01-to-review.md) | Hallazgos para revisar | Bugs, riesgos de seguridad e inconsistencias encontradas al documentar, con su estado |
| [-02-corrections](-02-corrections/-02-corrections.md) | Correcciones aplicadas | Qué se corrigió de seguridad y datos, dónde, cómo se probó y qué queda pendiente |
| [-03-architecture](-03-architecture/-03-architecture.md) | Arquitectura | Estructura hexagonal (dominio, puertos, adaptadores), regla de dependencias, plan de fases de la migración y comparación Realtime Database vs. Cloud Firestore |
| [01-super-admin-panel](01-super-admin-panel/01-super-admin-panel.md) | Panel super-admin | Negocios, planes, vendedores, demos, respaldo, informe mensual |
| [02-pos-catalog](02-pos-catalog/02-pos-catalog.md) | Venta, pedidos y catálogo | Nueva Venta, carrito, cobro, pago dividido, pedidos, cuentas abiertas, productos y combos |
| [03-cash-register](03-cash-register/03-cash-register.md) | Caja | Apertura, movimientos, cierre con cuadre, base del día siguiente, verificación de transferencias |
| [04-kitchen-kds](04-kitchen-kds/04-kitchen-kds.md) | Cocina / KDS | Pantalla de cocina, comandas, tiempos de entrega |
| [05-appointments-shifts](05-appointments-shifts/05-appointments-shifts.md) | Agenda / citas | Citas y turnos, productos apartados, cobro de la entrega |
| [06-inventory-recipes](06-inventory-recipes/06-inventory-recipes.md) | Inventario y recetas | Motor de inventario, stock, lotes FEFO, insumos, recetas, conteo físico |
| [07-customers-delivery](07-customers-delivery/07-customers-delivery.md) | Clientes y domicilios | Clientes automáticos, autocompletado, domiciliarios y su cuadre |
| [08-sales-reports](08-sales-reports/08-sales-reports.md) | Reportes de ventas | Dashboard, reportes, historial |
| [09-expenses-accounting](09-expenses-accounting/09-expenses-accounting.md) | Gastos y contable | Gastos del negocio, conceptos, registro contable mensual |
| [10-users-roles](10-users-roles/10-users-roles.md) | Usuarios, roles y auditoría | Login, roles, pantallas, permisos de acción, contraseñas, auditoría |
| [11-business-settings](11-business-settings/11-business-settings.md) | Configuración del negocio | Perfiles por tipo, configuración del super-admin, Mi Negocio, sucursales, tema, vocabulario |
| [12-invoice-printing](12-invoice-printing/12-invoice-printing.md) | Impresión | Facturas POS/media/carta, remisión, reimpresiones |
| [13-multitenant-isolation](13-multitenant-isolation/13-multitenant-isolation.md) | Datos y aislamiento | Almacenamiento, sincronización con Firebase, aislamiento por negocio, arranque y render |

## Archivos del proyecto

| Archivo / carpeta | Rol |
|---|---|
| `index.html` | Única página. Contiene todo el CSS (tema oscuro/claro, responsive) y carga Firebase, `logo.js`, `firebase-config.js` y el módulo `src/arranque.js`. El cuerpo solo tiene `#app`, `#modal-container` y `#toasts`. |
| `src/arranque.js` | Raíz de composición: crea los adaptadores, verifica el puerto de datos, publica el puente y carga la interfaz. |
| `src/dominio/` | Reglas puras del negocio (fechas, pagos, caja, inventario, facturas, contraseñas). Probadas con `npm test`. |
| `src/aplicacion/puertos/` | Contratos que deben cumplir los adaptadores (datos y cuentas). |
| `src/aplicacion/servicios/` | Casos de uso (hoy: inicio de sesión y migración de cuentas, S1). |
| `src/adaptadores/salida/` | Firebase + respaldo local (sincronización y transacciones), cuentas con Firebase Authentication, `localStorage`, aleatoriedad. |
| `src/adaptadores/entrada/ui/` | Interfaz partida en 46 archivos por módulo (`nucleo/`, `ventas/`, `caja/`, `inventario/`…), cargados en el orden de `manifiesto.js`. Mapa función → archivo: [mapa-interfaz](-03-architecture/mapa-interfaz.md). |
| `src/adaptadores/entrada/ui/puente-legado.js` | Puente temporal de la migración. |
| `tests/` | Pruebas automáticas: `npm test` (dominio y servicios) y `npm run test:firebase` (reglas, migración e interfaz en emuladores). |
| `scripts/` | `emulador.mjs` (app completa en emuladores), `probar-firebase.mjs`, `preparar-pruebas.mjs` (diagnóstico del export e importación a pruebas). |
| `database.rules.json` / `database.rules.transicion.json` | Reglas de seguridad final y de transición (S1). |
| `firebase.json`, `firebase.transicion.json`, `.firebaserc` | Configuración de la CLI de Firebase; solo alias `pruebas`. |
| `CLAUDE.md`, `.claude/contexto.md` | Reglas de trabajo y estado vivo del proyecto para el asistente de código. |
| `firebase-config.js` | Define `window.FIREBASE_CONFIG` según el dominio (producción, pruebas, emuladores o local) y `window.FIREBASE_ENTORNO`. |
| `logo.js` | Logo SVG de la marca (`window.WALLACE_LOGO`) y logo por defecto de negocios. |
| `prueba.html` | Página de diagnóstico de la conexión con Firebase (lectura y escritura de prueba). |
| `package.json` / `render.yaml` | Despliegue como sitio estático (Render o `npx serve`) y pruebas. |

## Convenciones de esta documentación

- Las rutas `ui/<carpeta>/<archivo>.js` son relativas a `src/adaptadores/entrada/` (la interfaz) y las demás (`dominio/pagos.js`, `adaptadores/salida/firebase-datos.js`) a `src/`. Hasta el 2026-10-08 la interfaz era un solo `app.js` y la documentación citaba `app.js:NNN`; esas referencias se pasaron al archivo nuevo buscando la función por nombre. Para ubicar cualquier función: [mapa-interfaz](-03-architecture/mapa-interfaz.md).
- **Alcance de una función**:
  - **Pantalla**: devuelve HTML de una vista y la invoca `renderContenido()`/`vistaNegocio()`/`render()`.
  - **Acción UI**: se llama desde un `onclick`/`oninput` del HTML generado (alcance global, `window`).
  - **Servicio**: lógica reutilizada por varios módulos.
  - **Interna**: ayudante usado solo dentro del módulo.
- Las funciones de la interfaz están en el ámbito global (scripts clásicos que comparten ámbito) y las del dominio y los datos se publican en `window` mediante el puente, así que técnicamente se pueden invocar desde la consola del navegador. Dentro de cada negocio, los permisos de rol son **del lado del cliente**; el aislamiento entre negocios lo hacen las reglas de S1.
- "Negocio" = tenant. "Jornada" = periodo contable de una caja (ver [03-cash-register](03-cash-register/03-cash-register.md)).
