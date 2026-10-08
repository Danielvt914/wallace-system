// Corre la app COMPLETA en este equipo contra los emuladores de Firebase
// (Authentication + Realtime Database). No toca producción ni pruebas.
//
//   npm run emulador                                  datos de importar-pruebas.json si existe, reglas de transición
//   npm run emulador -- --reglas cerradas             con las reglas finales
//   npm run emulador -- --datos otro.json             con otro archivo ({data:…} o export completo)
// Luego abrir  http://localhost:3000/?emulador     (Ctrl+C para terminar; los datos no se guardan)
import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const arg=(n,def)=>{ const i=process.argv.indexOf('--'+n); return i>-1?process.argv[i+1]:def; };
const archivoDatos=arg('datos', existsSync('importar-pruebas.json')?'importar-pruebas.json':null);
const reglas=arg('reglas','transicion')==='cerradas'?'database.rules.json':'database.rules.transicion.json';
const PUERTO=arg('puerto','3000');
const NS='demo-wallace-default-rtdb';
const rest=(ruta, metodo, cuerpo)=>fetch('http://127.0.0.1:9000/'+ruta+'.json?ns='+NS,
  {method:metodo, headers:{Authorization:'Bearer owner'}, body:JSON.stringify(cuerpo)}).then(r=>{ if(!r.ok) throw new Error(ruta+': '+r.status); });

const hijos=[];
const lanzar=(cmd, salida)=>{ const h=spawn(cmd, {shell:true, stdio:salida}); hijos.push(h); return h; };
function terminar(){
  hijos.forEach(h=>{ try{ if(process.platform==='win32') execSync('taskkill /pid '+h.pid+' /T /F', {stdio:'ignore'}); else h.kill('SIGINT'); }catch(e){} });
  process.exit(0);
}
process.on('SIGINT', terminar);

lanzar('npx firebase emulators:start --only database,auth --project demo-wallace', ['ignore','inherit','inherit']);
let listo=false;
for(let i=0;i<90 && !listo;i++){
  try{ await fetch('http://127.0.0.1:9000/.json?ns='+NS); await fetch('http://127.0.0.1:9099/'); listo=true; }
  catch(e){ await new Promise(r=>setTimeout(r,1000)); }
}
if(!listo){ console.error('Los emuladores no arrancaron (¿Java 11+ instalado? ¿puertos 9000/9099 libres?)'); terminar(); }

await rest('.settings/rules', 'PUT', JSON.parse(readFileSync(reglas,'utf8')));
if(archivoDatos){
  const crudo=JSON.parse(readFileSync(archivoDatos,'utf8'));
  await rest('', 'PUT', {data:crudo.data||crudo.datos||crudo});
}
lanzar('npx serve -s . -l '+PUERTO, 'ignore');
console.log('\n✅ Emuladores listos · reglas: '+reglas+' · datos: '+(archivoDatos||'vacío (configuración inicial)'));
console.log('   Abre  http://localhost:'+PUERTO+'/?emulador     (Ctrl+C para terminar)\n');
