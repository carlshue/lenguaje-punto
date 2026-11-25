// Compila una solución de minima.js a reglas • y la ejecuta en el motor real contra la máquina directa.
const P = require("../../engine.js");
const T = require("../../turing.js");
const { ANY, DOT, EMPTY } = P;

function reglas(sol) {
  const { h, sr, cod, detalle, anclada } = sol;
  return detalle.map(t => {
    const cx = t.d > 0 ? 0 : 1, nx = cx + t.d;
    const r = P.newRule(2, h, `${t.q} lee ${t.s} → ${t.w}${t.d > 0 ? "R" : "L"}${t.q2}`);
    for (let y = 0; y < h; y++) {
      const b0 = (t.A0 >> y) & 1, b1 = (t.A1 >> y) & 1, i = y * 2 + cx;
      if ((t.si.mc >> y) & 1) r.lhs[i] = b0 ? DOT : EMPTY;
      if (b0 !== b1) r.rhs[i] = b1 ? DOT : EMPTY;
      const j = y * 2 + nx;
      if ((t.si.mn >> y) & 1) r.lhs[j] = EMPTY;
      if (t.q2 !== "H" && (cod[t.q2] >> y) & 1) r.rhs[j] = DOT;
    }
    r.anchor = [cx, 0]; r.anchored = !!anclada;
    return r;
  });
}
function celdas(rules) { return rules.reduce((a, r) => a + r.lhs.filter(x => x !== ANY).length + r.rhs.filter(x => x !== ANY).length, 0); }

function ejecutar(sol, tabla, { ancho = 60, x0 = 30 } = {}) {
  const { h, sr, cod } = sol, y0 = h;
  const world = P.newWorld(ancho, 3 * h);
  Object.assign(world.lattice, { type: "rect", px: 1, py: h, ox: 0, oy: y0 });
  const q0 = Object.keys(tabla)[0];
  for (let y = 0; y < h; y++) if ((cod[q0] >> y) & 1) world.cells[(y0 + y) * ancho + x0] = 1;
  const rules = reglas(sol), v = P.compileRules(rules);
  let pasos = 0, unica = true;
  for (;;) {
    const n = P.findMatches(world, v).length;
    if (n === 0) break;
    if (n !== 1) unica = false;
    P.step(world, v, "seq"); pasos++;
    if (pasos > 1e5) break;
  }
  let cinta = ""; for (let x = 0; x < ancho; x++) cinta += world.cells[(y0 + sr) * ancho + x] ? "1" : "0";
  const ref = T.simular(tabla, { cinta: "", cabeza: x0, largo: ancho });
  const restos = world.cells.reduce((a, c, i) => a + (c && ((i / ancho | 0) !== y0 + sr) ? 1 : 0), 0);
  return { pasos, unica, cinta, ok: cinta === ref.cinta && pasos === ref.pasos && restos === 0, ref, celdas: celdas(rules), reglas: rules.length };
}
module.exports = { reglas, celdas, ejecutar };
