// ============================================================
//  ARRANQUE (raíz de composición)
//  Único lugar que conoce todas las piezas y las conecta:
//   1. crea los adaptadores de salida (almacenamiento local, Firebase, cuentas, cripto)
//   2. verifica que los adaptadores cumplan sus puertos
//   3. crea los servicios de aplicación (inicio de sesión)
//   4. publica todo para la interfaz (puente de migración)
//   5. carga la interfaz (adaptador de entrada, ui/manifiesto.js) y la inicia
//  Es el equivalente al "endpoint" del documento de arquitectura hexagonal.
// ============================================================
import * as fechas from './dominio/fechas.js';
import * as pagos from './dominio/pagos.js';
import * as caja from './dominio/caja.js';
import * as inventario from './dominio/inventario.js';
import * as facturas from './dominio/facturas.js';
import * as contrasenas from './dominio/contrasenas.js';
import * as cuentas from './dominio/cuentas.js';
import * as permisos from './dominio/permisos.js';
import * as negocio from './dominio/negocio.js';
import * as gastos from './dominio/gastos.js';
import * as ventas from './dominio/ventas.js';
import { verificarPuertoDatos } from './aplicacion/puertos/datos.js';
import { verificarPuertoCuentas } from './aplicacion/puertos/cuentas.js';
import { crearServicioSesion, mensajeDeFallo } from './aplicacion/servicios/sesion.js';
import { crearAlmacenLocal } from './adaptadores/salida/almacen-local.js';
import { crearAdaptadorFirebase } from './adaptadores/salida/firebase-datos.js';
import { crearAdaptadorCuentas } from './adaptadores/salida/firebase-cuentas.js';
import * as cripto from './adaptadores/salida/cripto-navegador.js';
import { instalarPuente } from './adaptadores/entrada/ui/puente-legado.js';
import { ARCHIVOS_UI, VERSION_UI } from './adaptadores/entrada/ui/manifiesto.js';

const RAIZ_UI='src/adaptadores/entrada/ui/';

// Los "ganchos" son cómo el adaptador de datos avisa a la interfaz sin conocerla.
// Se resuelven en el momento de usarse porque la interfaz se carga después.
const ganchos={
  // STATE es un const del script clásico: no está en window, pero sí se ve por su nombre
  negocioActual: ()=> (typeof STATE!=='undefined' && STATE.negocio) || null,
  alCambiar: ()=> { if(typeof window.refrescarSiSePuede==='function') window.refrescarSiSePuede(); },
  alCambiarNegocio: n=> { if(typeof window.negocioCambiado==='function') window.negocioCambiado(n); },
  alEstadoConexion: e=> { if(typeof window.mostrarConexion==='function') window.mostrarConexion(e); },
  alCargarTabla: t=> {
    if(t!=='ventas') return;
    if(typeof window.reservarFactura==='function') window.reservarFactura();
    if(typeof window.ventasCargadas==='function') window.ventasCargadas();
  }
};

const datos=verificarPuertoDatos(crearAdaptadorFirebase({
  local: crearAlmacenLocal(window.localStorage, 'ws_'),
  firebase: window.firebase,
  config: window.FIREBASE_CONFIG,
  emuladores: window.FIREBASE_EMULADORES,
  ganchos
}));

const adaptadorCuentas=verificarPuertoCuentas(crearAdaptadorCuentas({
  firebase: window.firebase,
  config: window.FIREBASE_CONFIG,
  emuladores: window.FIREBASE_EMULADORES,
  cuentas,
  aleatorio: cripto.nuevaSal
}));

const dominio={fechas, pagos, caja, inventario, facturas, contrasenas, cuentas, permisos, negocio, gastos, ventas};

const crearSesion=()=>crearServicioSesion({
  cuentas: adaptadorCuentas,
  dominio,
  leerUsuarioNegocio: (negId, id)=>datos.leerRegistro(negId, 'usuarios', id),
  // Tras migrar: el empleado sale de data/usuarios; al super-admin se le borra el hash de su registro
  retirarClaveVieja: ({tipo, id})=> tipo==='super'
    ? datos.transaccionGlobal('superadmins', cur=>{
        if(cur===null) return null;   // Firebase reintenta con el valor real
        const l=Array.isArray(cur)?cur:Object.values(cur);
        const x=l.find(s=>s && s.id===id); if(!x) return;
        cuentas.CAMPOS_PASS.forEach(k=>{ delete x[k]; });
        return l;
      })
    : datos.modificarUsuariosLegado(l=>{ const f=l.filter(x=>x.id!==id); return f.length===l.length?undefined:f; }),
  pantallasPorRol: permisos.PANTALLAS_POR_ROL
});

instalarPuente(window, {
  datos,
  cuentas: adaptadorCuentas,
  sesion: {crear: crearSesion, mensajeDeFallo},
  dominio,
  cripto
});

// La interfaz son scripts clásicos (sus onclick usan nombres globales). Se
// insertan con async=false: el navegador los descarga en paralelo pero los
// EJECUTA en el orden del manifiesto. Cuando carga el último, arranca.
function cargarEnOrden(rutas){
  return new Promise((listo, fallo)=>{
    let faltan=rutas.length;
    rutas.forEach(ruta=>{
      const s=document.createElement('script');
      s.src=ruta+'?v='+VERSION_UI;
      s.async=false;
      s.onload=()=>{ if(--faltan===0) listo(); };
      s.onerror=()=>fallo(new Error(ruta));
      document.body.appendChild(s);
    });
  });
}
cargarEnOrden(ARCHIVOS_UI.map(a=>RAIZ_UI+a))
  .then(()=>window.iniciarInterfaz())
  .catch(e=>{
    console.error('No cargó la interfaz:', e && e.message);
    const app=document.getElementById('app');
    if(app) app.innerHTML='<div style="padding:40px;text-align:center;color:#fff;">No se pudo cargar la aplicación. Recarga con Ctrl+Shift+R.</div>';
  });
