# Seguridad de la interfaz: código en línea (`onclick`, `style`) y eventos delegados

Por qué la fase 8 quitó los manejadores `onclick="…"` y los `style="…"` fijos del HTML generado, qué ataques permitían, qué cambió y qué riesgo queda. Complementa la sección 11 de [-03-architecture](-03-architecture.md) y el hallazgo **S6** de [-01-to-review](../-01-to-review/-01-to-review.md).

Las rutas `ui/…` son relativas a `src/adaptadores/entrada/`.

## 1. Resumen

| Riesgo | Antes de la fase 8 | Ahora |
|---|---|---|
| Inyección de JavaScript dentro de un `onclick="…"` armado con datos | **Real**: el nombre de una categoría de producto ejecutaba código (S6) | No hay `onclick`; los datos van en `data-x` y se leen con `this.dataset.x` |
| HTML inyectado con `onerror=`/`onload=` (si falta `escapeHtml`) | Se ejecuta | Se sigue ejecutando: solo lo frena una CSP (sección 5) |
| Política de seguridad de contenido (CSP) que bloquee código en línea | Imposible: la app dependía de 250 manejadores en línea | **Posible**: propuesta y probada en local, aún no activada ([csp.md](csp.md)) |
| Texto de un `data-click` inyectado | — | Solo llama funciones **exportadas** con argumentos simples, sin `eval` |
| `style="…"` con datos del usuario (inyección de CSS) | No había datos del usuario en estilos | Igual; los estilos fijos pasaron a clases y en línea solo quedan números calculados |

## 2. Por qué `escapeHtml` no protegía dentro de un `onclick`

`escapeHtml` cambia `'` por `&#39;` y `"` por `&quot;`. Eso protege el **HTML**, pero un atributo `on…` contiene **JavaScript**. El navegador primero decodifica las entidades del atributo y después ejecuta el resultado:

```
escrito en la plantilla:  onclick="_vCat='${escapeHtml(c)}';render()"
con c = Niño's        →   onclick="_vCat='Niño&#39;s';render()"
lo que ejecuta        →   _vCat='Niño's';render()        ← error de sintaxis: el botón no funciona
```

Si el texto no es un nombre inocente sino algo armado a propósito, el apóstrofo **cierra la cadena** y lo que sigue se ejecuta como código:

```
c = x';alert(1);'     →   lo que ejecuta: _vCat='x';alert(1);'';render()
```

Escapar bien dentro de JavaScript en un atributo HTML exige **dos** escapes en el orden correcto (primero para JS, luego para HTML). Es fácil equivocarse, y nadie lo revisa. La solución de la fase 8 es no mezclar código y datos: el dato va escapado en un atributo `data-` y la acción lo lee como texto:

```
data-click="elegirCategoriaVenta(this.dataset.cat)" data-cat="${escapeHtml(c)}"
```

### 2.1 El caso real (hallazgo S6)

En la versión anterior a la fase 8 había **3 lugares** donde un dato escrito por un usuario quedaba dentro de un `onclick`: los botones de categoría de **Nueva Venta** (`ui/ventas/nueva-venta.js`) e **Inventario** (`ui/inventario/catalogo.js`, dos veces). Los otros 91 `onclick` con `${…}` usaban ids generados por la app o constantes, que no traen comillas.

- **Quién podía atacar**: cualquier usuario que pueda crear o editar productos (el campo "Categoría"), por ejemplo un empleado con permiso de inventario.
- **A quién afectaba**: a todos los que abrieran Nueva Venta o Inventario de ese negocio, en cualquier equipo: el dueño, el administrador y el **super-admin** cuando entra a un negocio desde el panel. El producto se sincroniza a todos los equipos (XSS **almacenado**).
- **Qué podía hacer el código inyectado**: todo lo que puede hacer la sesión de la víctima, porque corre con sus permisos y en el mismo origen:
  - llamar cualquier función de la app como si la víctima la hubiera pulsado (crear usuarios, cambiar contraseñas, borrar datos, anular ventas);
  - leer la sesión de Firebase Authentication que guarda el navegador y usarla desde otro lado, con los permisos de la víctima según las reglas de la base;
  - con la sesión de un super-admin, leer y escribir los datos de **todos** los negocios.
- **Efecto visible sin ataque**: una categoría con apóstrofo (`Niño's`, `D'Luca`) dejaba su botón sin funcionar.
- **Corrección**: fase 8, sección 3.

## 3. Tipos de ataque con manejadores en línea

### 3.1 Inyección en un atributo de evento (`onclick`, `oninput`, `onchange`…)
El de la sección 2. Pasa cuando un dato se interpola **dentro** del código del atributo. Ni `escapeHtml` ni ningún escape de HTML basta solo.
**Ahora**: no hay atributos `on…` en las plantillas. `tests/ui/estructura.test.mjs` falla si aparece uno, y el recorrido del navegador revisa que no quede ninguno en el HTML ya dibujado de las 327 pantallas.

### 3.2 HTML inyectado con manejadores (`<img src=x onerror=…>`)
Si en algún lugar se arma HTML con un dato **sin** `escapeHtml`, el atacante puede meter una etiqueta propia con `onerror`, `onload` o `onfocus`. `innerHTML` no ejecuta `<script>`, pero **sí** ejecuta esos atributos.
**Ahora**: la fase 8 no elimina este riesgo por sí misma; depende de escapar siempre (regla de `CLAUDE.md`). Lo que lo bloquea de verdad es una CSP sin `'unsafe-inline'` en `script-src` (sección 5), que la fase 8 hizo posible.

### 3.3 Enlaces `javascript:`
Un `href` o `src` armado con un dato del usuario puede llevar `javascript:…`, que se ejecuta al pulsarlo. Hoy la interfaz no arma enlaces con datos del usuario. La CSP también lo bloquea.

### 3.4 Sin CSP posible
Una Content-Security-Policy le dice al navegador qué código puede ejecutar. Con 250 manejadores en línea, la única CSP compatible tenía que permitir `'unsafe-inline'`. Eso deja pasar justamente cualquier código inyectado, así que la CSP no servía de nada. Sin código en línea, la CSP se puede restringir a archivos del propio sitio y de Firebase.

### 3.5 Lo que sigue posible con `data-click` (riesgo residual)
Si alguien logra inyectar HTML con un atributo `data-click`, `ui/nucleo/eventos.js` lo interpreta como **una sola llamada** con argumentos simples. Los argumentos permitidos son `'texto'`, números, `true`/`false`/`null`, `this`, `this.value`, `this.dataset.x` y `event`.
- **No** hay `eval` ni `new Function`: no se puede escribir código.
- La acción se busca solo entre las funciones **exportadas** por los módulos de la interfaz, en un objeto sin prototipo. No se puede llamar `fetch`, `eval`, `alert` ni nada de `window`, ni nombres como `constructor`.
- Sí se podría disparar una acción exportada con argumentos elegidos (p. ej. abrir el formulario de borrar algo) **cuando la víctima haga clic** en el elemento inyectado. Por eso:
  - toda acción sensible valida el permiso al inicio (`exigirPermiso`, `esAdminSistema`, `puedeVerPantalla`);
  - las acciones destructivas piden confirmación;
  - las reglas de la base (S1) limitan lo que cada sesión puede escribir.

## 4. Tipos de ataque con estilos en línea (inyección de CSS)

Aplican cuando un dato del usuario llega a un `style="…"` o a un `<style>`.

| Ataque | Cómo funciona | Riesgo en Wallace System |
|---|---|---|
| **Superposición o engaño de interfaz** (UI redressing) | `position:fixed;inset:0;z-index:99999` tapa la pantalla con un falso "inicie sesión de nuevo" que roba la contraseña, o esconde un aviso o un botón (p. ej. el de anular) | Ningún `style` usa datos del usuario |
| **Rastreo con recursos externos** | `background:url(https://atacante/…)` hace que el navegador de la víctima pida un recurso: delata su IP y cuándo abrió la pantalla | Igual: no hay datos del usuario en estilos |
| **Lectura de datos con selectores** | Con un `<style>` inyectado, reglas como `input[value^="a"]{background:url(…?a)}` filtran letra por letra valores de la página | Requiere inyectar HTML (3.2); no aplica a `style="…"` solo |
| **Expresiones en CSS** (`expression()`) | Ejecutaba JavaScript desde CSS | Solo en Internet Explorer antiguo; no aplica |

**Estado**: se revisó cada `style` con `${…}` de las pantallas. Solo quedan números calculados (alto de barras, ancho de porcentajes) y un color fijo elegido por el código (`super-admin/reporte-mensual.js`). Las plantillas de impresión se abren en otra ventana y siguen con estilos en línea, también sin datos del usuario dentro de `style`. Los 221 estilos fijos pasaron a clases de `ui/estilos/15-utilidades.css`. **Regla**: un dato del usuario nunca va dentro de `style` ni de un `<style>`; si hiciera falta un color configurable, validarlo contra una lista o un patrón (`#rrggbb`) antes de usarlo.

## 5. Siguiente paso recomendado: activar una CSP (no aplicado)

Ya no hay manejadores en línea, así que se puede agregar un encabezado `Content-Security-Policy` en `render.yaml`. Con `script-src` **sin** `'unsafe-inline'` bloquea 3.2 y 3.3 aunque falte un `escapeHtml`, y `frame-ancestors 'none'` impide meter la app en un marco para engañar clics.

La política, directiva por directiva, cómo se probó (`node scripts/probar-csp.mjs`: 0 violaciones en 327 pantallas y 18 impresiones), cómo activarla en Render por pasos (`Report-Only` en el sandbox → activar) y qué hacer si bloquea algo: **[csp.md](csp.md)**.

## 6. Reglas que lo mantienen

Están en `CLAUDE.md` (reglas de código) y las vigila `npm test`:
- HTML generado: `data-click="accion('a', this.value)"` (y `data-input`, `data-change`, `data-keydown`, `data-enter`, `data-focus`, `data-blur`, `data-mousedown`, `data-toggle`) con la acción **exportada**. Los textos del usuario van en `data-x="${escapeHtml(v)}"` y se leen con `this.dataset.x`; nunca dentro del texto de la acción.
- **Nunca** `onclick="…"` ni `style="…"` fijo; usar las clases de `estilos/15-utilidades.css`. En línea solo lo calculado, lo que el código muestra u oculta, y la impresión.
- Todo HTML armado a mano con datos pasa por `escapeHtml` (`toast`, `confirmarModal` y el título de `abrirModal` ya escapan).
- Toda acción sensible valida permiso al inicio.

| Prueba | Qué detecta |
|---|---|
| `tests/ui/estructura.test.mjs` | `on…="…"` en una plantilla; `data-click` que llama algo no exportado o con argumentos no permitidos |
| `tests/navegador/recorrido.test.mjs` | En el HTML ya dibujado de las 327 pantallas: ningún atributo `on…`, y cada `data-*` (unos 10.500) con una acción existente y argumentos válidos. Clics reales, incluida una categoría con apóstrofo |
