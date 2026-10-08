// ============================================================
//  PUERTO DE SALIDA · Cuentas (S1)
//  Contrato de lo que la aplicación necesita para autenticar personas y
//  administrar sus cuentas, sin decir CÓMO. Hoy lo cumple Firebase
//  Authentication + los nodos login/ y perfiles/ de Realtime Database
//  (adaptadores/salida/firebase-cuentas.js). Pasar al Plan A (Cloud
//  Functions) solo cambia el adaptador.
//
//  Una "cuenta" es {uid, correo}. El perfil (perfiles/<uid>) dice negocio,
//  rol y permisos; lo arma el dominio (dominio/cuentas.js).
// ============================================================

/**
 * @typedef {Object} PuertoCuentas
 * @property {() => boolean} iniciar                                   true = hay Firebase Auth.
 * @property {() => boolean} disponible
 * @property {(cb:(cuenta:{uid:string}|null)=>void) => void} alCambiarSesion  Primer aviso = sesión guardada (o null).
 * @property {(usuario:string) => Promise<{correo:string, uid:string}|null>} buscarLogin
 * @property {(correo:string, pass:string) => Promise<{uid:string}>} entrar        Rechaza con {codigo}.
 * @property {() => Promise<void>} salir
 * @property {(uid:string) => Promise<Object|null>} leerPerfil
 * @property {(uid:string, cb:(perfil:Object|null)=>void) => Function} escucharPerfil   Devuelve la función para dejar de escuchar.
 * @property {(pass:string) => Promise<{uid:string, correo:string}>} crearCuentaPropia   Crea y deja la sesión iniciada.
 * @property {(pass:string) => Promise<{uid:string, correo:string}>} crearCuentaAjena    Crea sin tocar la sesión actual.
 * @property {(datos:{uid:string, correo:string, usuario:string, perfil:Object, extra?:Object}) => Promise<void>} guardarCuenta
 * @property {(datos:{uid:string, usuario:string, extra?:Object}) => Promise<void>} borrarCuenta
 * @property {(uid:string, campos:Object, renombrar?:{antes:string, despues:string, correo:string}) => Promise<void>} actualizarPerfil
 * @property {(actual:string, nueva:string) => Promise<void>} cambiarMiPass
 * @property {() => Promise<{perfiles:Object, login:Object}>} leerIndice            Solo super-admin.
 * @property {() => Promise<{superadmins:Array, usuarios:Array}|null>} leerLegado   null = reglas cerradas.
 * @property {() => Promise<boolean>} necesitaDueno                                 Instalación sin super-admins.
 */

export const OPERACIONES_CUENTAS=['iniciar','disponible','alCambiarSesion','buscarLogin','entrar','salir',
  'leerPerfil','escucharPerfil','crearCuentaPropia','crearCuentaAjena','guardarCuenta','borrarCuenta',
  'actualizarPerfil','cambiarMiPass','leerIndice','leerLegado','necesitaDueno'];

export function verificarPuertoCuentas(adaptador){
  const faltan=OPERACIONES_CUENTAS.filter(op=>typeof (adaptador&&adaptador[op])!=='function');
  if(faltan.length) throw new Error('El adaptador de cuentas no cumple el puerto. Faltan: '+faltan.join(', '));
  return adaptador;
}

// Códigos de error que la aplicación entiende (el adaptador traduce los de Firebase)
export const ERRORES_CUENTA={
  CREDENCIALES:'credenciales',     // usuario o contraseña incorrectos
  RED:'red',                       // sin internet
  DEMASIADOS:'demasiados',         // Firebase bloqueó por intentos
  PASS_DEBIL:'pass_debil',         // menos de 6 caracteres
  REAUTENTICAR:'reautenticar',     // la sesión es vieja para un cambio sensible
  PERMISO:'permiso',               // las reglas lo negaron
  OTRO:'otro'
};
