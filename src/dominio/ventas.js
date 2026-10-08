import { jornadaDe } from './fechas.js';

// ============================================================
//  DOMINIO · Estadísticas de ventas
//  Agrupaciones por producto y por persona usando el ID (F15): antes se
//  agrupaba por nombre, así que renombrar un producto partía sus cifras y dos
//  productos con el mismo nombre se sumaban como uno.
// ============================================================

// Ítems vendidos por producto (prodId; las ventas viejas sin id, por nombre).
// Devuelve [[nombre, {qty, total}], …] (la forma de Object.entries). Se muestra el
// nombre de la venta más reciente; si dos productos distintos se llaman igual,
// el nombre lleva un número para no confundirlos.
export function vendidoPorProducto(ventas){
  const g={};
  const ordenadas=(ventas||[]).slice().sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||'')));
  ordenadas.forEach(v=>(v.items||[]).forEach(i=>{
    const k=i.prodId ? 'id:'+i.prodId : 'n:'+(i.nombre||'?');
    const x=g[k]||(g[k]={nombre:i.nombre||'?', qty:0, total:0});
    x.qty+=i.qty||0;
    x.total+=(i.precio||0)*(i.qty||0);
  }));
  const veces={};
  Object.values(g).forEach(x=>{ veces[x.nombre]=(veces[x.nombre]||0)+1; });
  const n={};
  return Object.values(g).map(x=>{
    let nombre=x.nombre;
    if(veces[nombre]>1){ n[nombre]=(n[nombre]||0)+1; nombre=nombre+' ('+n[nombre]+')'; }
    return [nombre, {qty:x.qty, total:x.total}];
  });
}

// Propinas por quien tomó el pedido (vendedorId; las ventas viejas, por nombre).
// Devuelve [[nombre, total], …] de mayor a menor.
export function propinasPorPersona(ventas){
  const g={};
  (ventas||[]).forEach(v=>{
    if(!(v.propina>0)) return;
    const k=v.vendedorId ? 'id:'+v.vendedorId : 'n:'+(v.vendedor||'—');
    const x=g[k]||(g[k]={nombre:v.vendedor||'—', total:0});
    x.total+=v.propina;
  });
  return Object.values(g).map(x=>[x.nombre, x.total]).sort((a,b)=>b[1]-a[1]);
}

// ¿Esta venta es de este domiciliario? Por id; las viejas (sin id), por nombre.
export function esDelDomiciliario(v, dom){
  if(!v || !dom) return false;
  return v.domiciliarioId ? v.domiciliarioId===dom.id : (v.domiciliario||'')===dom.nombre;
}

// R1: cifras de ventas de un negocio para el panel del super-admin. Las calcula
// cualquier equipo del negocio con sus ventas; como todos los equipos llegan al mismo
// valor, no se pisan entre sí. Montos con propina y domicilio (total), como el panel.
export const DIAS_RESUMEN=62;
export function resumenVentas(ventas, hoyStr){
  const r={total:0, pagadas:0, dias:{}, meses:{}};
  const h=new Date((hoyStr||new Date().toISOString().slice(0,10))+'T00:00:00');
  h.setDate(h.getDate()-DIAS_RESUMEN);
  const p=x=>String(x).padStart(2,'0');
  const limite=h.getFullYear()+'-'+p(h.getMonth()+1)+'-'+p(h.getDate());
  (ventas||[]).forEach(v=>{
    if(!v || v.estado!=='pagada') return;
    const t=Math.round(v.total||0), d=jornadaDe(v);
    r.total+=t; r.pagadas++;
    if(!d) return;
    if(d>=limite) r.dias[d]=(r.dias[d]||0)+t;
    const m=d.substring(0,7);
    r.meses[m]=(r.meses[m]||0)+t;
  });
  return r;
}
// Comparación sin depender del orden de las claves (Firebase las devuelve ordenadas)
// ni de los objetos vacíos (Firebase no los guarda: un negocio sin ventas no trae "dias").
export function mismoResumen(a, b){
  const canon=x=>JSON.stringify(x, (k,v)=>{
    if(!(v && typeof v==='object' && !Array.isArray(v))) return v;
    const ks=Object.keys(v).filter(kk=>!(v[kk] && typeof v[kk]==='object' && !Array.isArray(v[kk]) && !Object.keys(v[kk]).length)).sort();
    return ks.reduce((o,kk)=>{ o[kk]=v[kk]; return o; }, {});
  });
  return canon(a||null)===canon(b||null);
}
