/*
 * Mínima expresión de una máquina de Turing en el lenguaje • (compilación directa: una regla por transición).
 *
 * Modelo
 *   Casilla de la cinta = una columna de h celdas. Una fila es el símbolo (vacía = 0, así la cinta en blanco es el
 *   mundo vacío y es infinita gratis); las otras h-1 filas, el estado del cabezal en binario (todo vacío = sin
 *   cabezal). Parar = el cabezal desaparece (no hace falta un código para H).
 *   h mínimo = ⌈log2(|Γ|·(|Q|+1))⌉: símbolo × (sin cabezal o uno de los |Q| estados).
 *   Regla de la transición (q, s) → (w, d, q'): mira la columna del cabezal (y, si ayuda, filas de estado vacías
 *   de la vecina); escribe el cambio de la columna actual y el código de q' en la vecina (nada si q' = H).
 *
 * Métrica: celdas especificadas = celdas del Si que no son «cualquiera» + celdas del Entonces que escriben.
 *
 * Corrección (exacta, no simulada). Una regla solo puede encajar en la columna del cabezal real:
 *   - desplazamiento vertical 0: entre todas las columnas legales, solo la del cabezal en (q, s) cumple el Si;
 *   - desplazamiento vertical k ≠ 0: ninguna pareja de columnas legales (como mucho un cabezal) lo cumple,
 *     con todo vacío fuera de la tira.
 *   En horizontal las casillas miden 1 columna, así que toda posición está alineada.
 *
 * Búsqueda: todas las filas de símbolo y todos los conjuntos de códigos de estado; para cada código de cabezal,
 * el Si más pequeño válido (por tamaño creciente); después, el mejor reparto de códigos entre estados.
 * Uso: node minima.js [hExtra]
 */
const pc = x => { let n = 0; while (x) { n += x & 1; x >>= 1; } return n; };

function buscar(tabla, hExtra = 0, anclada = false) {
  const Q = Object.keys(tabla), n = Q.length;
  const hMin = Math.ceil(Math.log2(2 * (n + 1)));
  const h = hMin + hExtra;
  const filasEstado = sr => [...Array(h).keys()].filter(r => r !== sr);
  const transiciones = [];
  for (const q of Q) for (const s of [0, 1]) if (tabla[q][s]) {
    const t = tabla[q][s]; transiciones.push({ q, s, w: +t[0], d: t[1] === "R" ? 1 : -1, q2: t.slice(2) });
  }
  let mejor = null;
  const desplazado = (X, k) => { let r = 0; for (let t = 0; t < h; t++) { const u = t + k; if (u >= 0 && u < h && (X >> u) & 1) r |= 1 << t; } return r; };
  for (let sr = 0; sr < h; sr++) {
    const fe = filasEstado(sr);
    const repartir = c => { let r = 0; fe.forEach((row, i) => { if ((c >> i) & 1) r |= 1 << row; }); return r; };
    const nc = (1 << (h - 1)) - 1;                      // códigos de estado no nulos
    // conjuntos de n códigos (sin orden)
    const conjuntos = [];
    const rec = (desde, acc) => { if (acc.length === n) { conjuntos.push(acc.slice()); return; } for (let c = desde; c <= nc; c++) { acc.push(c); rec(c + 1, acc); acc.pop(); } };
    rec(1, []);
    const mascaraNb = fe.reduce((m, r) => m | (1 << r), 0);
    for (const conj of conjuntos) {
      const cods = conj.map(repartir);
      const sinCab = [0, 1 << sr];
      const conCab = []; for (const c of cods) for (const s of [0, 1]) conCab.push(c | (s << sr));
      const V = [...sinCab.map(x => [x, false]), ...conCab.map(x => [x, true])];
      // tablas de desplazamiento
      const ks = []; for (let k = -(h - 1); k <= h - 1; k++) if (!anclada || k === 0) ks.push(k);
      const W = new Map(ks.map(k => [k, V.map(([x, cab]) => [desplazado(x, k), cab, x])]));
      // mínimo Si para un código de cabezal A0: máscara actual mc (valores de A0) y vecina mn (valores 0)
      const costeSi = new Map();
      const siMinimo = A0 => {
        if (costeSi.has(A0)) return costeSi.get(A0);
        let res = null;
        const total = 2 * h;
        for (let tam = 1; tam <= total && !res; tam++) {
          // recorre máscaras de 2h bits con tam bits (actual: bits 0..h-1, vecina: h..2h-1)
          const rc = (pos, quedan, m) => {
            if (res) return;
            if (quedan === 0) {
              const mc = m & ((1 << h) - 1), mn = m >> h;
              if (mn & ~mascaraNb) return;
              if (!(mc & A0)) return;                                  // al menos un • (guía del motor)
              for (const k of ks) {
                const L = W.get(k);
                for (const [xa, ca, orig] of L) {
                  if ((xa ^ A0) & mc) continue;
                  if (k === 0 && orig === A0) continue;                // el encaje bueno
                  // ¿existe vecina legal compatible?
                  for (const [xb, cb] of L) { if (ca && cb) continue; if (xb & mn) continue; res = null; return; }
                }
              }
              res = { mc, mn, coste: pc(mc) + pc(mn) };
              return;
            }
            for (let p = pos; p < total; p++) rc(p + 1, quedan - 1, m | (1 << p));
          };
          rc(0, tam, 0);
        }
        costeSi.set(A0, res); return res;
      };
      // mejor reparto de códigos entre estados (permutaciones)
      const perm = (arr) => arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perm([...arr.slice(0, i), ...arr.slice(i + 1)]).map(p => [x, ...p]));
      for (const p of perm(cods)) {
        const cod = Object.fromEntries(Q.map((q, i) => [q, p[i]]));
        let total = 0, detalle = [], ok = true;
        for (const t of transiciones) {
          const A0 = cod[t.q] | (t.s << sr), A1 = t.w << sr;
          const si = siMinimo(A0); if (!si) { ok = false; break; }
          const entonces = pc(A0 ^ A1) + (t.q2 === "H" ? 0 : pc(cod[t.q2]));
          total += si.coste + entonces; detalle.push({ ...t, A0, A1, si, entonces });
        }
        if (ok && (!mejor || total < mejor.total)) mejor = { total, h, sr, cod, detalle, anclada };
      }
    }
  }
  return mejor;
}

const MAQ = {
  bb2: { A: { 0: "1RB", 1: "1LB" }, B: { 0: "1LA", 1: "1RH" } },
  bb3: { A: { 0: "1RB", 1: "1RH" }, B: { 0: "0RC", 1: "1RB" }, C: { 0: "1LC", 1: "1LA" } },
  bb4: { A: { 0: "1RB", 1: "1LB" }, B: { 0: "1LA", 1: "0LC" }, C: { 0: "1RH", 1: "1LD" }, D: { 0: "1RD", 1: "0RA" } },
};
module.exports = { buscar, MAQ };
if (require.main === module) {
  const extra = +process.argv[2] || 0;
  for (const [id, tabla] of Object.entries(MAQ)) {
    const t0 = Date.now(), m = buscar(tabla, extra);
    if (!m) { console.log(`${id}: h = mínimo + ${extra}: SIN SOLUCIÓN (ninguna codificación se autolocaliza)`); continue; }
    const fila = r => r === m.sr ? "símbolo" : "estado";
    console.log(`${id}: h = ${m.h} celdas por casilla, ${m.detalle.length} reglas, ${m.total} celdas especificadas (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    console.log(`   fila de símbolo ${m.sr}; códigos: ${Object.entries(m.cod).map(([q, c]) => q + "=" + c.toString(2).padStart(m.h, "0").split("").reverse().join("")).join(" ")}  (fila 0 primero)`);
    for (const d of m.detalle) console.log(`   ${d.q}${d.s} → ${d.w}${d.d > 0 ? "R" : "L"}${d.q2}: Si ${d.si.coste} (actual ${pc(d.si.mc)}, vecina ${pc(d.si.mn)}) + Entonces ${d.entonces}`);
  }
}
