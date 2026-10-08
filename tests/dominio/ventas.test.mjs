// Pruebas de estadísticas de ventas (F15), fechas de gastos (F2) y valoración a costo (F14). npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as vt from '../../src/dominio/ventas.js';
import * as fechas from '../../src/dominio/fechas.js';
import * as inv from '../../src/dominio/inventario.js';

test('vendido por producto: por id; el nombre es el de la venta más reciente', ()=>{
  const ventas=[
    {fecha:'2026-10-01T10:00:00Z', items:[{prodId:'p1', nombre:'Pola', precio:3000, qty:2}]},
    {fecha:'2026-10-05T10:00:00Z', items:[{prodId:'p1', nombre:'Poker', precio:3500, qty:1}]},   // se renombró
    {fecha:'2026-10-02T10:00:00Z', items:[{nombre:'Hielo', precio:1000, qty:3}]}                  // venta vieja sin id
  ];
  const r=Object.fromEntries(vt.vendidoPorProducto(ventas));
  assert.deepEqual(r, {Poker:{qty:3, total:9500}, Hielo:{qty:3, total:3000}});
});
test('vendido por producto: dos productos distintos con el mismo nombre no se suman', ()=>{
  const r=vt.vendidoPorProducto([{items:[{prodId:'a', nombre:'Combo', precio:10, qty:1},{prodId:'b', nombre:'Combo', precio:20, qty:1}]}]);
  assert.equal(r.length, 2);
  assert.deepEqual(r.map(x=>x[0]).sort(), ['Combo (1)','Combo (2)']);
  assert.deepEqual(vt.vendidoPorProducto(null), []);
});
test('propinas por quien atendió (id; las viejas por nombre)', ()=>{
  const r=vt.propinasPorPersona([
    {vendedorId:'u1', vendedor:'Ana', propina:2000},
    {vendedorId:'u1', vendedor:'Ana María', propina:1000},
    {vendedor:'Luis', propina:500},
    {vendedorId:'u2', vendedor:'Sin propina', propina:0}
  ]);
  assert.deepEqual(r, [['Ana',3000],['Luis',500]]);
});
test('venta de un domiciliario: por id, y por nombre en ventas viejas', ()=>{
  const d={id:'d1', nombre:'Pedro'};
  assert.equal(vt.esDelDomiciliario({domiciliarioId:'d1', domiciliario:'Otro nombre'}, d), true);
  assert.equal(vt.esDelDomiciliario({domiciliarioId:'d2', domiciliario:'Pedro'}, d), false);   // otro Pedro
  assert.equal(vt.esDelDomiciliario({domiciliario:'Pedro'}, d), true);
  assert.equal(vt.esDelDomiciliario(null, d), false);
});
test('día y mes de un gasto: AAAA-MM-DD tal cual; ISO al día local (F2)', ()=>{
  assert.equal(fechas.diaDe('2026-01-31'), '2026-01-31');
  const noche=new Date(2026,0,31,20,0,0);            // 31 de enero, 8 p. m. hora local
  assert.equal(fechas.diaDe(noche.toISOString()), '2026-01-31');
  assert.equal(fechas.mesDe(noche.toISOString()), '2026-01');
  assert.equal(fechas.diaDe(''), '');
});
test('inventario a costo; sin costo, a precio de venta (F14)', ()=>{
  assert.equal(inv.costoUnitario({costo:600, precio:1000}), 600);
  assert.equal(inv.costoUnitario({costo:0, precio:1000}), 1000);
  assert.deepEqual(inv.valorInventario([{stock:2, costo:600, precio:1000},{stock:1, precio:500},{stock:null, precio:9}]),
    {valor:1700, sinCosto:1, conCosto:1});
});

// ---------- F1: caja por sucursal ----------
import * as cj from '../../src/dominio/caja.js';
test('caja por sucursal: la forma de siempre es la principal', ()=>{
  const a={id:'c1', base:10};
  assert.equal(cj.cajaDe([a]).id, 'c1');
  assert.equal(cj.cajaDe([a],'principal').id, 'c1');
  assert.equal(cj.cajaDe([a],'s2'), null);
  assert.deepEqual(cj.sucursalesConCaja([a]), ['principal']);
});
test('caja por sucursal: abrir y cerrar una sede no toca la otra', ()=>{
  const a={id:'c1'}, b={id:'c2'};
  let v=cj.conCaja(null, 'principal', a);
  assert.deepEqual(v, [a]);                                   // un solo punto: forma de siempre
  v=cj.conCaja(v, 's2', b);
  assert.deepEqual(v, {cajas:{principal:a, s2:b}});
  assert.equal(cj.cajaDe(v,'s2').id, 'c2');
  assert.equal(cj.cajasDe(v).length, 2);
  v=cj.conCaja(v, 'principal', null);
  assert.deepEqual(v, {cajas:{s2:b}});
  assert.equal(cj.cajaDe(v), null);
  v=cj.conCaja(v, 's2', null);
  assert.equal(v, null);
});
test('venta o cierre de una sucursal (sin sucursal = principal)', ()=>{
  assert.equal(cj.deSucursal({}, 'principal'), true);
  assert.equal(cj.deSucursal({sucursalId:'s2'}, 's2'), true);
  assert.equal(cj.deSucursal({sucursalId:'s2'}, 'principal'), false);
});
