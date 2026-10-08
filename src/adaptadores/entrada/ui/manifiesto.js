// ============================================================
//  MANIFIESTO DE LA INTERFAZ
//  Archivos de la interfaz (adaptador de entrada) en el orden en que se cargan.
//  Son scripts CLÁSICOS que comparten el ámbito global: una función declarada
//  en uno se puede llamar desde otro y desde los onclick del HTML. Por eso:
//   · ningún nombre puede repetirse entre archivos (la prueba
//     tests/ui/estructura.test.mjs lo verifica);
//   · al cargar, un archivo no debe EJECUTAR código de otro (solo declarar);
//     las llamadas entre archivos ocurren después, cuando ya cargaron todos.
//  Archivo nuevo de interfaz → agregarlo aquí.
//  VERSION_UI se agrega a las rutas para que los navegadores no mezclen
//  archivos viejos y nuevos tras publicar: cambiarla en cada publicación.
// ============================================================

export const VERSION_UI='2026-10-08';

export const ARCHIVOS_UI=[
  'nucleo/estado.js',
  'nucleo/permisos.js',
  'nucleo/componentes.js',
  'nucleo/sonidos.js',
  'nucleo/tema.js',
  'nucleo/tablas-movil.js',
  'nucleo/navegacion.js',
  'usuarios/sesion.js',
  'usuarios/cuentas.js',
  'usuarios/auditoria.js',
  'usuarios/usuarios-admin.js',
  'usuarios/usuarios-negocio.js',
  'usuarios/migracion-cuentas.js',
  'super-admin/panel.js',
  'super-admin/administradores.js',
  'super-admin/negocios.js',
  'super-admin/demos.js',
  'super-admin/reporte-mensual.js',
  'ventas/nueva-venta.js',
  'ventas/cuentas-abiertas.js',
  'ventas/pedidos.js',
  'ventas/cobro.js',
  'caja/caja.js',
  'cocina/comanda.js',
  'cocina/cocina.js',
  'cocina/tiempos.js',
  'citas/citas.js',
  'inventario/motor.js',
  'inventario/catalogo.js',
  'inventario/combos.js',
  'inventario/insumos.js',
  'inventario/conteo.js',
  'clientes/clientes.js',
  'clientes/domicilios.js',
  'reportes/dashboard.js',
  'reportes/reportes.js',
  'reportes/historial.js',
  'reportes/resumen.js',
  'gastos/contable.js',
  'gastos/gastos.js',
  'configuracion/config-negocio.js',
  'configuracion/mi-negocio.js',
  'impresion/facturas.js',
  'impresion/reportes.js',
  'impresion/reimpresiones.js',
  'nucleo/arranque.js'
];
