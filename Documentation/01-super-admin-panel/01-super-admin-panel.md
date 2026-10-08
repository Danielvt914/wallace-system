# 01 — Panel de super-admin

> **Cambios del 2026-10-08 (R1):** con cuentas de Firebase el panel ya no descarga toda la base: lee negocios, administradores, usuarios y el resumen de ventas de cada negocio; los datos completos se leen al supervisar o al sacar el informe mensual. Botón "📊 Calcular cifras" para negocios sin resumen. Detalle en [-01-to-review](../-01-to-review/-01-to-review.md).

## 1. Propósito

Panel del dueño del sistema (Wallace Company) y de su equipo. Desde aquí se crean y configuran los negocios clientes, se controla quién está activo (pago), se asignan vendedores, se crean negocios de demostración, se descarga el respaldo y se generan informes mensuales por negocio.

## 2. Alcance

**Incluye**
- Métricas globales: negocios activos, ingreso mensual (suma de planes), suspendidos, usuarios, ventas de hoy e históricas, negocio con más ventas, cartera por vendedor.
- Lista de negocios con búsqueda (nombre, tipo, ciudad, vendedor) y filtro por vendedor.
- Crear, activar/suspender y eliminar negocios.
- Entrar a un negocio en **modo supervisión**.
- Gestión de administradores del sistema (dueño, ayudante, vendedor).
- Negocios demo con datos de ejemplo (18 plantillas).
- Respaldo JSON de toda la base.
- Informe mensual PDF por negocio.
- Panel reducido para el rol **vendedor**.

**No incluye** (documentado en otros módulos)
- Pestañas de configuración de cada negocio → [11-business-settings](../11-business-settings/11-business-settings.md).
- Usuarios de cada negocio → [10-users-roles](../10-users-roles/10-users-roles.md).
- Restauración de respaldos (no existe en la app; ver [-00-execution-protocol](../-00-execution-protocol/-00-execution-protocol.md#6-respaldo-y-restauración)).

## 3. Actores y permisos

Los super-admins viven en la tabla global `superadmins` con un campo `rolSuper`:

| `rolSuper` | Puede | No puede |
|---|---|---|
| `dueno` | Todo: crear/eliminar negocios, gestionar administradores, respaldo, informes | Eliminarse a sí mismo; dejar el sistema sin ningún dueño |
| `ayudante` | Panel completo, crear/configurar/suspender negocios, respaldo, informes | Ver "👥 Administradores", eliminar negocios |
| `vendedor` | Panel de ventas: crear/entrar/pausar/borrar **sus** demos, ver sus clientes reales (solo lectura) | Crear negocios reales (`nuevoNegocio` lo bloquea), entrar a negocios reales (`entrarComoNegocio` lo bloquea), borrar demos de otros vendedores |

Las restricciones se aplican en el cliente: se ocultan botones y algunas funciones validan `rolSuper` al ejecutarse (ver tabla de funciones).

## 4. Flujos principales

### 4.1 Crear negocio (`nuevoNegocio`, `ui/super-admin/negocios.js`)
1. Modal: nombre*, tipo (perfil), ciudad, plan (Básico/Profesional/Premium), precio mensual (por defecto 149.900), usuario* y contraseña* del administrador, vendedor a cargo y flujo de cobro (directo / confirmar y luego cobrar).
2. Valida que el usuario no exista ni en `usuarios` ni en `superadmins`.
3. Copia el perfil del tipo (`PERFILES`, ver [11](../11-business-settings/11-business-settings.md)) al negocio: vocabulario, `usaMesas/usaCocina/usaRecetas/usaCitas`, `tiposEntrega`, `funciones`, `usaCaja`, `esLogistica`.
4. Valores por defecto: `tipoFactura:'pos'`, `pctDatafono:0`, `sonidos:true`, `tema:'claro'`, `sucursales:[]`, `activo:true`.
5. Crea el usuario `rol:'admin'` del negocio.

### 4.2 Suspender / activar (`toggleNegocio`, `ui/super-admin/negocios.js`)
Invierte `activo`. Un negocio suspendido no deja iniciar sesión a sus usuarios ("Este negocio está suspendido. Contacta al proveedor."). Los usuarios ya conectados siguen dentro hasta salir.

### 4.3 Eliminar negocio (`eliminarNegocio`, `ui/super-admin/negocios.js`) — solo `dueno`
Doble confirmación (aviso + escribir el nombre exacto). Borra el registro del negocio, sus usuarios y, para cada tabla de `TABLAS`, las claves `''`, `_r`, `_x`, `_bk` (local y nube), además de cualquier clave `data_<id>_*` presente en el caché. Irreversible.

### 4.4 Supervisar un negocio (`entrarComoNegocio`, `ui/super-admin/negocios.js`)
Guarda el super-admin en `STATE._superUser` y entra con un usuario sintético `{nombre:'Supervisor', rol:'admin', esSupervisor:true}` (todos los permisos). Muestra un banner "Modo supervisión" con "← Volver al panel" (`volverSuperAdmin`, `ui/super-admin/negocios.js`), que restaura el usuario original con su `rolSuper`. Un vendedor solo puede supervisar demos.

### 4.5 Demos
- `crearNegocioDemo` (`ui/super-admin/demos.js`) abre el selector de plantilla; `crearVariosDemos` (`ui/super-admin/demos.js`) crea 5 variados de una vez.
- `crearDemoDeTipo` (`ui/super-admin/demos.js`) crea: negocio `esDemo:true` con `demoDe` = id de quien lo creó, ciudad Bucaramanga, plan Premium; usuario admin `demo`, `demo2`… con contraseña `demo123`; productos y clientes de la plantilla; **caja abierta** con base 50.000; ventas pagadas aleatorias de los últimos 10 días (3–6 diarias entre semana, 5–8 fines de semana, 1–3 ítems, métodos con predominio de efectivo); movimientos de inventario de entrada escalonados.
- Los demos **no cuentan** en las métricas reales del panel.
- `eliminarDemoVendedor` (`ui/super-admin/demos.js`) solo borra negocios `esDemo`; un vendedor solo los suyos.

Plantillas disponibles (`DEMO_PLANTILLAS`, `ui/super-admin/demos.js`): Restaurante, Tienda / Accesorios, Barbería / Salón, Cafetería, Panadería, Ferretería, Logística / Bodega, Papelería, Droguería / Farmacia, Miscelánea / Variedades, Heladería, Pizzería, Boutique / Ropa, Tecnología / Celulares, Licorera, Fruver / Verdulería, Veterinaria / Mascotas, Floristería. Cada una mapea a un perfil base de `PERFILES` (`tipo`).

### 4.6 Asignar vendedor (`asignarVendedor`, `ui/super-admin/negocios.js`)
Guarda `vendedorId`, `vendedorNombre` y `notasComerciales` en el negocio. Alimenta la tarjeta "Cartera por vendedor" (negocios, activos y facturación mensual por vendedor) y el filtro del listado.

### 4.7 Administradores del sistema (`pantallaSuperAdmins`, `ui/super-admin/administradores.js`) — solo `dueno`
Crear/editar (`editarSuperAdmin`): nombre, usuario, contraseña (mín. 5 caracteres), rol. Usuario único entre `superadmins` y `usuarios`. Siempre debe quedar al menos un dueño. Eliminar (`eliminarSuperAdmin`) con confirmación; no se puede eliminar a uno mismo.

### 4.8 Cambiar mi contraseña (`cambiarMiPassSuper`, `ui/super-admin/administradores.js`)
Pide la actual, la nueva (mín. 5) y su confirmación.

### 4.9 Respaldo (`descargarRespaldo`, `ui/super-admin/panel.js`)
Lee todo `data/` (o el caché local sin nube) y descarga `respaldo-wallace-AAAA-MM-DD.json` con `{sistema:'Wallace System', fecha, datos}`.

### 4.10 Informe mensual del negocio (`reporteMensualNegocio`, `ui/super-admin/reporte-mensual.js` → `imprimirReporteNegocio`, `ui/super-admin/reporte-mensual.js`)
Selector de mes y ventana imprimible (carta) con: ventas del mes (usa `subtotal`, sin domicilio/propina/recargo), reparto por forma de pago respetando pagos divididos, egresos (gastos de caja tomados de los movimientos de los cierres del mes + gastos del negocio no originados en caja) por concepto, utilidad, ticket promedio, top 10 productos por valor, cierres y su resultado, ventas anuladas, usuarios y sucursales. Encabezado con datos del negocio, plan y vendedor.

## 5. Modelo de datos

### `negocios` (global)
| Campo | Descripción |
|---|---|
| `id`, `nombre`, `tipo`, `ciudad`, `nit`, `tel`, `dir`, `eslogan`, `logo` (data URL PNG) | Identificación |
| `plan`, `precioMes`, `diaPago`, `activo`, `creado` | Comercial y estado |
| `vendedorId`, `vendedorNombre`, `notasComerciales` | Comercial |
| `esDemo`, `demoDe` | Demo y su creador |
| `funciones[]` | Ventanas habilitadas (ver [11](../11-business-settings/11-business-settings.md)) |
| Resto de banderas operativas | `flujoPedido`, `tiposEntrega`, `usaMesas`, `usaCocina`, … ver [11](../11-business-settings/11-business-settings.md) |

### `superadmins` (global)
`id`, `nombre`, `usuario`, `passHash` + `passSal` + `passIter` (contraseña con hash), `rolSuper` (`dueno`/`ayudante`/`vendedor`), `creado`. El primer dueño se crea en la pantalla de configuración inicial ([10](../10-users-roles/10-users-roles.md)).

### Lecturas
Ventas pagadas de cada negocio (`data_<id>_ventas` y, por compatibilidad, `data_<id>_ventas-<sucursal>`), usuarios por negocio, cierres y gastos para el informe.

## 6. Catálogo de funciones

| Función | Archivo | Alcance | Quién / permiso | Qué hace |
|---|---|---|---|---|
| `panelSuperAdmin()` | `ui/super-admin/panel.js` | Pantalla | Super-admin | Calcula métricas (excluye demos) y dibuja el panel; si `rolSuper==='vendedor'` dibuja el panel de ventas. |
| `descargarRespaldo()` | `ui/super-admin/panel.js` | Acción UI | Dueño/ayudante | Descarga el JSON completo. |
| `pantallaSuperAdmins()` | `ui/super-admin/administradores.js` | Pantalla | Dueño | Tabla de administradores del sistema. |
| `editarSuperAdmin(id)` | `ui/super-admin/administradores.js` | Acción UI | Dueño (valida) | Crear/editar administrador. |
| `eliminarSuperAdmin(id)` | `ui/super-admin/administradores.js` | Acción UI | Dueño (valida) | Eliminar administrador. |
| `cambiarMiPassSuper()` | `ui/super-admin/administradores.js` | Acción UI | Cualquier super-admin | Cambia su propia contraseña. |
| `nuevoNegocio()` | `ui/super-admin/negocios.js` | Acción UI | Dueño/ayudante (bloquea vendedor) | Crear negocio + admin. |
| `crearNegocioDemo()` | `ui/super-admin/demos.js` | Acción UI | Todos | Modal de plantilla demo. |
| `crearVariosDemos()` | `ui/super-admin/demos.js` | Acción UI | Todos | Crea 5 demos. |
| `crearDemoDeTipo(tipo, cerrar)` | `ui/super-admin/demos.js` | Servicio | Las dos anteriores | Lógica de creación de un demo lleno. Devuelve `true` si lo creó. |
| `asignarVendedor(id)` | `ui/super-admin/negocios.js` | Acción UI | Dueño/ayudante | Vendedor y notas comerciales. |
| `toggleNegocio(id)` | `ui/super-admin/negocios.js` | Acción UI | Todos (vendedor solo ve sus demos) | Activa/suspende. |
| `eliminarNegocio(id)` | `ui/super-admin/negocios.js` | Acción UI | Dueño (valida) | Borrado total del negocio. |
| `eliminarDemoVendedor(id)` | `ui/super-admin/demos.js` | Acción UI | Vendedor/admins | Borra un demo. |
| `entrarComoNegocio(id)` | `ui/super-admin/negocios.js` | Acción UI | Todos (vendedor solo demos) | Modo supervisión. |
| `volverSuperAdmin()` | `ui/super-admin/negocios.js` | Acción UI | Supervisor | Regresa al panel. |
| `configNegocio(id)` / `usuariosNegocio(id)` | 5533–5537 | Acción UI | Dueño/ayudante | Navegan a configuración / usuarios del negocio. |
| `reporteMensualNegocio(id)` | `ui/super-admin/reporte-mensual.js` | Acción UI | Dueño/ayudante | Selector de mes del informe. |
| `imprimirReporteNegocio(id, mes)` | `ui/super-admin/reporte-mensual.js` | Interna | `reporteMensualNegocio` | Arma e imprime el informe. |

## 7. Reglas de negocio

- Usuario único global: no puede repetirse entre empleados y super-admins.
- Los negocios demo no suman a ingresos, ventas ni usuarios del panel.
- "Ventas hoy (todos)" usa la jornada de la venta (`v.jornada` o fecha local).
- "Facturado desde que entró" (pestaña comercial) = `precioMes × max(1, ceil(días/30))`, estimado, no lleva registro real de pagos.

## 8. Integración

- Crea negocios a partir de `PERFILES` ([11](../11-business-settings/11-business-settings.md)).
- Supervisión usa la vista normal del negocio con permisos completos ([10](../10-users-roles/10-users-roles.md)).
- Lee datos de ventas, cierres y gastos ([02](../02-pos-catalog/02-pos-catalog.md), [03](../03-cash-register/03-cash-register.md), [09](../09-expenses-accounting/09-expenses-accounting.md)).
- Sincroniza todo con `sincronizarTodo` ([13](../13-multitenant-isolation/13-multitenant-isolation.md)).

## 9. Interfaz

Clases de `index.html`: `.topbar`, `.sa-emblema`, `.sa-marca`, `.stats/.stat` (variantes `gold`, `verde`, `azul`, `naranja`, `rojo`), `.tarjeta`, `.tabla`/`.tabla-cards`, `.pill-*`, `.banner-sup` (banner de supervisión). El panel no usa el tema del negocio (`quitarTema`).

## 10. Limitaciones conocidas

- No existe control de pagos real (fechas de pago, mora); `activo` es manual.
- Las listas de planes difieren: al crear se ofrece **Premium**, en configuración **Empresarial**.
- ~~`toggleNegocio` no validaba rol~~: corregido; un vendedor solo pausa sus demos y las funciones de gestión validan `esAdminSistema()` ([-02](../-02-corrections/-02-corrections.md)).
- No hay restauración de respaldo desde la app.

Ver [-01-to-review](../-01-to-review/-01-to-review.md).
