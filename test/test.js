const P = require("../engine.js");
const { EXAMPLES } = require("../examples.js");
const IZQ = { U: "L", L: "D", D: "R", R: "U" }, DER = { U: "R", R: "D", D: "L", L: "U" };
const MV = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
function clasica(n, bx, by) {
  const col = new Map(); let x = bx, y = by, d = "U"; const t = [];
  for (let i = 0; i < n; i++) { const k = x + "," + y; const neg = col.get(k) || 0;
    d = neg ? DER[d] : IZQ[d]; col.set(k, 1 - neg); x += MV[d][0]; y += MV[d][1]; t.push([x, y]); }
  return t;
}
function load(id) {
  const ex = EXAMPLES.find(e => e.id === id);
  const w = P.newWorld(ex.world.w, ex.world.h); w.wrap = ex.world.wrap; Object.assign(w.lattice, ex.world.lattice);
  ex.init.call(ex, w); return { ex, w, rules: ex.rules() };
}
let ok = true;
function check(name, cond) { console.log((cond ? "OK   " : "FALLA") + " " + name); ok = ok && cond; }

// Hormiga 6: comprobar unicidad de coincidencia (búsqueda completa) y trayectoria
{
  const { w, rules } = load("hormiga6"); const v = P.compileRules(rules);
  const n0 = P.countDots(w); const ref = clasica(12000, 45, 45); let traj = [], unica = true;
  for (let i = 0; i < 12000; i++) {
    if (i < 3000) { const m = P.findMatches(w, v); if (m.length !== 1) unica = false; }
    P.step(w, v, "seq");
    // localizar la hormiga: • en columnas 0-1 del bloque
    let pos = null;
    for (let k = 0; k < w.cells.length; k++) if (w.cells[k] && (k % w.w) % 3 !== 2) pos = [Math.floor((k % w.w) / 3), Math.floor(Math.floor(k / w.w) / 2)];
    traj.push(pos);
  }
  check("hormiga6 anclada: exactamente 1 coincidencia por paso (3000 pasos)", unica);
  check("hormiga6: trayectoria idéntica a la clásica (12000 pasos)", traj.every((p, i) => p[0] === ref[i][0] && p[1] === ref[i][1]));
  check("hormiga6: conserva los •", P.countDots(w) === n0);
  const d = [traj[11999][0] - traj[11999 - 104][0], traj[11999][1] - traj[11999 - 104][1]];
  check("hormiga6: autopista (desplazamiento cada 104 pasos = " + d + ")", Math.abs(d[0]) === 2 && Math.abs(d[1]) === 2);
  console.log("  variantes compiladas:", v.length);
}
// Hormiga cruz
for (const anch of [true, false]) {
  const { w, rules } = load("hormigaCruz"); rules.forEach(r => r.anchored = anch); const v = P.compileRules(rules);
  let unica = true, okTraj = true;
  const cx0 = (() => { for (let k = 0; k < w.cells.length; k++) if (w.cells[k]) return [k % w.w, Math.floor(k / w.w) + 1]; })();
  const ref = clasica(12000, 0, 0);
  const RX = [2, -1], DX = [1, 2];
  for (let i = 0; i < 12000; i++) {
    if (i < 2000) { const m = P.findMatches(w, v); if (m.length !== 1) unica = false; }
    const s = P.step(w, v, "seq"); if (!s.applied) { okTraj = false; break; }
  }
  if (anch) {
    // reconstruir: comprobar colores finales contra la clásica
    const col = new Map(); { let x = 0, y = 0, d = "U"; for (let i = 0; i < 12000; i++) { const k = x + "," + y; const neg = col.get(k) || 0; d = neg ? DER[d] : IZQ[d]; col.set(k, 1 - neg); x += MV[d][0]; y += MV[d][1]; } }
    let iguales = true;
    for (const [k, c] of col) { const [bx, by] = k.split(",").map(Number); const X = cx0[0] + bx * RX[0] + by * DX[0], Y = cx0[1] + bx * RX[1] + by * DX[1]; if (w.cells[Y * w.w + X] !== c) iguales = false; }
    check("cruz anclada: 1 coincidencia por paso", unica);
    check("cruz anclada: colores finales idénticos a la clásica", iguales);
  } else check("cruz SIN anclaje: ambigua (más de 1 coincidencia)", !unica);
}
// Sierpinski
{
  const { w, rules } = load("sierpinski"); const v = P.compileRules(rules);
  for (let i = 0; i < 128; i++) P.step(w, v, "par-prio");
  let good = true; let row = new Uint8Array(w.w); row[128] = 1;
  for (let y = 0; y < 128; y++) { for (let x = 0; x < w.w; x++) if (w.cells[y * w.w + x] !== row[x]) good = false;
    const nr = new Uint8Array(w.w); for (let x = 1; x < w.w - 1; x++) nr[x] = row[x - 1] ^ row[x + 1]; row = nr; }
  check("sierpinski: coincide con la regla 90", good);
}
// Arena y gas: conservación
for (const id of ["arena", "gas"]) {
  const { ex, w, rules } = load(id); const v = P.compileRules(rules); const n0 = P.countDots(w);
  for (let i = 0; i < 300; i++) P.step(w, v, ex.mode);
  check(id + ": conserva los • (" + n0 + ")", P.countDots(w) === n0);
}
// Simetrías: la arena acaba quieta y apilada
console.log(ok ? "\nTODO OK" : "\nHAY FALLOS"); process.exit(ok ? 0 : 1);
