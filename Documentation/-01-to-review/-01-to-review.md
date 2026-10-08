# 01 — Hallazgos para revisar

Puntos encontrados al documentar el código (commit `15b243d`). Las correcciones aplicadas están en [-02-corrections](../-02-corrections/-02-corrections.md); la columna **Estado** indica cuáles ya se resolvieron. Las referencias de línea de los hallazgos corregidos apuntan a la zona donde estaba el código original. Cada hallazgo indica dónde está, qué pasa, el impacto y una propuesta.

Cada hallazgo corregido tiene debajo su **Solución aplicada** y lo que queda pendiente.

**Severidad**: 🔴 Alta (seguridad o pérdida/corrupción de datos) · 🟠 Media (resultado incorrecto visible) · 🟡 Baja (inconsistencia, deuda técnica).

## Resumen

| ID | Sev. | Área | Hallazgo | Estado |
|---|---|---|---|---|
| S1 | 🔴 | Seguridad | Base de datos sin autenticación ni reglas en el repositorio | 🟡 Implementado y probado en emuladores; falta desplegar (fases 0–5, ver -02) |
| S2 | 🔴 | Seguridad | Contraseñas en texto plano descargadas a todos los equipos | ✅ Corregido |
| S3 | 🔴 | Seguridad | Contraseña inicial del super-admin escrita en `app.js` | ✅ Corregido |
| S4 | 🟠 | Seguridad | Permisos validados solo en el cliente; varias funciones no revalidan | ✅ Corregido |
| S5 | 🟠 | Seguridad | Roles aterrizan en el Dashboard aunque no lo tengan permitido | ✅ Corregido |
| D1 | 🔴 | Datos | Consecutivo de factura puede duplicarse entre equipos | ✅ Corregido |
| D2 | 🔴 | Datos | Stock guardado como valor absoluto: ventas simultáneas se pisan | ✅ Corregido |
| D3 | 🟠 | Datos | Los recortes de historial no tienen efecto; tablas crecen sin límite | ✅ Corregido |
| D4 | 🟠 | Datos | `conceptos_gasto` no se sincroniza en tiempo real | ✅ Corregido |
| D5 | 🟡 | Datos | Apertura de caja simultánea en dos equipos | ✅ Corregido |
| F1 | 🟠 | Funcional | Sucursales prometen caja/pedidos separados y no lo hacen | ✅ Corregido |
| F2 | 🟠 | Funcional | Fechas en UTC en gráficas y comparaciones de reportes | ✅ Corregido |
| F3 | 🟠 | Funcional | Buscadores de Pedidos, Historial y Conteo no filtran al escribir | ✅ Corregido |
| F4 | 🟠 | Funcional | Domicilios ignora pagos divididos (difiere del Cuadre) | ✅ Corregido |
| F5 | 🟡 | Funcional | Texto literal `${pProd()}` en el editor de recetas | ✅ Corregido |
| F6 | 🟡 | Funcional | Planes Premium vs. Empresarial | ✅ Corregido |
| F7 | 🟡 | Funcional | No se puede desactivar un usuario | ✅ Corregido (con S2) |
| F8 | 🟡 | Funcional | Apartados de citas sin movimientos ni auditoría | ✅ Corregido |
| F9 | 🟡 | Funcional | Cobro de entrega de cita sin pago dividido ni caja obligatoria | ✅ Corregido |
| F10 | 🟡 | Funcional | Doble escape en el título del cobro de cita | ✅ Corregido |
| F11 | 🟡 | Funcional | Cambios de stock sin rastro (editar producto, entradas, lotes) | ✅ Corregido |
| F12 | 🟡 | Funcional | Admin del negocio puede reactivar `inventario` | ✅ Corregido (con S1) |
| F13 | 🟡 | Funcional | Gastos vs. Contable pueden no coincidir al borrar gastos de caja | ✅ Corregido |
| F14 | 🟡 | Funcional | Valor de inventario y conteo a precio de venta | ✅ Corregido |
| F15 | 🟡 | Funcional | Domiciliario y estadísticas ligados por nombre | ✅ Corregido |
| F16 | 🟡 | Funcional | La pregunta "¿imprimir?" aparece 400 ms después de cobrar y podía tapar otro modal | ✅ Corregido |
| F17 | 🟡 | Funcional | Los planes Profesional y Premium habilitan exactamente las mismas ventanas | Abierto (decisión comercial) |
| F18 | 🟡 | Funcional | Alertas de vencimiento aunque el negocio apagó el inventario | ✅ Corregido |
| R1 | 🟡 | Rendimiento | Super-admin escucha todo `data/`; logos en tabla global | ✅ Corregido (con S1) |
| C1 | 🟡 | Código | Código y campos sin uso | ✅ Corregido |
| C2 | 🟡 | Código | Errores de pantalla atrapados y ocultos | ✅ Corregido |
| R2 | 🟡 | Rendimiento | Sumar gastos por concepto relee el catálogo por cada gasto | ✅ Corregido |
| DOC1 | 🟡 | Documentación | README raíz y `prueba.html` desactualizados | ✅ Corregido (salvo historial de commits) |

---

## Seguridad

### S1 🔴 Base de datos abierta — 🟡 Implementado, falta desplegar
- **Dónde**: `firebase-config.js`, `adaptadores/salida/firebase-datos.js:222` (`initFirebase`), ausencia de reglas en el repositorio.
- **Qué pasa**: la app no usa Firebase Auth; para funcionar, las reglas de Realtime Database deben permitir lectura/escritura sin autenticar. Cualquiera con la URL de la base (visible en `firebase-config.js`, que es público) puede leer y modificar todos los negocios.
- **Impacto**: robo de datos de clientes y ventas de todos los negocios, alteración o borrado total. Anula el aislamiento entre tenants.
- **Estado**: 🟡 El código (Plan B), las reglas y la configuración de la CLI están en el repositorio y probados en los emuladores de Firebase (`npm run test:firebase`: 27 pruebas, incluida la interfaz real en Chrome). Falta lo que exige la consola de Firebase y el despliegue por fases. Detalle de la implementación y los pasos: [-02-corrections → S1](../-02-corrections/-02-corrections.md#s1--base-de-datos-sin-autenticación-ni-reglas--implementado-falta-desplegar).
- **Lo que mostró el export de producción** (`node scripts/preparar-pruebas.mjs <export>`): las 17 contraseñas siguen en texto plano (S2 aún no se desplegó), 3 usuarios tienen menos de 6 caracteres y se les pedirá una nueva al migrar, `negocios` es un array con 188 KB de logos, 15 tablas siguen en formato viejo, y hay dos nodos sin uso en la raíz (`posu`, `prueba_conexion`). Ningún bloqueo para las reglas: ningún id de negocio con `_` ni nombres de usuario repetidos.

La guía de diseño original (antes de implementar) sigue abajo como referencia.

#### Cómo resolver S1

##### La idea en una frase
Hoy la base de datos **no sabe quién le habla**: cualquiera que tenga la URL puede pedirle cualquier cosa. La solución es que cada persona inicie sesión **con Firebase** (no solo con la app), y que la base tenga **reglas** que digan "este usuario solo puede leer y escribir los datos de su negocio".

Hoy el login funciona así:

```
Navegador ──descarga TODOS los usuarios──▶ compara la contraseña en el navegador ──▶ "entra"
Base de datos: abierta para cualquiera
```

Así debe quedar:

```
Navegador ──usuario + contraseña──▶ Firebase Authentication ──▶ "sí, es Ana (uid 7f3…)"
Navegador ──"soy 7f3…, dame data_N1_ventas"──▶ Realtime Database
Reglas: ¿7f3… pertenece al negocio N1? sí ──▶ entrega
        ¿7f3… pide data_N2_ventas?       no ──▶ "Permission denied"
```

La contraseña la verifica Firebase en sus servidores. La lista de usuarios y contraseñas **deja de viajar** a los navegadores.

##### Las tres piezas

**1. Firebase Authentication (quién eres)**
- Se activa en la consola de Firebase: *Authentication → Sign-in method → Email/Password*.
- Los usuarios de Wallace entran con un nombre de usuario, no con correo. Se usa un correo interno derivado del usuario, que la persona nunca ve: `cajero1` → `cajero1@usuarios.wallace-system.app`. No tiene que ser un correo real; nadie lo recibe.
- En *Authentication → Settings → Authorized domains* se deja solo el dominio de producción (y `localhost` para pruebas).

**2. Perfil de cada usuario (a qué negocio pertenece)**
Un nodo nuevo en la base, que solo el super-admin puede escribir:

```
perfiles/
  <uid de Firebase>: { negocioId: "N1", rol: "cajero", usuario: "cajero1" }
  <uid del dueño>:   { rol: "superadmin", rolSuper: "dueno" }
```

Las reglas leen este nodo para decidir. (Alternativa: guardar `negocioId` y rol como *custom claims* dentro del token de sesión. Es más rápido para las reglas, pero obliga a usar Cloud Functions también para eso; con `perfiles` es más simple de ver y corregir desde la consola.)

**3. Reglas de seguridad (qué puedes tocar)**
Archivo `database.rules.json`, versionado en el repositorio y publicado con `firebase deploy --only database` (o pegado en la consola: *Realtime Database → Reglas*). Base propuesta:

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "perfiles": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('perfiles/' + auth.uid + '/rol').val() === 'superadmin')",
        ".write": "root.child('perfiles/' + auth.uid + '/rol').val() === 'superadmin'"
      }
    },

    "data": {
      ".read":  "root.child('perfiles/' + auth.uid + '/rol').val() === 'superadmin'",
      ".write": "root.child('perfiles/' + auth.uid + '/rol').val() === 'superadmin'",

      "negocios_r": {
        "$negId": {
          ".read": "root.child('perfiles/' + auth.uid + '/negocioId').val() === $negId",
          ".write": "root.child('perfiles/' + auth.uid + '/negocioId').val() === $negId && root.child('perfiles/' + auth.uid + '/rol').val() === 'admin'"
        }
      },

      "$clave": {
        ".read":  "auth != null && $clave.beginsWith('data_' + root.child('perfiles/' + auth.uid + '/negocioId').val() + '_')",
        ".write": "auth != null && $clave.beginsWith('data_' + root.child('perfiles/' + auth.uid + '/negocioId').val() + '_')"
      }
    }
  }
}
```

Qué hace cada parte:
- Todo cerrado por defecto (`false`).
- El super-admin lee y escribe todo `data` (lo necesita su panel y el respaldo).
- Un empleado solo lee y escribe las claves que empiezan por `data_<su negocio>_`. Si pide `data_N2_ventas` siendo de N1, Firebase responde *Permission denied*.
- `superadmins` y `usuarios` quedan fuera del alcance de los empleados (no coinciden con su prefijo).
- Cada uno lee solo su propio perfil.

##### Cambios necesarios en `app.js`

1. **Cargar el SDK de Auth** en `index.html`, junto a los otros dos de Firebase:
   ```html
   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
   ```
2. **Login nuevo** (reemplaza la comparación en el navegador de `login`, `ui/usuarios/sesion.js`):
   ```js
   async function hacerLogin(){
     const correo = usuario.trim().toLowerCase() + '@usuarios.wallace-system.app';
     try{
       const cred = await firebase.auth().signInWithEmailAndPassword(correo, pass);
       const perfil = (await FB.ref('perfiles/' + cred.user.uid).once('value')).val();
       if(perfil.rol === 'superadmin'){ /* panel super-admin + sincronizarTodo() */ }
       else { /* leer data/negocios_r/<negocioId>, validar activo, sincronizarNegocio() */ }
     }catch(e){ toast('Usuario o contraseña incorrectos','error'); }
   }
   ```
   `logout` llama `firebase.auth().signOut()`. La sesión queda guardada en el equipo: al recargar no hay que volver a escribir la contraseña (`firebase.auth().onAuthStateChanged`).
3. **No descargar tablas globales antes del login**: `cargarDeLaNube` (`adaptadores/salida/firebase-datos.js:249`) deja de leer `negocios`, `usuarios` y `superadmins`. El empleado solo lee su perfil y su negocio.
4. **`negocios` por registro**: hoy es un único array (`data/negocios`) y las reglas no pueden dar acceso a "solo el elemento 3 del array". Se pasa a `data/negocios_r/<negId>`, el mismo esquema por registro que ya usan ventas y productos (`guardarMisDatos`/`migrarTablaVieja` sirven de modelo).
5. **Altas, bajas y cambios de contraseña de usuarios** pasan a funciones de servidor (ver abajo): crear usuario, cambiar contraseña de otro, desactivar y eliminar. La app solo las llama.
6. **Dejar de usar** `verificarPass`, `passHash`, `passSal` del lado del cliente una vez terminada la migración (punto 4 del plan).

##### Por qué hacen falta Cloud Functions

Desde el navegador, Firebase solo deja a cada persona cambiar **su propia** contraseña. Que el super-admin cree usuarios, le ponga una contraseña nueva a un empleado que la olvidó, o lo desactive, requiere el **Admin SDK**, que solo corre en un servidor. Lo más simple es Cloud Functions de Firebase:

```js
// functions/index.js (Node, Admin SDK)
exports.gestionarUsuario = onCall(async (req) => {
  const yo = (await db.ref('perfiles/' + req.auth.uid).get()).val();
  if(yo?.rol !== 'superadmin') throw new HttpsError('permission-denied', 'Solo el super-admin');
  const { accion, usuario, pass, negocioId, rol } = req.data;
  const email = usuario + '@usuarios.wallace-system.app';
  if(accion === 'crear'){
    const u = await admin.auth().createUser({ email, password: pass });
    await db.ref('perfiles/' + u.uid).set({ negocioId, rol, usuario });
  }
  if(accion === 'cambiarPass'){ const u = await admin.auth().getUserByEmail(email); await admin.auth().updateUser(u.uid, { password: pass }); }
  if(accion === 'desactivar'){ const u = await admin.auth().getUserByEmail(email); await admin.auth().updateUser(u.uid, { disabled: true }); }
});
```

- Cloud Functions exige el **plan Blaze** (pago por uso) de Firebase. Para el volumen de este sistema el consumo normalmente cae dentro de la cuota gratuita, pero hay que registrar un medio de pago y conviene poner una alerta de presupuesto.
- Sin Blaze también se puede: el [Plan B](../-02-corrections/-02-corrections.md#plan-b--sin-pago-por-uso-plan-spark-gratuito--elegido-de-momento) crea usuarios desde el navegador con una segunda instancia de Firebase y resuelve el cambio de contraseña de otro creando una cuenta nueva. **Es el plan elegido de momento.**

##### Migración de los usuarios que ya existen (sin pedirles nada)

Hoy hay usuarios con contraseña guardada como hash; nadie conoce esas contraseñas. Para que cada uno conserve la suya:

1. Una función `migrarCuenta` (Cloud Function) recibe usuario + contraseña, la compara **en el servidor** contra el `passHash` de `data/usuarios` (misma fórmula de `hashPass`) y, si coincide, crea la cuenta de Firebase Auth con esa contraseña y su perfil.
2. El login nuevo intenta primero `signInWithEmailAndPassword`. Si la cuenta no existe todavía, llama a `migrarCuenta` y vuelve a intentar.
3. Cada usuario queda migrado la primera vez que entra. Nadie nota el cambio.

##### Orden de despliegue (para no dejar a nadie afuera)

| Fase | Qué se hace | Reglas de la base | Riesgo |
|---|---|---|---|
| 0 | Crear un **proyecto de Firebase de prueba** con una copia de los datos (importar el respaldo). Hacer todo allí primero. | — | Ninguno sobre producción |
| 1 | Activar Auth, plan Blaze y desplegar las Cloud Functions en producción. | Abiertas (como hoy) | Bajo: nada cambia para los usuarios |
| 2 | Publicar el `app.js` nuevo (login con Firebase + migración automática). | Abiertas | Bajo: si algo falla se vuelve a la versión anterior |
| 3 | Esperar a que todos entren al menos una vez. Comparar cuántos `perfiles` hay contra cuántos `usuarios`. A los que no entraron, el super-admin les pone contraseña nueva con `gestionarUsuario`. | Abiertas | — |
| 4 | Publicar `database.rules.json`. | **Cerradas** | Medio: si una regla quedó mal, alguien no puede trabajar. Las reglas se revierten en segundos desde la consola. |
| 5 | Borrar `passHash`/`passSal` de `data/usuarios` y la tabla global de contraseñas ya no se usa. | Cerradas | — |

##### Cómo comprobar que quedó resuelto

1. **Sin sesión no se lee nada**: abrir en el navegador `https://<proyecto>-default-rtdb.firebaseio.com/data.json`. Debe responder `"Permission denied"`. Hoy responde con todos los datos.
2. **Un negocio no ve otro**: iniciar sesión como empleado de N1 y, en la consola del navegador, ejecutar `firebase.database().ref('data/data_N2_ventas_r').once('value')`. Debe fallar con *permission denied*.
3. **Un empleado no ve credenciales**: `firebase.database().ref('data/usuarios').once('value')` debe fallar.
4. **Un empleado no se sube de rango**: intentar escribir en `perfiles/<su uid>/rol` debe fallar.
5. **Simulador de reglas** de la consola (*Realtime Database → Reglas → Simulador*): probar cada caso anterior con distintos `auth.uid`.
6. Repetir el [protocolo de verificación](../-00-execution-protocol/-00-execution-protocol.md#7-protocolo-de-verificación-smoke-test) completo con roles distintos.

##### Decisiones que debe tomar el dueño del sistema

- ~~¿Se activa el plan Blaze para Cloud Functions?~~ **Decidido: de momento no.** Se sigue el [Plan B, sin pago por uso](../-02-corrections/-02-corrections.md#plan-b--sin-pago-por-uso-plan-spark-gratuito--elegido-de-momento).
- ¿Qué puede ver un super-admin **vendedor**? Con las reglas de arriba un super-admin ve todo; si el vendedor solo debe ver sus demos, hay que darle un rol distinto (`perfiles/<uid>/rol = 'vendedor'`) y reglas que lo limiten a los negocios con `demoDe` igual a su uid.
- ¿Puede el **admin de un negocio** crear empleados (hoy solo el super-admin puede)? Si sí, la Cloud Function debe permitirlo para su propio `negocioId`.

##### Qué se gana
- Nadie sin sesión puede leer ni modificar la base.
- Un negocio no puede ver datos de otro, ni siquiera manipulando la app.
- Las contraseñas (ni siquiera sus hashes) ya no viajan a los navegadores.
- Los permisos de rol pueden reforzarse en las reglas (p. ej. que solo `admin` pueda escribir en `negocios_r`), no solo en la interfaz.

### S2 🔴 Contraseñas en texto plano y visibles — ✅ Corregido
- **Dónde estaba** (código antes de la corrección; línea aproximada en la versión actual): `login` (`ui/usuarios/sesion.js`), `TABLAS_GLOBALES` (`adaptadores/salida/firebase-datos.js`), `pantallaUsuarios` (`ui/usuarios/usuarios-admin.js`).
- **Qué pasa**: `usuarios` y `superadmins` se descargan completas a cualquier navegador **antes** del login (para validar en local) y quedan en `localStorage`. Las contraseñas se guardan y comparan sin hash, y el panel las muestra en una columna.
- **Impacto**: cualquier equipo que abra la app obtiene las credenciales de todos los empleados y super-admins.
- **Propuesta**: autenticación del lado del servidor (S1); mientras tanto, como mínimo, hash (p. ej. SHA-256 + sal) y no mostrar contraseñas en tablas.
- **Solución aplicada**:
  1. Funciones nuevas (`dominio/contrasenas.js` (reglas) y `ui/usuarios/sesion.js` (`ponerPass`, `migrarContrasenas`)): `sha256Hex` (SHA-256 en JavaScript puro, síncrono, no depende de HTTPS), `hashPass` (SHA-256 iterado 3.000 veces sobre sal + contraseña), `nuevaSal` (16 bytes aleatorios con `crypto.getRandomValues`), `ponerPass(rec, pass)` y `verificarPass(rec, pass)`.
  2. Los registros de `usuarios` y `superadmins` guardan `passHash`, `passSal` y `passIter`; el campo `pass` se elimina.
  3. `migrarContrasenas()` (llamada desde `seed`) convierte al primer arranque todas las contraseñas en texto plano y reescribe las tablas en la nube. Los usuarios entran con la misma contraseña de siempre.
  4. `login` (`ui/usuarios/sesion.js`) valida con `verificarPass`; acepta registros aún no migrados.
  5. Todo lugar que escribe contraseñas usa `ponerPass`: crear/editar super-admin, "Mi contraseña" (que valida la actual con `verificarPass`), crear negocio, crear demo, crear/editar usuario y cambio de contraseña desde el negocio.
  6. La tabla de usuarios ya no muestra contraseñas; al editar, el campo es de tipo contraseña, viene vacío y "vacío = no cambiar". Se agregó la casilla "Usuario activo" (F7).
- **Residual**: los hashes siguen descargándose a todos los equipos hasta que se haga S1; una contraseña corta podría adivinarse probando combinaciones. Volver a publicar el `app.js` anterior dejaría a todos sin acceso (hacer respaldo antes de desplegar).
- **Detalle y pruebas**: [-02-corrections](../-02-corrections/-02-corrections.md#s2--contraseñas-en-texto-plano-).

### S3 🔴 Contraseña inicial embebida — ✅ Corregido
- **Dónde estaba** (código antes de la corrección; línea aproximada en la versión actual): `seed()`, `ui/nucleo/arranque.js`.
- **Qué pasa**: la contraseña del super-admin dueño inicial está en el código fuente público.
- **Propuesta**: crear el primer super-admin con un procedimiento fuera del código (consola de Firebase o script) y forzar cambio de contraseña. Verificar que en producción ya se cambió.
- **Solución aplicada**:
  1. `seed()` (`ui/nucleo/arranque.js`) ya no crea super-admins ni contiene contraseñas.
  2. Si no existe ningún super-admin, `render` muestra la pantalla de configuración inicial (`vistaConfigInicial`, `ui/usuarios/sesion.js`): nombre, usuario y contraseña de mínimo 8 caracteres con confirmación.
  3. `crearDuenoInicial` (`ui/usuarios/sesion.js`) guarda la contraseña con hash y, con nube, usa una transacción sobre `data/superadmins` que solo escribe si la tabla sigue vacía.
  4. Nueva bandera `GLOBALES_LEIDAS` (`Datos.estado.globalesLeidas`, `adaptadores/salida/firebase-datos.js:40`): `seed` y la configuración inicial solo actúan si las tablas globales se leyeron bien de la nube, para que un fallo de red no termine sobrescribiendo datos reales.
- **Pendiente manual**: la contraseña antigua sigue en el historial de git; verificar en Firebase que el dueño de producción ya no la usa.
- **Detalle y pruebas**: [-02-corrections](../-02-corrections/-02-corrections.md#s3--contraseña-inicial-embebida-).

### S4 🟠 Autorización solo en el cliente — ✅ Corregido
- **Dónde estaba** (código antes de la corrección; línea aproximada en la versión actual): `tienePermiso` (`ui/nucleo/permisos.js`). Sin revalidación en `cobrarPedido` (3024), `anularPedido` (3192), `abrirDescuento` (2211 — el botón se muestra a todos), `movimientoCaja` (4074), `toggleNegocio` (1806), `eliminarCliente`, `eliminarGasto`, `nuevoGasto`.
- **Impacto**: cualquier usuario puede ejecutar acciones sin permiso desde la consola; en el caso de descuentos, incluso desde la interfaz.
- **Propuesta**: validar `tienePermiso` al inicio de cada acción sensible; mostrar el botón de descuento solo con `descuento`; a futuro, reglas de servidor (S1).
- **Solución aplicada**:
  1. Funciones nuevas (`ui/nucleo/permisos.js`): `exigirPermiso(accion, texto)`, `esAdminSistema()` (dueño o ayudante, no vendedor), `pantallasPermitidas()` y `puedeVerPantalla(id)`.
  2. Validación al **inicio** de más de 25 funciones: `cobrarPedido` y `cobrarDirecto` (permiso `cobrar`), `anularPedido` (`anular`), `abrirDescuento` (`descuento`; el botón ya solo se muestra con el permiso), `movimientoCaja` (`abrircaja` o jefe), funciones del super-admin (`descargarRespaldo`, `asignarVendedor`, `configNegocio`, `usuariosNegocio`, `guardarConfig`, `editarUsuario`, `eliminarUsuario`, sucursales, informe mensual), `toggleNegocio` (el vendedor solo sus demos), y por pantalla: clientes, gastos, Mi Negocio, pedidos, domicilios, cocina y citas.
  3. `render` no deja abrir la configuración ni los usuarios de un negocio a un vendedor.
- **Cambio visible**: un usuario sin permiso `cobrar` (p. ej. mesero) ya no puede usar "Cobrar ahora" en negocios de cobro directo.
- **Residual**: sigue siendo control en el navegador; la protección real llega con S1.
- **Detalle y pruebas**: [-02-corrections](../-02-corrections/-02-corrections.md#s4--permisos-solo-en-la-interfaz-).

### S5 🟠 Pantalla inicial sin control de rol — ✅ Corregido
- **Dónde estaba** (código antes de la corrección; línea aproximada en la versión actual): `login` fija `STATE.pageNeg='inicio'` (`ui/nucleo/estado.js`); `renderContenido`/`vistaNegocio` no comprueban que la pantalla esté permitida.
- **Impacto**: el rol `cocina` (sin `inicio`) ve al entrar el Dashboard con ventas y dinero.
- **Propuesta**: al iniciar sesión, ir a la primera pantalla permitida del menú y validar `STATE.pageNeg` contra `armarMenu()` en cada render.
- **Solución aplicada**:
  1. `login` deja la pantalla inicial vacía (`STATE.pageNeg=''`).
  2. `pantallaValida()` (`ui/nucleo/permisos.js`) se ejecuta antes de dibujar en `vistaNegocio` y `renderContenido`: si la pantalla pedida no está entre las permitidas del menú, cambia a la primera permitida.
- **Resultado**: cocina ya no entra al Dashboard; un cajero que pide Contable se queda en su pantalla.
- **Detalle y pruebas**: [-02-corrections](../-02-corrections/-02-corrections.md#s5--pantalla-inicial-sin-control-de-rol-).

## Datos y concurrencia

### D1 🔴 Consecutivo de factura duplicable — ✅ Corregido
- **Dónde estaba** (código antes de la corrección; línea aproximada en la versión actual): `armarVenta` (`ui/ventas/nueva-venta.js`), `cobrarCitaEntregada` (`ui/citas/citas.js`). La tabla `factura_seq` está declarada pero no se usa.
- **Qué pasa**: el número es "mayor número que tengo en este equipo + 1". Dos equipos que venden a la vez (o uno sin internet) generan el mismo número.
- **Propuesta**: usar una transacción de Firebase sobre `data_<neg>_factura_seq` para reservar el consecutivo, con prefijo por equipo como respaldo offline.
- **Solución aplicada** (`ui/ventas/nueva-venta.js`; reglas en `dominio/facturas.js`; reserva en `Datos.reservarConsecutivo`):
  1. `reservarFactura()`: cada equipo reserva de antemano su próximo número con una transacción sobre `data_<negocio>_factura_seq` (máximo entre el contador y la mayor factura local, + 1). Firebase serializa las transacciones, así que dos equipos nunca reciben el mismo número.
  2. `siguienteFactura()`: usa el número reservado (instantáneo) y pide el siguiente. Sin reserva (sin internet) usa el mayor entre lo conocido localmente y lo último reservado, + 1.
  3. Se reserva al terminar de bajar las ventas del negocio, al entrar como supervisor y tras cada uso; la reserva se descarta al salir o cambiar de negocio.
  4. Lo usan `armarVenta` y `cobrarCitaEntregada`. La tabla `factura_seq` ahora sí se usa.
- **Comportamiento**: puede haber saltos en la numeración (número reservado que no se usó), nunca repetidos con conexión.
- **Residual**: un equipo sin conexión desde el inicio aún podría repetir un número.
- **Detalle y pruebas**: [-02-corrections](../-02-corrections/-02-corrections.md#d1--consecutivo-de-factura-repetible-).

### D2 🔴 Stock con "última escritura gana" — ✅ Corregido
- **Dónde estaba** (código antes de la corrección; línea aproximada en la versión actual): `moverInventario` (`ui/inventario/motor.js`) calcula `p.stock = antes + cant` en el equipo y `_subirRegistros` sube el valor absoluto del campo `stock`.
- **Qué pasa**: si dos equipos venden el mismo producto casi al mismo tiempo, ambos parten del mismo stock y uno sobrescribe al otro: se pierde un descuento.
- **Impacto**: inventario descuadrado sin rastro, justamente lo que el motor busca evitar.
- **Propuesta**: aplicar los cambios de stock con `transaction()` o `ServerValue.increment()` sobre `.../<id>/stock` (y lotes), en vez de escribir el valor absoluto.
- **Solución aplicada**:
  1. Nueva función `cambiarStock(tabla, id, fn)` (`adaptadores/salida/firebase-datos.js:180`): el cambio se describe como una función ("restar 2 y descontar de los lotes"), se aplica de inmediato en el equipo y además dentro de una transacción de Firebase sobre `data_<neg>_<tabla>_r/<id>`, que la vuelve a aplicar sobre el valor real del servidor si otro equipo se adelantó.
  2. Pasan por `cambiarStock`: `moverInventario` (ventas, anulaciones, ediciones, salidas, cuentas canceladas), `entradaStock` (los ids de lote se generan fuera para que un reintento no los duplique), `retirarLote`, `entradaInsumo`, `descontarApartado`, `devolverApartado` y el ajuste de `guardarConteo`.
  3. El ajuste por conteo ahora aplica la **diferencia** contada en vez de fijar el valor, para no borrar ventas hechas mientras se contaba.
- **Residual**: editar el producto desde su formulario sigue fijando el stock como valor (F11).
- **Detalle y pruebas**: [-02-corrections](../-02-corrections/-02-corrections.md#d2--stock-última-escritura-gana-).

### D3 🟠 Historiales sin límite efectivo — ✅ Corregido
- **Dónde estaba** (código antes de la corrección; línea aproximada en la versión actual): `logAudit` (`slice(0,800)`, `ui/usuarios/auditoria.js`), `moverInventario` (`slice(0,1000)`), `guardarConteo` (`slice(0,200)`), `guardarMisDatos` (`adaptadores/salida/firebase-datos.js:149`).
- **Qué pasa**: `guardarMisDatos` fusiona con todo lo que hay en caché y nunca borra; el recorte no elimina nada ni local ni en la nube.
- **Impacto**: `auditoria`, `movimientos` y `conteos` crecen indefinidamente; más datos en cada carga y en cada equipo.
- **Propuesta**: eliminar explícitamente los registros sobrantes con `eliminarMisDatos`, o archivar por mes; o asumir el crecimiento y quitar los `slice` engañosos.
- **Solución aplicada**: se quitaron los recortes engañosos de `logAudit`, `moverInventario` y `guardarConteo`, y ahora se envían **solo los registros nuevos** (`guardarMisDatos(tabla, [nuevo])`). Nueva función `registrarMovimientos(lista)` (`ui/inventario/motor.js`).
- **Decisión**: se conserva todo el historial (la auditoría no debe perder registros). Las pantallas siguen mostrando solo lo más reciente.
- **Residual**: las tablas crecen con el tiempo; si hace falta, archivar por mes.
- **Detalle y pruebas**: [-02-corrections](../-02-corrections/-02-corrections.md#d3--recortes-de-historial-sin-efecto-).

### D4 🟠 Conceptos de gasto no sincronizados — ✅ Corregido
- **Dónde estaba** (código antes de la corrección; línea aproximada en la versión actual): `getConceptosGasto`/`guardarConceptos` (`ui/gastos/gastos.js`), clave `data_<neg>_conceptos_gasto` fuera de `TABLAS`.
- **Qué pasa**: se escribe en la nube pero ningún equipo de negocio la escucha ni la baja con "Actualizar"; además `eliminarNegocio` solo la borra si está en el caché del equipo que elimina.
- **Propuesta**: agregar `conceptos_gasto` a `TABLAS` y a `TABLAS_UNICAS`.
- **Solución aplicada**: `conceptos_gasto` se agregó a `TABLAS` y a `TABLAS_UNICAS` (`adaptadores/salida/firebase-datos.js:19`, `23`). Ahora se escucha en tiempo real, se baja con "Actualizar", se borra junto con el negocio y entra en el respaldo.
- **Detalle y pruebas**: [-02-corrections](../-02-corrections/-02-corrections.md#d4--conceptos-de-gasto-sin-sincronizar-).

### D5 🟡 Apertura de caja simultánea — ✅ Corregido
- **Dónde estaba** (código antes de la corrección; línea aproximada en la versión actual): `abrirCaja` (`ui/caja/caja.js`).
- **Qué pasa**: la verificación "ya hay una caja abierta" es local; dos equipos que abren a la vez crean dos cajas y la última sobrescribe a la primera (las ventas con el `cajaId` perdido igual entran por fecha ≥ apertura, pero puede quedar una base distinta).
- **Propuesta**: transacción sobre `caja_actual`.
- **Solución aplicada** (`ui/caja/caja.js`; `cajaDe` en `dominio/caja.js`; `transaccionUnica` en `adaptadores/salida/firebase-datos.js:211`):
  1. Nuevas funciones `transaccionUnica(tabla, fn)` (escribe una tabla única con transacción, o en local sin nube) y `cajaDe(valor)`.
  2. `abrirCaja` solo escribe si **en la nube** no hay caja abierta; si otro equipo se adelantó, avisa "Ya hay una caja abierta por …" y no toca nada.
  3. `cerrarCaja` solo vacía la caja si en la nube sigue abierta esa misma caja; si otro equipo ya cerró, avisa y no registra un segundo cierre. El registro pasó a `terminarCierre(...)`, que recalcula con la caja tal como estaba en el servidor (movimientos de todos los equipos).
- **Cambio visible**: la tirilla de cierre se imprime después de la confirmación de la nube; si el navegador bloquea la ventana, se reimprime desde Contable.
- **Detalle y pruebas**: [-02-corrections](../-02-corrections/-02-corrections.md#d5--apertura-y-cierre-de-caja-simultánea-).

## Funcionales

### F1 🟠 Sucursales a medio implementar — ✅ Corregido
- **Dónde**: `TABLAS_POR_SUCURSAL` (`(eliminada)`, sin uso), `pantallaConfig` pestaña Sucursales (`ui/configuracion/config-negocio.js`), `panelSuperAdmin` lee `data_<id>_ventas-<suc>` (`ui/super-admin/panel.js`) que nunca se escribe.
- **Qué pasa**: la configuración dice "Cada sucursal maneja su caja, pedidos y cierres por separado", pero ventas, caja y cierres son únicos por negocio. El selector de sucursal solo cambia un aviso.
- **Impacto**: un negocio con dos sedes comparte una sola caja y mezcla pedidos.
- **Solución aplicada** (2026-10-08): cada sede tiene **su propia caja** dentro de `caja_actual` (`{cajas:{<sede>:caja}}`; un negocio con una sola sede sigue guardando `[caja]` como siempre), su **base del día siguiente** (`config.basesSucursal`), y ventas y cierres llevan `sucursalId`. Pedidos, Reimpresiones y el cierre de caja ven solo la sede activa; Dashboard, Reportes, Contable y la numeración de facturas siguen siendo de todo el negocio. Reglas en `dominio/caja.js` (`cajaDe(v, sede)`, `conCaja`, `cajasDe`, `sucursalesConCaja`, `deSucursal`); la interfaz entra a la caja solo por `cajaActual()` / `guardarCajaActual()` (`ui/nucleo/permisos.js`). No se puede quitar una sede con caja abierta. Probado en navegador: abrir, vender y cerrar en una sede no toca la otra.

### F2 🟠 Fechas UTC en reportes — ✅ Corregido
- **Dónde**: `inicio` (`ui/reportes/dashboard.js`, `3794`), `reportes` (`ui/reportes/reportes.js`, `5650`, `5660`, `5670`).
- **Qué pasa**: las claves de día se arman con `toISOString()` (UTC) y se comparan con `jornadaDe(v)` (fecha local). En Colombia, desde las 7 p. m. la barra de "hoy" usa la fecha de mañana y aparece en 0; la comparación "hace 7 días" mira `v.fecha` en UTC.
- **Solución aplicada**: Dashboard y Reportes arman las claves de día y mes con `fechaLocal`, y "hace 7 días" compara la jornada de la venta. **Mismo error encontrado en Gastos**: los gastos de caja se guardaban con `fecha:now()` (hora UTC), así que uno de las 8 p. m. del último día del mes caía en el mes siguiente en Gastos y Contable. Ahora guardan el día de la jornada, y para los viejos `dominio/fechas.js` → `diaDe`/`mesDe` convierte el ISO al día local.

### F3 🟠 Buscadores que no filtran — ✅ Corregido
- **Dónde**: Pedidos (`ui/ventas/pedidos.js`), Conteo (`ui/inventario/conteo.js`), Historial (`ui/reportes/historial.js`).
- **Qué pasa**: `oninput` solo asigna la variable (`_pBusca`, `_conteoBusca`, `_hBusca`) sin redibujar; la tabla no cambia hasta otro render.
- **Solución aplicada**: los tres buscadores llaman `render()` al escribir, como los demás (el foco y el cursor se conservan; en Conteo lo contado no se pierde porque vive en `_conteo`).

### F4 🟠 Domicilios vs. Cuadre — ✅ Corregido
- **Dónde**: `domicilios` (`ui/clientes/domicilios.js`, `5607`).
- **Qué pasa**: clasifica efectivo/banco con `v.domPorBanco || v.metodo==='banco'` (`domPorBanco` nunca se asigna y `metodo` es `mixto` en pagos divididos), mientras `cuadreDomi` usa `reparte()`.
- **Solución aplicada**: Domicilios usa `reparte(v, v.valorDom)`, la misma regla del Cuadre; con pago dividido la fila dice "Mixto" con cuánto entró en efectivo y cuánto por banco.

### F5 🟡 Plantilla sin interpolar — ✅ Corregido
- **Dónde**: `recetaFilasHTML` (`ui/inventario/catalogo.js`).
- **Qué pasa**: el mensaje usa comillas simples con `${pProd()}`; se ve el texto literal.
- **Solución aplicada**: plantilla con backticks (`ui/inventario/catalogo.js`).

### F6 🟡 Nombres de plan — ✅ Corregido
- **Dónde estaba**: `nuevoNegocio` (Básico/Profesional/**Premium**), demos (Premium), `pantallaConfig` (Básico/Profesional/**Empresarial**), `VENTANAS_POR_PLAN`.
- **Impacto**: un negocio Premium aparece sin plan seleccionado en Configuración y al guardar pasa a Básico; la plantilla de ventanas no reconoce Premium.
- **Solución aplicada**: el export de producción confirmó que los datos usan **Premium** (3 negocios) y nunca "Empresarial". Constante `PLANES = ['Básico','Profesional','Premium']` y `planDe(neg)` (junto a `ROLES` en `app.js`): crear negocio, Configuración y `VENTANAS_POR_PLAN` usan la misma lista; un "Empresarial" que hubiera quedado se lee como Premium.

### F7 🟡 Usuarios no desactivables — ✅ Corregido (con S2)
- **Dónde estaba** (código antes de la corrección; línea aproximada en la versión actual): `login` filtra `activo!==false`, pero ninguna pantalla cambia `activo`.
- **Propuesta**: agregar "Activo" al formulario de usuario (útil para bajas temporales sin perder historial).
- **Solución aplicada**: casilla "Usuario activo" en el formulario de usuario del super-admin (`editarUsuario`). Un usuario desactivado no puede iniciar sesión y conserva su historial. Ver [-02-corrections](../-02-corrections/-02-corrections.md#s2--contraseñas-en-texto-plano-).

### F8 🟡 Apartados sin rastro — ✅ Corregido
- **Dónde**: `descontarApartado`/`devolverApartado` (`ui/citas/citas.js`/`7465`).
- **Qué pasa**: no usan `moverInventario`, no generan movimientos ni auditoría.
- **Solución aplicada**: `descontarApartado`/`devolverApartado` pasan por `moverInventario` (quedan en Movimientos, respetan lotes y si el negocio lleva inventario) y apartar, no recoger, cancelar o eliminar una cita con apartados queda en Auditoría.

### F9 🟡 Cobro de entrega de cita — ✅ Corregido
- **Dónde**: `cobrarCitaEntregada` (`ui/citas/citas.js`).
- **Qué pasa**: un solo método de pago (sin `pagos{}`), no valida caja abierta (crea venta con `cajaId:null`), no ofrece descuento ni propina.
- **Solución aplicada**: la entrega se cobra con el mismo `abrirCobro` de cualquier venta (pago dividido, cambio, propina, verificación de transferencias), con `stockAplicado` según la cita para no descontar dos veces. Exige la caja abierta y el permiso `cobrar`. `abrirCobro` recibe opciones (`sinCarrito`, `alCobrar`, `pantalla`) para no borrar el pedido que se esté armando en Nueva Venta.

### F10 🟡 Doble escape — ✅ Corregido
- **Dónde**: `cobrarCitaEntregada` (`ui/citas/citas.js`) pasa `escapeHtml(cita.cliente)` en `titulo` y `abrirModal` vuelve a escapar.
- **Solución aplicada**: desapareció con F9 (ya no hay título propio). Se buscaron los demás textos que se escapaban dos veces: los mensajes de borrar empresa, borrar demo y borrar gasto pasaban `escapeHtml` a `confirmarModal`, que ya escapa (un negocio "Pan & Café" se veía `Pan &amp; Café`). Corregidos; además `confirmarModal` respeta los saltos de línea.

### F11 🟡 Cambios de stock sin rastro — ✅ Corregido
- **Dónde**: `editarProducto` (stock editable sin movimiento, `ui/inventario/catalogo.js`), `entradaStock`, `entradaInsumo`, `retirarLote`, `editarInsumo` (no auditan).
- **Solución aplicada**: editar un producto o insumo ya no fija el stock como valor: aplica la **diferencia** con transacción (no pisa ventas de otros equipos, como D2) y deja un movimiento `ajuste` y un registro en Auditoría. Crear producto con stock deja la entrada "Stock inicial". Entradas de stock e insumos y retiros de lote quedan en Auditoría.

### F12 🟡 Inventario reactivable desde el negocio — ✅ Corregido
- **Dónde estaba**: `guardarMiNegocio`.
- **Qué pasa**: la casilla "Llevar control de inventario" agrega `inventario` a `funciones` aunque el super-admin lo haya quitado en "Ventanas habilitadas".
- **Solución aplicada**: S1 lo volvía obligatorio (las reglas no dejan al admin del negocio escribir `funciones`). `inventarioHabilitado(neg)` = lo habilitó el proveedor; la casilla de Mi Negocio guarda la preferencia `inventarioApagado` y queda deshabilitada si el plan no incluye inventario. `usaInventario` = habilitado y no apagado.

### F13 🟡 Gastos vs. Contable — ✅ Corregido
- **Dónde**: `gastosneg` (todos los gastos de `gastos_negocio`), `contable` (gastos de caja desde los cierres).
- **Qué pasa**: si se borra un gasto de origen caja en Gastos, Contable lo sigue contando.
- **Solución aplicada**: los gastos de caja no se borran desde Gastos (se muestra 🔒 Caja y se explica que se corrigen con una Entrada en la caja). La única fuente es la caja y su cierre.

### F14 🟡 Valorización a precio de venta — ✅ Corregido
- **Dónde**: `inventario` (`ui/inventario/catalogo.js`), `itemsParaContar` (`ui/inventario/conteo.js`).
- **Qué pasa**: "Valor del inventario" y las diferencias del conteo de productos usan `precio` de venta; los insumos usan `costo`.
- **Solución aplicada**: campo "Costo por unidad" en el producto. El valor del inventario y las diferencias del conteo usan el costo (`dominio/inventario.js` → `costoUnitario`, `valorInventario`); los productos sin costo se valoran a precio de venta y la tarjeta dice cuántos son.

### F15 🟡 Relaciones por nombre — ✅ Corregido
- **Dónde**: `domiciliario` en ventas (nombre), estadísticas de productos agrupadas por `i.nombre`, propinas por mesero contadas por rol.
- **Solución aplicada**: las ventas guardan `domiciliarioId` y `vendedorId` además del nombre; Domicilios y el Cuadre agrupan por id. Los más vendidos (Reportes, Contable, informe mensual) se agrupan por `prodId` (`dominio/ventas.js` → `vendidoPorProducto`): renombrar un producto ya no parte sus cifras y dos productos con el mismo nombre no se suman. Propinas: el reparto en partes iguales cuenta solo meseros **activos** y además se muestra quién recibió cada propina (`propinasPorPersona`). Las ventas viejas sin id se agrupan por nombre, como antes.

### F16 🟡 Pregunta de impresión con retraso — ✅ Corregido
- **Dónde estaba**: `ui/ventas/cobro.js`, `ui/ventas/nueva-venta.js` (remisión y comanda corregida) y `ui/citas/citas.js`: `setTimeout(()=>confirmarModal(…),400)`.
- **Qué pasaba**: el modal "¿Imprimir?" se abre 400 ms después. Si en ese lapso se abrió otro modal (p. ej. el cobro de otro pedido), lo reemplaza: `abrirModal` usa un solo contenedor. Lo encontró la prueba de recorrido al encadenar acciones rápido.
- **Impacto**: bajo (una persona rara vez actúa en menos de medio segundo), pero puede perderse lo escrito en el modal tapado.
- **Solución aplicada**: `preguntarDespues(mensaje, alConfirmar, texto, ms)` (`ui/nucleo/componentes.js`) no abre la pregunta si ya hay otro modal activo; lo impreso se repite desde Reimpresiones. El ajuste de pago diferido (`ajustarPagoVenta`) no cambió: ese no se puede omitir.

### F17 🟡 Premium igual a Profesional
- **Dónde**: `VENTANAS_POR_PLAN` (`dominio/negocio.js`).
- **Qué pasa**: la plantilla de ventanas de Premium es idéntica a la de Profesional; el precio distinto no habilita nada adicional (el super-admin puede marcar ventanas a mano).
- **Propuesta**: decidir qué incluye cada plan (p. ej. sucursales, combos o cuentas abiertas solo en Premium).

### F18 🟡 Alertas de vencimiento con el inventario apagado — ✅ Corregido
- **Dónde estaba**: `avisarVencimientos` revisaba `funciones` en vez de `usaInventario`.
- **Qué pasaba**: un negocio que apagó el inventario desde Mi Negocio (F12) seguía viendo avisos de lotes por vencer.
- **Solución aplicada**: usa `usaInventario(neg)` (`ui/inventario/motor.js`). Encontrado al mover las reglas de negocio al dominio.

## Rendimiento

### R1 🟡 Volumen de descarga — ✅ Corregido (con S1)
- **Con S1**: `negocios` pasó a `data/negocios_r/<id>`; cada empleado descarga solo su negocio (con su logo), no los 188 KB de logos de todos. Sigue pendiente lo del super-admin.
- `sincronizarTodo` (`adaptadores/salida/firebase-datos.js:339`) escucha `value` de todo `data/`: cada cambio en cualquier negocio reenvía y re-serializa todo al super-admin.
- El logo en base64 vive dentro de `negocios`, que descargan todos los equipos.
- **Solución aplicada** (con cuentas de Firebase): el panel del super-admin ya no escucha todo `data`. Escucha negocios, administradores, usuarios y un **resumen** por negocio (`data_<neg>_resumen`: ventas por día de los últimos 62 días, por mes, total y cantidad), que publican los equipos del propio negocio cada 20 s si cambió (`ui/reportes/resumen.js`, regla en `dominio/ventas.js`). Los datos completos de un negocio se leen bajo demanda: al supervisarlo (en vivo) y al sacar su informe mensual (`Datos.leerNegocioCompleto`). Botón "📊 Calcular cifras" para los negocios que aún no tienen resumen. Los logos siguen dentro del negocio: con `negocios_r` cada empleado ya baja solo el suyo.

### R2 🟡 Conceptos de gasto — ✅ Corregido
- `acumConcepto` (`ui/gastos/gastos.js`) vuelve a armar el catálogo de conceptos (`getConceptosGasto`) por cada gasto que suma. Con cientos de gastos en Contable son cientos de lecturas y ordenamientos.
- **Solución aplicada**: Gastos y Contable arman el catálogo una vez por pantalla (`catalogoConceptos()`) y lo pasan a cada suma.

## Código sin uso

### C1 🟡 — ✅ Corregido
- **Solución aplicada**: eliminados `buscarCliente`, `claveCajaActual`, `TABLAS_POR_SUCURSAL`, las variables sin uso de `imprimirCierre` y el `|| true` de `registrarSalida` (la remisión de Logística se ofrece siempre, a propósito); `domPorBanco` ya no se lee (F4); `usaCaja` se usa en el cobro de citas (F9); `data_<neg>_usuarios` es la tabla de usuarios de cada negocio (S1).
- ~~`buscarCliente`~~, ~~`claveCajaActual`~~ y ~~`TABLAS_POR_SUCURSAL`~~: eliminados al partir la interfaz (2026-10-08).
- `buscarCliente` (`(eliminada)`): no se invoca.
- `TABLAS_POR_SUCURSAL` (`(eliminada)`) declarado, sin uso (`factura_seq` ya se usa desde la corrección D1).
- `usaCaja` (perfiles y negocio): se escribe pero no se lee.
- ~~`data_<neg>_usuarios`: se escucha pero no se usa~~ → con S1 es la tabla de usuarios de cada negocio (sin contraseñas).
- `imprimirCierre` (`ui/caja/caja.js`): variables `metodos`, `porMet`, `ventasCierre` sin uso.
- `v.domPorBanco`: se lee, nunca se escribe.
- `registrarSalida` (`ui/ventas/nueva-venta.js`): condición `|| true` que vuelve el `if` siempre verdadero.

### C2 🟡 Errores de pantalla ocultos — ✅ Corregido
- **Dónde**: `renderContenido` (`ui/nucleo/navegacion.js`) atrapa la excepción de una pantalla, la escribe en la consola y muestra "Ocurrió un error al mostrar esta pantalla"; `refrescarSiSePuede` (`ui/nucleo/estado.js`) hace `try{ render(); }catch(e){}` y la descarta en silencio.
- **Impacto**: un error real en producción no lo ve nadie salvo que alguien abra la consola del navegador.
- **Mitigación aplicada**: `tests/navegador/recorrido.test.mjs` falla ante cualquier "Error en pantalla" o error de consola, y recorre todas las pantallas de 18 negocios.
- **Solución aplicada**: `reportarError(donde, e)` (`ui/nucleo/componentes.js`): va a la consola, avisa a la persona y queda en la Auditoría del negocio como "Error del sistema" (cada error distinto una vez por sesión). Lo usan `renderContenido`, `refrescarSiSePuede` y las alertas de vencimiento.

## Documentación del repositorio

### DOC1 🟡 — ✅ Corregido (salvo el historial)
- **Solución aplicada**: README raíz sin credenciales falsas, con archivos, pruebas y despliegue actuales; `prueba.html` ya no escribe en la base ni lee `posu`: dice qué reglas están publicadas (transición o cerradas) y permite probar un inicio de sesión. El historial de commits no se puede corregir sin reescribirlo.
- `README.md` raíz: credenciales demo (`superadmin/super123`, `admin/admin123`) que no coinciden con `seed()`; dice "Copia los 7 archivos" (son 8 con `prueba.html`); no menciona Logística, combos, cuentas abiertas, lotes ni conteos.
- `prueba.html`: prueba la lectura sobre el nodo `posu` (no `data`) y deja escrito `prueba_conexion`.
- Historial de commits con mensajes genéricos ("Add files via upload", "Update print statement…") que no describen los cambios.
