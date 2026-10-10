# Contexto vivo de Wallace System

> Estado dinámico del proyecto para retomar entre sesiones. Lo actualiza el asistente al final de cada tarea (ver `CLAUDE.md` → Protocolo de sesión). Fechas absolutas.

**Última actualización:** 2026-10-09

## Estado
- **Migración hexagonal**: fase 1 hecha; fase 1.5 hecha (2026-10-08): `app.js` partido en 45 scripts clásicos por módulo en `src/adaptadores/entrada/ui/` (orden en `ui/manifiesto.js`) y permisos, negocio y gastos movidos a `src/dominio/`. S1 adelantado de la fase 7. **Fase 8 hecha (2026-10-09)**: CSS en `ui/estilos/` (15 archivos), `style="…"` → clases de utilidad, `onclick` → `data-click` (eventos delegados, `ui/nucleo/eventos.js`), los 47 archivos de `ui/` son **módulos ES** (los carga `cargarInterfaz()` de `ui/manifiesto.js`; consola y pruebas: `window.WS`). Falta solo retirar el puente. **Siguiente**: fases 2–7 = sacar los casos de uso de la interfaz a `src/aplicacion/` (empezar por caja) (`Documentation/-03-architecture`, secciones 6, 10 y 11). Rediseño visual: pendiente a pedido del usuario.
- **Seguridad y datos**: S2–S5 y D1–D5 corregidos en código, **sin desplegar** (producción aún corre la versión original con contraseñas en texto plano).
- **Pruebas** (2026-10-09, todas pasan): `npm test` 67 (dominio, servicio de sesión, estructura de la interfaz: imports/exports, data-click, estilos) y `npm run test:firebase` 36 (reglas, migración S1, interfaz S1 + R1, recorrido de 327 pantallas con venta/anulación/cierre en 18 negocios y ~10.500 acciones delegadas revisadas, clics reales, sucursales F1, citas F8/F9, ajuste de stock F11). Capturas: `node scripts/capturas.mjs tomar|comparar` (121, deterministas; las de la fase 8 idénticas a las de antes). Una vez falló de forma intermitente la prueba "empleado con contraseña corta" (no se reprodujo en 3 corridas): vigilar.
- **S1 (Plan B)**: implementado, probado en emuladores y desplegado en el sandbox `wallacesys-dev-sandbox`. **Falta**: repetir el despliegue por fases en el proyecto real de la empresa (`Documentation/-02-corrections` → S1 → "Despliegue paso a paso").
- **Hallazgos de `-01-to-review`**: **los 34 cerrados** (S6, XSS por nombre de categoría en un `onclick`, encontrado y corregido en la fase 8). Siguiente mejora de seguridad: **CSP** (`-03-architecture/csp.md`): probada en local (`node scripts/probar-csp.mjs`, 0 violaciones); falta `Report-Only` en el sandbox y activarla en `render.yaml`. S1 desplegado y verificado en `wallacesys-dev-sandbox` (dueño `Admn-Wallacesys` creado, reglas cerradas publicadas); falta repetirlo en el proyecto real de la empresa. F17 cerrado por decisión (Premium = Profesional en ventanas). DOC1: el historial de commits no se puede corregir sin reescribirlo.
- **Git**: todo el trabajo desde el commit `15b243d` está **sin commit** (el usuario no ha pedido commit).

## Lo que se sabe de producción (export del 2026-10-07, `wallace-system-default-rtdb-export.json`, en `.gitignore`)
- 6 negocios (2 demos, 1 suspendido), 9 usuarios de negocio, 8 super-admins (dueño, ayudante y 3 vendedores).
- Las 17 contraseñas están en texto plano; 3 usuarios tienen < 6 caracteres (se les pedirá una nueva al migrar).
- `negocios` es un array con 188 KB de logos; 15 tablas en formato viejo (array); 12 respaldos `_bk`; nodos sin uso en la raíz: `posu`, `prueba_conexion`.
- Ningún id de negocio con `_`, ningún nombre de usuario repetido, ningún dato huérfano. Planes usados: Básico, Profesional, Premium.
- Hay usuarios de negocio con rol `dueno` que usan Mi Negocio (por eso las reglas usan `editaNegocio`, no `rol === 'admin'`).

## Pendientes que dependen del usuario
1. Proyecto de simulación **`wallacesys-dev-sandbox`** listo (2026-10-08): `.firebaserc`, `PRUEBAS` en `firebase-config.js`, Authentication activo, dueño `Admn-Wallacesys`, **reglas cerradas** publicadas y verificadas sin sesión. Siguiente: probar el trabajo diario por rol en `http://localhost:3000/` (crear negocio/demo y usuarios).
2. Dar el **dominio público de producción** para `HOSTS_PRODUCCION` en `firebase-config.js`. Sin eso ningún dominio usa producción: **llenarlo antes de unir este código al repositorio original**.
3. Decidir: qué ve el super-admin vendedor (hoy, todo `data`); plazo de migración de cuentas; si el respaldo debe incluir `perfiles/` y `login/`.
4. Pedir commit cuando quiera (hay mucho trabajo sin commit).

## Próximos pasos sugeridos
- Con el proyecto de pruebas listo: `node scripts/preparar-pruebas.mjs <export>` → `npx firebase database:import / importar-pruebas.json -P pruebas` → `npm run reglas:transicion` → protocolo de verificación (`-00`, sección 7) → `npm run reglas:cerradas` → pruebas B.9.
- Mientras tanto se puede ensayar todo con datos reales en local: `npm run emulador` → `http://localhost:3000/?emulador`.
- Siguiente trabajo de código: fases 2–7 (sacar casos de uso de la interfaz a `src/aplicacion/`, empezando por caja).
- Al publicar cualquier cambio de interfaz: subir `VERSION_UI` en `ui/manifiesto.js` **y** el `?v=` de los estilos en `index.html` (la prueba exige que coincidan). Render debe aplicar el `Cache-Control: no-cache` de `render.yaml` a `/src/*` (revisarlo en el primer despliegue).

## Decisiones tomadas
- 2026-10-04: S1 con **Plan B** (sin Cloud Functions ni plan Blaze). Plan A documentado para después.
- 2026-10-04: módulos ES nativos sin empaquetador (opción 1 de `-00` 2.1).
- 2026-10-08: correo interno aleatorio (`u<aleatorio>@usuarios.wallace-system.app`); reglas en dos archivos (transición y finales); la migración de tablas globales la hace el primer ingreso de cualquiera, una sola vez (`data/migracion_s1`); al migrar se retira la contraseña vieja.
- 2026-10-08: dependencias de desarrollo locales (`firebase-tools`, `@firebase/rules-unit-testing`, `firebase`, `puppeteer-core`, `acorn`); Render no las instala (sitio estático). `package.json` con `"type": "module"`.
- 2026-10-08: F17 cerrado por decisión del usuario: Profesional y Premium con las mismas ventanas (Premium = precio/soporte).
- 2026-10-08: proyecto de simulación `wallacesys-dev-sandbox` (cuenta personal, base desde cero) en el bloque `PRUEBAS` de `firebase-config.js`; nunca en `PRODUCCION`.
- 2026-10-08: el corte de `app.js` se hizo con un analizador (acorn), conservando el texto exacto.
- 2026-10-09: fase 8: eventos delegados sin `eval` (una llamada con argumentos simples); acciones solo de lo exportado; módulos sin `?v=` y `no-cache` en Render; variables de otro módulo con `fijarX(v)`; `?local` fuerza el modo local (pruebas y capturas nunca tocan el sandbox).

## Bitácora
- 2026-10-04: documentación por módulos, correcciones S2–S5 y D1–D5, fase 1 de la arquitectura hexagonal.
- 2026-10-08: S1 Plan B implementado (dominio, puerto, servicio, adaptador, reglas, CLI, entornos, pantalla 🔐 Cuentas), F6, F12, DOC1; `.gitignore`; pruebas de reglas, integración y navegador en emuladores; `CLAUDE.md` y este archivo.
- 2026-10-08: sandbox `wallacesys-dev-sandbox`: reglas de transición, dueño creado por la configuración inicial, reglas cerradas; mensaje claro cuando Authentication no está activo (`auth_desactivado`); doc -00 3.1 "cerrar la base".
- 2026-10-08: F1 (caja por sucursal), F2, F3, F4, F5, F8, F9, F10, F11, F13, F14, F15, R1 (resumen por negocio para el panel), R2, C1, C2; `dominio/ventas.js`; dobles escapes y fecha UTC de gastos de caja encontrados y corregidos.
- 2026-10-08: interfaz partida en 45 archivos + manifiesto; `dominio/permisos.js`, `negocio.js`, `gastos.js`; prueba estructural (`tests/ui/`) y recorrido completo (`tests/navegador/recorrido.test.mjs`); F16 y F18 corregidos; C2, F17, R2 documentados; unas 340 referencias `app.js:NNN` de la documentación pasadas a su archivo nuevo; `mapa-interfaz.md` generado.
- 2026-10-09: fase 8: estilos fuera de `index.html`, 221 `style` a clases, 250 manejadores a `data-*` (categoría con apóstrofo arreglada), interfaz en módulos ES (`cargarPedidoEnVenta`, `fijarX`, `window.WS`), `render.yaml` con `no-cache`, prueba estructural para módulos, `scripts/capturas.mjs`, doc -03 sección 11.
- 2026-10-10: `-03-architecture/seguridad-interfaz.md` (ataques con `onclick`/`style` en línea, residual de `data-click`, CSP propuesta); S6 registrado en `-01` y `-02`; sección 11.6 (reglas de `CLAUDE.md`).
- 2026-10-10: `-03-architecture/csp.md` (política directiva por directiva, despliegue por pasos en Render, problemas) y `scripts/probar-csp.mjs` (0 violaciones en 327 pantallas + 18 impresiones; la variante estricta detecta ~830).
