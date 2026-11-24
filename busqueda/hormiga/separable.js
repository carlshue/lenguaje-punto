// Construye y verifica en el motor real hormigas separables (zona de píxel + zona de hormiga) sin anclaje.
// Variante (a): el mundo empieza vacío y el vacío es la red blanca.
// Variante (b): bloques con • de marca; 4 reglas de crecimiento construyen la red y la hormiga va detrás.
const P = require("../../engine.js");
const { ruleFromCells } = require("../../examples.js");
const { DOT, EMPTY, ANY } = P;
const DIRS = ["U", "L", "D", "R"], FL = "↑←↓→";
const IZQ = { U: "L", L: "D", D: "R", R: "U" }, DER = { U: "R", R: "D", D: "L", L: "U" };
const MV = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

const { reglasSeparables: construir } = require("../../examples.js");

function verificar(s, pasos = 12000, modo = "seq") {
  const { rules, N, A, pos } = construir(s);
  const B = 120, w = P.newWorld(B * s.w, Math.max(B * s.h, 64)); w.wrap = false;
  const a0 = 60, b0 = Math.floor(w.h / s.h / 2);
  const leer = (a, b) => { let p = 0; for (let k = 0; k < s.w * s.h; k++) { const [x, y] = pos(k); p |= w.cells[(b * s.h + y) * w.w + a * s.w + x] << k; } return p; };
  const pinta = (a, b, p) => { for (let k = 0; k < s.w * s.h; k++) { const [x, y] = pos(k); w.cells[(b * s.h + y) * w.w + a * s.w + x] = (p >> k) & 1; } };
  pinta(a0, b0, A[0][0]);                                            // mundo vacío + la hormiga ↑ (en (b), su bloque ya construido)
  const v = P.compileRules(rules);
  // trayectoria clásica
  const ref = []; { const col = new Map(); let x = 0, y = 0, d = "U";
    for (let i = 0; i < pasos; i++) { const k = x + "," + y, c = col.get(k) || 0; d = c ? DER[d] : IZQ[d]; col.set(k, 1 - c); x += MV[d][0]; y += MV[d][1]; ref.push([x, y, d]); } }
  let i = 0, unica = true, t = 0, maxEspera = 0, espera = 0;
  let pos0 = [a0, b0];
  while (i < pasos && t < pasos * 3) {
    if (modo === "seq" && t < 2000 && P.findMatches(w, v).length !== 1) unica = false;
    const st = P.step(w, v, modo); t++;
    if (!st.applied) break;
    // ¿se ha movido la hormiga al siguiente bloque de la referencia?
    const [rx, ry, rd] = ref[i], a = a0 + rx, b = b0 + ry;
    const p = leer(a, b), c = p === A[0][DIRS.indexOf(rd)] ? 0 : p === A[1][DIRS.indexOf(rd)] ? 1 : -1;
    if (c >= 0) { i++; maxEspera = Math.max(maxEspera, espera); espera = 0; } else espera++;
  }
  return { reglas: rules.length, variantes: v.length, unica, pasos_hormiga: i, pasos_motor: t, maxEspera, ok: i === pasos };
}

module.exports = { construir, verificar };
if (require.main === module) {
  const sol = JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"))[0];
  const modo = process.argv[3] || "seq";
  console.log(JSON.stringify(verificar(sol, 12000, modo)));
}
