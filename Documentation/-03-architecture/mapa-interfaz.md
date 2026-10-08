# Mapa de la interfaz

Archivo **generado** por `node scripts/mapa-interfaz.mjs` (no editar a mano). Dice en qué archivo de `src/adaptadores/entrada/ui/` está cada función y variable global de la interfaz. Sirve para ubicar las referencias viejas `app.js:NNN` de la documentación: se busca la función por nombre.

En la documentación, `ui/<carpeta>/<archivo>.js` es la ruta relativa a `src/adaptadores/entrada/`. El orden de carga está en `ui/manifiesto.js`.

| Archivo | Funciones y variables (línea) |
|---|---|
| `ui/nucleo/estado.js` | `ESCRIBIENDO` (let) 9 · `mostrarConexion` 12 · `refrescarSiSePuede` 21 · `_refrescoPendiente` (let) 41 · `refrescarDeLaNube` 55 · `STATE` (const) 67 · `now` 72 · `jornadaActual` 78 · `fmtMoney` 81 · `fmtCorto` 83 · `fmtDate` 89 · `escapeHtml` 94 |
| `ui/nucleo/permisos.js` | `usaInventario` 18 · `tienePermiso` 20 · `exigirPermiso` 23 · `esAdminSistema` 29 · `pantallasPermitidas` 33 · `puedeVerPantalla` 37 · `pantallaValida` 39 · `sucursalActual` 49 · `cajaActual` 54 · `guardarCajaActual` 55 · `puedeVerSucursal` 56 · `cambiarSucursal` 57 |
| `ui/nucleo/componentes.js` | `ICONS` (const) 13 · `ic` 29 · `pProd` 34 · `pProds` 35 · `pPedido` 36 · `pPedidos` 38 · `pPersonal` 44 · `toast` 49 · `abrirModal` 59 · `_modalCancelar` (let) 101 · `cerrarModal` 102 · `preguntarDespues` 111 · `_erroresReportados` (const) 121 · `reportarError` 122 · `confirmarModal` 131 |
| `ui/nucleo/sonidos.js` | `_audioCtx` (let) 13 · `beep` 14 · `campana` 26 · `sonidosOn` 46 · `sonidoVenta` 47 · `sonidoPedido` 48 · `sonidoAlerta` 49 · `sonidoError` 50 |
| `ui/nucleo/tema.js` | `_hexRgb` 13 · `_rgbHex` 20 · `_aclarar` 24 · `_oscurecer` 25 · `aplicarTema` 26 · `quitarTema` 43 |
| `ui/nucleo/tablas-movil.js` | `TC_ACCIONES` (const) 18 · `TC_OCULTAR` (const) 20 · `prepararTablasMovil` 32 |
| `ui/nucleo/navegacion.js` | `irA` 10 · `renderContenido` 27 · `armarMenu` 66 · `vistaNegocio` 133 · `render` 203 |
| `ui/usuarios/sesion.js` | `ponerPass` 20 · `migrarContrasenas` 21 · `_sesion` (let) 39 · `_dejarPerfil` (let) 39 · `_entrando` (let) 39 · `_configInicial` (let) 39 · `CLAVE_PERFIL` (const) 40 · `conCuentasFirebase` 41 · `servicioSesion` 42 · `mensajeCuenta` 43 · `conTiempo` 45 · `guardarPerfilLocal` 48 · `leerPerfilLocal` 49 · `borrarPerfilLocal` 50 · `login` 53 · `ponerSesionNegocio` 69 · `hacerLogin` 85 · `hacerLoginCuentas` 103 · `pedirPassNueva` 121 · `entrarConPerfil` 137 · `escucharMiPerfil` 176 · `negocioCambiado` 191 · `logout` 196 · `avisoEntorno` 210 · `vistaLogin` 217 · `necesitaConfigInicial` 236 · `vistaConfigInicial` 242 · `crearDuenoInicial` 258 · `crearDuenoInicialCuentas` 278 |
| `ui/usuarios/cuentas.js` | `miUid` 17 · `perfilPara` 18 · `crearCuentaPara` 22 · `reemplazarCuenta` 30 · `sincronizarPerfil` 46 · `trasGuardarCuenta` 54 · `borrarCuentaDe` 59 · `ponerUidUsuario` 63 · `quitarUsuarioLegado` 69 · `actualizarUsuarioLegado` 72 · `borrarCuentasDeNegocio` 79 · `migrarContrasenasLegado` 86 · `cambiarMiPassCuenta` 96 |
| `ui/usuarios/auditoria.js` | `logAudit` 13 · `_aFiltro` (let) 27 · `auditoria` 28 |
| `ui/usuarios/usuarios-admin.js` | `pantallaUsuarios` 11 · `editarUsuario` 43 · `eliminarUsuario` 116 |
| `ui/usuarios/usuarios-negocio.js` | `puedeGestionarUsuarios` 13 · `usuariosNeg` 20 · `cambiarPassNeg` 51 |
| `ui/usuarios/migracion-cuentas.js` | `_indiceCuentas` (let) 16 · `_cargandoIndice` (let) 16 · `abrirMigracion` 17 · `recargarIndiceCuentas` 23 · `usuariosParaMigrar` 30 · `filaMigracion` 36 · `pantallaMigracion` 40 · `cuentaParaFila` 85 · `borrarPerfilHuerfano` 101 · `migrarTablasAhora` 108 |
| `ui/super-admin/panel.js` | `panelSuperAdmin` 13 · `descargarRespaldo` 205 |
| `ui/super-admin/administradores.js` | `pantallaSuperAdmins` 13 · `editarSuperAdmin` 47 · `eliminarSuperAdmin` 94 · `cambiarMiPassSuper` 106 |
| `ui/super-admin/negocios.js` | `nuevoNegocio` 11 · `asignarVendedor` 74 · `toggleNegocio` 95 · `eliminarNegocio` 108 · `entrarComoNegocio` 137 · `volverSuperAdmin` 156 |
| `ui/super-admin/demos.js` | `DEMO_PLANTILLAS` (const) 13 · `crearNegocioDemo` 234 · `crearVariosDemos` 245 · `crearDemoDeTipo` 254 · `eliminarDemoVendedor` 360 |
| `ui/super-admin/reporte-mensual.js` | `_repNegMes` (let) 12 · `reporteMensualNegocio` 13 · `imprimirReporteNegocio` 32 |
| `ui/ventas/nueva-venta.js` | `_carrito` (let) 13 · `_vTipo` (let) 14 · `_vCli` (let) 15 · `_vMesa` (let) 16 · `_vObs` (let) 17 · `_vCat` (let) 18 · `_vBusca` (let) 19 · `_desc` (let) 20 · `_descMot` (let) 21 · `_guardando` (let) 22 · `nuevaVenta` 24 · `camposCliente` 142 · `sugerirClientes` 191 · `ocultarSugerenciasCliente` 209 · `elegirClienteSugerido` 213 · `actualizarTotalVenta` 224 · `escanearProducto` 235 · `agregarAlCarrito` 252 · `cambiarQty` 284 · `quitarItemCarrito` 290 · `vaciarCarrito` 295 · `limpiarPedido` 296 · `abrirDescuento` 308 · `quitarDescuento` 325 · `cancelarEdicionPedido` 326 · `_facturaReservada` (let) 342 · `_reservandoFactura` (let) 342 · `maxFacturaLocal` 343 · `reservarFactura` 344 · `siguienteFactura` 353 · `armarVenta` 362 · `validarClientePedido` 404 · `registrarSalida` 418 · `guardarEdicionPedido` 448 · `confirmarPedido` 498 · `cobrarDirecto` 566 · `bloquearBoton` 575 |
| `ui/ventas/cuentas-abiertas.js` | `descuentaAlPedir` 20 · `usaCuentas` 26 · `hayPedidosAbiertos` 33 · `cuentasAbiertas` 37 · `nombreCuenta` 41 · `minutosAbierta` 47 · `tiempoTxt` 50 · `abrirCuentaNueva` 56 · `irAgregarACuenta` 82 · `salirDeCuenta` 98 · `agregarACuenta` 103 · `renombrarCuenta` 150 · `cuentas` 162 · `cancelarCuenta` 215 · `nuevaCuentaDesdeCero` 234 |
| `ui/ventas/pedidos.js` | `_pBusca` (let) 13 · `ventasJornada` 16 · `pedidos` 31 · `setEstadoPedido` 120 · `idDomiciliario` 132 · `asignarDomiciliario` 137 |
| `ui/ventas/cobro.js` | `detallePagos` 16 · `exigeVerificarBanco` 25 · `ventasPorVerificar` 26 · `marcarVerificada` 27 · `cobrarPedido` 41 · `abrirCobro` 54 · `leerPagos` 178 · `pintarEstadoPago` 183 · `pagoRapido` 198 · `anularPedido` 207 · `editarPedido` 229 · `modoAjusteCobro` 263 · `ajustarPagoVenta` 267 · `guardarAjusteCobro` 368 · `cambiarFormaPago` 386 · `reimprimirComanda` 429 · `eliminarDefinitivo` 437 |
| `ui/caja/caja.js` | `caja` 13 · `abrirCaja` 145 · `movimientoCaja` 171 · `cerrarCaja` 199 · `terminarCierre` 277 · `imprimirCierre` 314 · `reporteDescuadre` 365 · `cfgCaja` 401 · `guardarCfgCaja` 405 · `baseSiguiente` 407 · `ponerBaseSiguiente` 412 · `baseFija` 419 · `puedeRetirarJefe` 423 · `retiroCajaCerrada` 428 · `cambiarBaseApertura` 456 |
| `ui/cocina/comanda.js` | `comandaHTML` 13 · `imprimirComanda` 37 |
| `ui/cocina/cocina.js` | `_ultimoCountCocina` (let) 13 · `cocina` 14 · `marcarCocina` 71 |
| `ui/cocina/tiempos.js` | `tiempos` 13 |
| `ui/citas/citas.js` | `citas` 13 · `_apartTmp` (let) 72 · `nuevaCita` 73 · `apartadoEditorHTML` 125 · `apartadoFilasHTML` 145 · `agregarProdApartado` 153 · `quitarProdApartado` 167 · `reqApartados` 174 · `descontarApartado` 179 · `devolverApartado` 183 · `marcarCita` 186 · `cobrarCitaEntregada` 216 · `eliminarCita` 250 |
| `ui/inventario/motor.js` | `reingresarALotes` 17 · `diasAvisoVence` 19 · `lotesAlerta` 21 · `avisarVencimientos` 23 · `fmtSoloFecha` 46 · `requerimientos` 59 · `moverInventario` 62 · `registrarMovimientos` 93 · `faltantesPara` 97 · `descontarStock` 104 · `devolverStock` 113 · `ajustarStockPorEdicion` 120 · `avisarStockBajo` 127 |
| `ui/inventario/catalogo.js` | `_iBusca` (let) 13 · `_iCat` (let) 14 · `inventario` 16 · `_recetaTmp` (let) 159 · `editarProducto` 160 · `recetaEditorHTML` 290 · `recetaFilasHTML` 310 · `agregarInsumoReceta` 322 · `quitarInsumoReceta` 333 · `eliminarProducto` 338 · `salidaStock` 348 · `entradaStock` 373 · `lotesDetalleHTML` 416 · `verLotes` 435 · `retirarLote` 460 |
| `ui/inventario/combos.js` | `disponiblesCombo` 19 · `faltantesParaAgregar` 21 · `precioSuelto` 26 · `_comboTmp` (let) 28 · `_comboBusca` (let) 29 · `combos` 31 · `editarCombo` 103 · `comboEditorHTML` 129 · `comboFilasHTML` 144 · `pintarResumenCombo` 156 · `agregarAComboTmp` 168 · `quitarDeComboTmp` 180 |
| `ui/inventario/insumos.js` | `_insBusca` (let) 14 · `pantallaInsumos` 15 · `editarInsumo` 65 · `eliminarInsumo` 107 · `entradaInsumo` 122 |
| `ui/inventario/conteo.js` | `_conteo` (let) 17 · `_conteoBusca` (let) 18 · `itemsParaContar` 21 · `iniciarConteo` 37 · `cancelarConteo` 45 · `contarItem` 52 · `difDe` 58 · `pintarFilaConteo` 59 · `resumenConteo` 71 · `pintarTotalesConteo` 83 · `conteoTodoBien` 99 · `guardarConteo` 105 · `verConteo` 158 · `conteo` 182 |
| `ui/clientes/clientes.js` | `guardarClienteAuto` 10 · `_cBusca` (let) 38 · `clientes` 39 · `editarCliente` 82 · `eliminarCliente` 100 |
| `ui/clientes/domicilios.js` | `cuadreDomi` 14 · `domicilios` 87 · `editarDomiciliario` 149 · `eliminarDomiciliario` 161 |
| `ui/reportes/dashboard.js` | `inicio` 13 · `tipoVentaLabel` 144 |
| `ui/reportes/reportes.js` | `reportes` 13 |
| `ui/reportes/historial.js` | `_hBusca` (let) 13 · `_hFiltro` (let) 13 · `_hMes` (let) 13 · `historial` 14 |
| `ui/reportes/resumen.js` | `_resumenNeg` (let) 11 · `ventasCargadas` 14 · `publicarResumen` 21 · `resumenDe` 30 · `calcularResumenes` 38 |
| `ui/gastos/contable.js` | `_mesCont` (let) 13 · `contable` 14 · `reimprimirCierre` 145 · `nombreMes` 150 |
| `ui/gastos/gastos.js` | `_mesGas` (let) 13 · `getConceptosGasto` 19 · `guardarConceptos` 24 · `catalogoConceptos` 26 · `acumConcepto` 28 · `conceptosCompactoHTML` 33 · `opcionesConcepto` 54 · `agregarConceptoGasto` 58 · `toggleNuevoConcepto` 71 · `administrarConceptos` 77 · `quitarConcepto` 87 · `gastosneg` 95 · `nuevoGasto` 166 · `eliminarGasto` 197 |
| `ui/configuracion/config-negocio.js` | `configNegocio` 13 · `usuariosNegocio` 17 · `_cfgTab` (let) 22 · `cfgTab` 23 · `pantallaConfig` 24 · `aplicarPlantillaPlan` 191 · `guardarConfig` 199 · `agregarSucursal` 258 · `quitarSucursal` 274 |
| `ui/configuracion/mi-negocio.js` | `minegocio` 12 · `cargarLogo` 94 · `quitarLogo` 119 · `guardarMiNegocio` 125 |
| `ui/impresion/facturas.js` | `imprimirFactura` 13 · `datosCliente` 27 · `tipoTexto` 39 · `facturaPOS` 41 · `facturaMedia` 128 · `facturaCarta` 193 |
| `ui/impresion/reportes.js` | `imprimirReporte` 9 · `imprimirContable` 36 |
| `ui/impresion/reimpresiones.js` | `_reimpBusca` (let) 14 · `reimpresiones` 15 |
| `ui/nucleo/arranque.js` | `seed` 13 · `arrancar` 38 · `iniciarInterfaz` 47 · `arrancarCuentas` 74 |

**Total:** 376 nombres globales en 46 archivos.
