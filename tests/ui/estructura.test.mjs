// Estructura de la interfaz partida en scripts clásicos (src/adaptadores/entrada/ui/).
// Como comparten el ámbito global, un error aquí no lo detecta ningún import:
// esta prueba lo busca con un analizador de JavaScript (acorn). npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { ARCHIVOS_UI } from '../../src/adaptadores/entrada/ui/manifiesto.js';

const RAIZ=new URL('../../src/adaptadores/entrada/ui/', import.meta.url);
const raizRuta=decodeURIComponent(RAIZ.pathname).replace(/^\/([A-Za-z]:)/,'$1');
const leer=a=>readFileSync(new URL(a, RAIZ),'utf8');
const ARCH=ARCHIVOS_UI.map(a=>({nombre:a, src:leer(a)}));
ARCH.forEach(f=>{ f.ast=acorn.parse(f.src,{ecmaVersion:'latest', sourceType:'script', locations:true}); });

// Nombres que publica el puente (se leen del propio puente-legado.js)
function nombresPuente(){
  const ast=acorn.parse(leer('puente-legado.js'),{ecmaVersion:'latest', sourceType:'module'});
  const n=new Set();
  walk.simple(ast,{
    AssignmentExpression(a){ if(a.left.type==='MemberExpression' && a.left.object.name==='win') n.add(a.left.property.name); },
    CallExpression(c){
      if(c.callee.name==='propiedad' && c.arguments[0]) n.add(c.arguments[0].value);
      if(c.callee.type==='MemberExpression' && c.callee.object.name==='Object' && c.callee.property.name==='assign' && c.arguments[1] && c.arguments[1].type==='ObjectExpression')
        c.arguments[1].properties.forEach(p=>n.add(p.key.name||p.key.value));
    }
  });
  return n;
}
const PUENTE=nombresPuente();
const NAVEGADOR=new Set(['window','document','localStorage','sessionStorage','navigator','location','console','setTimeout','clearTimeout',
 'setInterval','clearInterval','requestAnimationFrame','MutationObserver','Promise','JSON','Math','Date','Object','Array','String','Number',
 'Boolean','parseInt','parseFloat','isNaN','isFinite','Error','RegExp','Map','Set','encodeURIComponent','decodeURIComponent','escape','unescape',
 'alert','confirm','prompt','FileReader','Image','Blob','URL','AudioContext','webkitAudioContext','Infinity','NaN','undefined','performance',
 'Intl','Symbol','Uint8Array','fetch','atob','btoa','getComputedStyle','screen','history','globalThis','structuredClone','arguments','crypto','firebase']);

// Declaraciones top-level de cada archivo
const decl={};   // nombre -> archivo
const repetidos=[];
ARCH.forEach(f=>f.ast.body.forEach(n=>{
  const nombres=n.type==='FunctionDeclaration'?[n.id.name]:n.type==='VariableDeclaration'?n.declarations.map(d=>d.id.name):[];
  nombres.forEach(x=>{ if(decl[x]) repetidos.push(x+' ('+decl[x]+' y '+f.nombre+')'); else decl[x]=f.nombre; });
}));

test('el manifiesto lista todos los archivos de la interfaz, sin sobrantes', ()=>{
  const enDisco=[];
  (function rec(dir){ readdirSync(dir).forEach(x=>{ const r=join(dir,x); if(statSync(r).isDirectory()) rec(r); else if(x.endsWith('.js')) enDisco.push(relative(raizRuta,r).replace(/\\/g,'/')); }); })(raizRuta);
  const esperados=enDisco.filter(x=>x!=='manifiesto.js' && x!=='puente-legado.js').sort();
  assert.deepEqual([...ARCHIVOS_UI].sort(), esperados);
  assert.equal(new Set(ARCHIVOS_UI).size, ARCHIVOS_UI.length);
  assert.equal(ARCHIVOS_UI[ARCHIVOS_UI.length-1], 'nucleo/arranque.js');
});
test('ningún nombre global se declara dos veces ni tapa uno del puente', ()=>{
  assert.deepEqual(repetidos, []);
  assert.deepEqual(Object.keys(decl).filter(x=>PUENTE.has(x)), []);
});
test('al cargar, ningún archivo ejecuta código de otro (solo declara)', ()=>{
  const cruces=[];
  ARCH.forEach(f=>f.ast.body.forEach(n=>{
    if(n.type==='FunctionDeclaration') return;
    walk.recursive(n, null, {
      Function(){},   // lo que está dentro de funciones corre después, no al cargar
      Identifier(id){ if(decl[id.name] && decl[id.name]!==f.nombre) cruces.push(f.nombre+':'+id.loc.start.line+' usa '+id.name+' ('+decl[id.name]+')'); }
    });
  }));
  assert.deepEqual(cruces, []);
});

// Identificadores libres: todo lo que se usa debe estar declarado en algún lado
function nombresPatron(p, out){
  if(!p) return;
  if(p.type==='Identifier') out.push(p.name);
  else if(p.type==='ObjectPattern') p.properties.forEach(pr=>nombresPatron(pr.type==='RestElement'?pr.argument:pr.value, out));
  else if(p.type==='ArrayPattern') p.elements.forEach(e=>nombresPatron(e, out));
  else if(p.type==='AssignmentPattern') nombresPatron(p.left, out);
  else if(p.type==='RestElement') nombresPatron(p.argument, out);
}
function localesDe(fn){
  const s=new Set(), ps=[];
  fn.params.forEach(p=>nombresPatron(p,ps)); ps.forEach(x=>s.add(x));
  if(fn.id && fn.type!=='FunctionDeclaration') s.add(fn.id.name);
  walk.recursive(fn.body, null, {
    Function(f){ if(f.type==='FunctionDeclaration' && f.id) s.add(f.id.name); },
    VariableDeclaration(v,st,c){ v.declarations.forEach(d=>{ const o=[]; nombresPatron(d.id,o); o.forEach(x=>s.add(x)); if(d.init) c(d.init,st); }); },
    CatchClause(cc,st,c){ const o=[]; nombresPatron(cc.param,o); o.forEach(x=>s.add(x)); c(cc.body,st); }
  });
  return s;
}
test('no hay identificadores sin declarar (serían ReferenceError al usarse)', ()=>{
  const conocidos=new Set([...Object.keys(decl), ...PUENTE, ...NAVEGADOR]);
  const libres=[];
  const revisar=(nodo, scopes, archivo)=>walk.recursive(nodo, scopes, {
    Function(f, sc){ if(f.body) revisar(f.body, [...sc, localesDe(f)], archivo); },
    Identifier(id, sc){ if(!conocidos.has(id.name) && !sc.some(s=>s.has(id.name))) libres.push(archivo+':'+id.loc.start.line+' '+id.name); },
    MemberExpression(m, sc, c){ c(m.object, sc); if(m.computed) c(m.property, sc); },
    Property(p, sc, c){ if(p.computed) c(p.key, sc); c(p.value, sc); },
    VariableDeclaration(v, sc, c){ v.declarations.forEach(d=>{ if(d.init) c(d.init, sc); }); },
    CatchClause(cc, sc, c){ c(cc.body, sc); },
    LabeledStatement(l, sc, c){ c(l.body, sc); }, BreakStatement(){}, ContinueStatement(){}
  });
  ARCH.forEach(f=>f.ast.body.forEach(n=>revisar(n, [new Set()], f.nombre)));
  assert.deepEqual(libres, []);
});
test('los onclick/oninput… del HTML generado llaman funciones que existen', ()=>{
  const conocidos=new Set([...Object.keys(decl), ...PUENTE, ...NAVEGADOR, 'this','event']);
  const rotos=[];
  ARCH.forEach(f=>{
    const re=/on(?:click|change|input|keydown|keyup|submit|blur|focus)=\\?["']([^"']*)/g; let m;
    while((m=re.exec(f.src))){
      const re2=/(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g; let k;
      while((k=re2.exec(m[1]))){ const nm=k[1]; if(!['if','return','function','for','while','switch'].includes(nm) && !conocidos.has(nm)) rotos.push(f.nombre+': '+nm); }
    }
  });
  assert.deepEqual(rotos, []);
});
test('existen las funciones que llaman src/arranque.js y los adaptadores por window', ()=>{
  const arranque=readFileSync(new URL('../../src/arranque.js', import.meta.url),'utf8');
  const usadas=[...arranque.matchAll(/window\.([A-Za-z_$][\w$]*)\s*(?:===|\()/g)].map(m=>m[1]).filter(x=>!['firebase','localStorage','FIREBASE_CONFIG','FIREBASE_EMULADORES'].includes(x));
  assert.ok(usadas.includes('iniciarInterfaz'));
  usadas.forEach(x=>assert.ok(decl[x], 'falta '+x));
});
