// Configuración de Firebase para Wallace System
// WALLACE COMPANY SYSTEM — Ing. Roldán Aldana
//
// Elige la base según el dominio para que el desarrollo NUNCA toque producción
// (Documentation/-00-execution-protocol → 9. Entorno de pruebas):
//   · dominios de HOSTS_PRODUCCION        → producción (wallace-system)
//   · localhost con ?emulador             → emuladores locales (npm run emulador)
//   · localhost con ?local                → modo local forzado (sin nube; lo usan las pruebas)
//   · cualquier otro (localhost, el fork) → PRUEBAS; si aún no está configurado, modo local
// window.FIREBASE_ENTORNO dice cuál se eligió (la pantalla de login lo muestra si no es producción).
(function(){
  var PRODUCCION = {
    apiKey: "AIzaSyBhDI5edhW8dSa1JCPF418Q5bPJQ8e9znE",
    authDomain: "wallace-system.firebaseapp.com",
    databaseURL: "https://wallace-system-default-rtdb.firebaseio.com",
    projectId: "wallace-system",
    storageBucket: "wallace-system.firebasestorage.app",
    messagingSenderId: "430944532706",
    appId: "1:430944532706:web:a5d5f5b87678a25e7346bb"
  };
  // Proyecto de pruebas (simula producción): wallacesys-dev-sandbox, alias "pruebas" en .firebaserc
  var PRUEBAS = {
    apiKey: "AIzaSyB1jluvqozw_4cXi2WInxMcEIYdsSo5LVU",
    authDomain: "wallacesys-dev-sandbox.firebaseapp.com",
    databaseURL: "https://wallacesys-dev-sandbox-default-rtdb.firebaseio.com",
    projectId: "wallacesys-dev-sandbox",
    storageBucket: "wallacesys-dev-sandbox.firebasestorage.app",
    messagingSenderId: "988608924153",
    appId: "1:988608924153:web:363afbf8d3f1c1cd96d528"
  };
  // PENDIENTE: dominio(s) públicos de producción (p. ej. el de Render). Sin esto, ningún
  // dominio usa producción: llenarlo ANTES de unir este código al repositorio original.
  var HOSTS_PRODUCCION = [];

  var host = location.hostname;
  var esLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  var pide = function(p){ try{ return new URLSearchParams(location.search).has(p); }catch(e){ return false; } };

  if (esLocal && pide('local')) {
    // localhost con ?local: modo local forzado (pruebas automáticas y capturas: nunca la nube)
    window.FIREBASE_ENTORNO = 'local';
    window.FIREBASE_CONFIG = null;
  } else if (esLocal && pide('emulador')) {
    window.FIREBASE_ENTORNO = 'emulador';
    window.FIREBASE_CONFIG = { apiKey: 'demo-key', authDomain: 'demo-wallace.firebaseapp.com',
      projectId: 'demo-wallace', databaseURL: 'https://demo-wallace-default-rtdb.firebaseio.com' };
    window.FIREBASE_EMULADORES = { database: '127.0.0.1:9000', auth: '127.0.0.1:9099' };
  } else if (HOSTS_PRODUCCION.indexOf(host) > -1) {
    window.FIREBASE_ENTORNO = 'produccion';
    window.FIREBASE_CONFIG = PRODUCCION;
  } else {
    window.FIREBASE_ENTORNO = PRUEBAS ? 'pruebas' : 'local';
    window.FIREBASE_CONFIG = PRUEBAS;
  }
})();
