// Construye las reglas • de la universal mínima (universal_min.js) y ejecuta los programas en el motor real.
const P = require("../../engine.js");
const T = require("../../turing.js");
const { preparar, evaluar, todosLosCubos } = require("./universal_min.js");
const { ANY, DOT, EMPTY } = P;

function construir(sol, M = preparar(), { anclada = true } = {}) {
  anclada = M.anclada && anclada;
  const { kS, h, parada } = M;
  const ev = evaluar(M, sol.codS, sol.codQ, todosLosCubos(kS), true);
  const rules = ev.reglas.map(({ q, cubo, a, si }) => {
    const cx = a.mueve > 0 ? 0 : 1, nx = cx + a.mueve;
    const r = P.newRule(2, h, `${q} · ${a.sims.length > 3 ? a.sims.length + " símbolos" : a.sims.join(" ")} → ${a.escribe || "="}, ${a.mueve > 0 ? "→" : "←"}, ${a.q2}`);
    for (const f of si) r.lhs[f.r * 2 + cx] = f.v ? DOT : EMPTY;   // f.r ya es la fila física
    if (a.escribe != null) {
      const t = sol.codS[a.escribe];
      for (let b = 0; b < kS; b++) {
        const fijo = (cubo[0] >> b) & 1, val = (cubo[1] >> b) & 1, tb = (t >> b) & 1;
        if (!(fijo && val === tb)) r.rhs[M.filaS[b] * 2 + cx] = tb ? DOT : EMPTY;
      }
    }
    const cq = sol.codQ[q];
    for (let b = 0; b < M.kQ; b++) if ((cq >> b) & 1) r.rhs[M.filaQ[b] * 2 + cx] = EMPTY;
    if (a.q2 !== parada) { const c2 = sol.codQ[a.q2]; for (let b = 0; b < M.kQ; b++) if ((c2 >> b) & 1) r.rhs[M.filaQ[b] * 2 + nx] = DOT; }
    r.anchor = [cx, 0]; r.anchored = anclada;
    return r;
  });
  return { rules, M, total: ev.total };
}
const celdas = rules => rules.reduce((x, r) => x + r.lhs.filter(v => v !== ANY).length + r.rhs.filter(v => v !== ANY).length, 0);

function ejecutar(sol, m, opciones = {}, M0) {
  const { rules, M } = construir(sol, M0, opciones);
  const { simbolos, inicioCinta } = T.tira(m);
  const h = M.h, y0 = h, ancho = simbolos.length + 4;
  const world = P.newWorld(ancho, 3 * h);   // vacío por encima y por debajo de la tira
  Object.assign(world.lattice, { type: "rect", px: 1, py: h, ox: 0, oy: y0 });
  simbolos.forEach((s, x) => { for (let b = 0; b < M.kS; b++) if ((sol.codS[s] >> b) & 1) world.cells[(y0 + M.filaS[b]) * ancho + x] = 1; });
  const c0 = sol.codQ.READ; for (let b = 0; b < M.kQ; b++) if ((c0 >> b) & 1) world.cells[(y0 + M.filaQ[b]) * ancho] = 1;
  const v = P.compileRules(rules);
  let pasos = 0, unica = true;
  for (;;) {
    const ms = P.findMatches(world, v, 2);
    if (!ms.length) break;
    if (ms.length > 1) unica = false;
    P.step(world, v, "seq"); pasos++;
  }
  const inv = Object.fromEntries(Object.entries(sol.codS).map(([s, c]) => [c, s]));
  const leidos = [];
  for (let x = 0; x < ancho; x++) { let c = 0; for (let b = 0; b < M.kS; b++) c |= world.cells[(y0 + M.filaS[b]) * ancho + x] << b; leidos.push(inv[c] || "?"); }
  const cinta = T.cintaDe(leidos.slice(0, simbolos.length), inicioCinta);
  const ref = T.simular(m.tabla, m), dir = T.universalDirecta(simbolos);
  return { pasos, pasosDir: dir.pasos, unica, ok: cinta.cinta === ref.cinta && pasos === dir.pasos, celdas: celdas(rules), reglas: rules.length };
}
module.exports = { construir, ejecutar, celdas };
if (require.main === module) {
  const sol = JSON.parse(require("fs").readFileSync(process.argv[2] || __dirname + "/um_2.json"));
  for (const m of T.PROGRAMAS) {
    const r = ejecutar(sol, m);
    console.log(`${m.id}: ${r.reglas} reglas, ${r.celdas} celdas · ${r.unica ? "1 coincidencia por paso" : "AMBIGUA"} · ${r.pasos} pasos (directa ${r.pasosDir}) · ${r.ok ? "cinta idéntica" : "DISTINTA"}`);
  }
}
