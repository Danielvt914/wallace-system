// ============================================================
//  ADAPTADOR DE SALIDA · Aleatoriedad del navegador
//  El dominio de contraseñas no genera la sal: la recibe de aquí.
// ============================================================

export function nuevaSal(){
  try{
    const a=new Uint8Array(16); (globalThis.crypto||globalThis.msCrypto).getRandomValues(a);
    return Array.from(a).map(x=>x.toString(16).padStart(2,'0')).join('');
  }catch(e){ return (Date.now().toString(16)+Math.random().toString(16).slice(2)).slice(0,32); }
}
export function nuevoId(){ return 'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
