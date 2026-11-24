// Prueba de las codificaciones autolocalizables (ganadores.js): reglas SIN anclaje,
// exactamente 1 coincidencia por paso y la trayectoria de la hormiga clásica (convención de Carlos).
const P = require("../engine.js");
const { EXAMPLES } = require("../examples.js");
const GANADORES = require("../ganadores.js");
const IZQ = { U: "L", L: "D", D: "R", R: "U" }, DER = { U: "R", R: "D", D: "L", L: "U" };
const MV = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }, DI = { U: 0, L: 1, D: 2, R: 3 };
const PASOS = +process.argv[2] || 12000, UNICIDAD = +process.argv[3] || 2000;
let ok = true;
function check(name, cond) { console.log((cond ? "OK   " : "FALLA") + " " + name); ok = ok && cond; }

for (const g of GANADORES) {
  const ex = EXAMPLES.find(e => e.id === g.id);
  const w = P.newWorld(ex.world.w, ex.world.h); Object.assign(w.lattice, ex.world.lattice);
  ex.init.call(ex, w);
  const rules = ex.rules();
  const anclada = rules.some(r => r.anchored);
  const v = P.compileRules(rules);
  const leer = (a, b) => {
    const X = g.origen[0] + a * g.R[0] + b * g.D[0], Y = g.origen[1] + a * g.R[1] + b * g.D[1];
    let p = 0; g.cells.forEach(([x, y], k) => { p |= w.cells[(Y + y) * w.w + X + x] << k; });
    return g.pats.indexOf(p);
  };
  const n0 = P.countDots(w);
  let unica = true, traj = true, x = g.a0, y = g.b0, d = "U", pasos = 0;
  const col = new Map();
  for (let i = 0; i < PASOS; i++) {
    if (i < UNICIDAD && P.findMatches(w, v).length !== 1) { unica = false; }
    if (!P.step(w, v, "seq").applied) { traj = false; break; }
    const k = x + "," + y, neg = col.get(k) || 0;
    d = neg ? DER[d] : IZQ[d]; col.set(k, 1 - neg); x += MV[d][0]; y += MV[d][1];
    if (leer(x, y) !== 5 * (col.get(x + "," + y) || 0) + 1 + DI[d]) { traj = false; break; }
    pasos++;
  }
  let colores = true;
  for (let a = 0; a < g.na; a++) for (let b = 0; b < g.nb; b++) {
    const s = leer(a, b);
    if (s < 0 || Math.floor(s / 5) !== ((col.get(a + "," + b) || 0))) colores = false;
  }
  const t = `${g.id} (${g.forma}, ${g.metricas.n} celdas)`;
  check(`${t}: reglas sin anclaje`, !anclada);
  check(`${t}: exactamente 1 coincidencia por paso (${UNICIDAD} pasos, búsqueda completa)`, unica);
  check(`${t}: trayectoria idéntica a la clásica (${pasos}/${PASOS} pasos)`, traj);
  check(`${t}: colores finales idénticos a la clásica`, colores);
  if (g.metricas.conserva) check(`${t}: conserva los •`, P.countDots(w) === n0);
}
console.log(ok ? "\nTODO OK" : "\nHAY FALLOS"); process.exit(ok ? 0 : 1);
