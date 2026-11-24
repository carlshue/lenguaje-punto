// Hormiga con grid y el mínimo de reglas contando variantes: 8 reglas de 3 celdas sobre cruces de 5 celdas.
// Cada regla lee el píxel (centro) y la hormiga (un brazo), invierte el píxel, borra la hormiga y la pone
// en el brazo del bloque vecino. No comprueba nada más: solo hay una hormiga en el mundo.
const P = require("../../engine.js");
const { ruleFromCells } = require("../../examples.js");
const { DOT, EMPTY, ANY } = P;
const ARM = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const MOVX = { R: [2, -1], D: [1, 2], L: [-2, 1], U: [-1, -2] };      // red de cruces (x + 2y) mod 5 = 0
const IZQ = { U: "L", L: "D", D: "R", R: "U" }, DER = { U: "R", R: "D", D: "L", L: "U" };
const MV = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

const { reglasHormigaMinima: reglasMinimas } = require("../../examples.js");

function simular(rules, pasos) {
  const w = P.newWorld(260, 220); Object.assign(w.lattice, { type: "diag", m: 2, n: 5, k: 0 });
  let cx = 110, cy = 100; while ((cx + 2 * cy) % 5) cx++;
  w.cells[(cy - 1) * w.w + cx] = 1;                                   // hormiga ↑ en el bloque (0, 0)
  const v = P.compileRules(rules);
  let unica = true;
  for (let i = 0; i < pasos; i++) {
    if (i < 2000 && P.findMatches(w, v).length !== 1) unica = false;
    if (!P.step(w, v, "seq").applied) return { ok: false, paso: i };
  }
  // colores finales frente a la clásica
  const col = new Map(); let x = 0, y = 0, d = "U";
  for (let i = 0; i < pasos; i++) { const k = x + "," + y, n = col.get(k) || 0; d = n ? DER[d] : IZQ[d]; col.set(k, 1 - n); x += MV[d][0]; y += MV[d][1]; }
  let iguales = true;
  for (const [k, c] of col) { const [bx, by] = k.split(",").map(Number);
    const X = cx + bx * 2 + by * 1, Y = cy - bx + by * 2; if (w.cells[Y * w.w + X] !== c) iguales = false; }
  const hx = cx + x * 2 + y, hy = cy - x + y * 2;
  const hormiga = Object.values(ARM).some(([ax, ay]) => w.cells[(hy + ay) * w.w + hx + ax] === 1);
  return { ok: true, unica, iguales, hormiga, variantes: v.length };
}

const r = simular(reglasMinimas(), 12000);
const celdas = reglasMinimas().reduce((s, x) => s + x.lhs.filter((l, i) => l || x.rhs[i]).length, 0);
console.log(`8 reglas ancladas, ${celdas} celdas en total (${celdas / 8} por regla), ${r.variantes} variantes compiladas`);
console.log(r.ok && r.unica && r.iguales && r.hormiga ? "OK: 1 coincidencia por paso, colores idénticos a la clásica en 12.000 pasos y la hormiga donde debe"
  : "FALLA " + JSON.stringify(r));
module.exports = { reglasMinimas };
