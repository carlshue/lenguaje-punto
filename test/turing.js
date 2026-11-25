// Máquina de Turing universal (turing.js): un único juego de reglas fijo ejecuta todos los programas.
// Para cada programa, en el motor real y sin anclaje: 1 coincidencia por paso, misma cinta final, posición del
// cabezal y número de pasos simulados que la simulación directa, y el programa queda limpio al terminar.
const P = require("../engine.js");
const T = require("../turing.js");
const UNICIDAD = +process.argv[2] || 3000;
let ok = true;
function check(name, cond) { console.log((cond ? "OK   " : "FALLA") + " " + name); ok = ok && cond; }

const rules = T.reglasUniversales();
check(`reglas fijas: ${rules.length}, ninguna anclada`, rules.every(r => !r.anchored));
const v = P.compileRules(rules);

for (const m of T.PROGRAMAS) {
  const { simbolos, inicioCinta } = T.tira(m);
  const world = P.newWorld(simbolos.length + 2, T.ALTO + 2);
  T.pintar(world, simbolos, 1, 1);
  let pasos = 0, unica = true;
  const t0 = Date.now();
  for (;;) {
    if (pasos < UNICIDAD && P.findMatches(world, v).length > 1) unica = false;
    const st = P.step(world, v, "seq");
    if (!st.applied) break;
    pasos++;
  }
  const fin = T.leer(world, simbolos.length, 1, 1);
  const ref = T.simular(m.tabla, m), dir = T.universalDirecta(simbolos);
  const c = T.cintaDe(fin.simbolos, inicioCinta);
  check(`${m.id}: 1 coincidencia por paso (primeros ${Math.min(UNICIDAD, pasos)} pasos)`, unica);
  check(`${m.id}: para en HALT tras ${pasos} pasos universales (${((Date.now() - t0) / 1000).toFixed(1)} s)`, fin.estado === "HALT" && pasos === dir.pasos);
  check(`${m.id}: cinta ${c.cinta} y cabezal en ${c.cabeza}, como la máquina directa (${ref.pasos} pasos)`, c.cinta === ref.cinta && c.cabeza === ref.cabeza);
  const prog = fin.simbolos.slice(0, inicioCinta).join(" "), limpio = simbolos.slice(0, inicioCinta).join(" ").replace("B*", "B");
  check(`${m.id}: el programa queda sin marcas`, prog === limpio);
}
const { EXAMPLES } = require("../examples.js");

// La universal del editor (universal_minima.js: códigos y reglas mínimos, sin anclaje)
for (const m of T.PROGRAMAS) {
  const ex = EXAMPLES.find(e => e.id === "turing-" + m.id), U = ex.universal;
  if (!U) { check(`${m.id}: falta universal_minima.js`, false); continue; }
  const world = P.newWorld(ex.world.w, ex.world.h); ex.init(world);
  const vv = P.compileRules(ex.rules());
  let pasos = 0, unica = true;
  for (;;) { const ms = P.findMatches(world, vv, 2); if (!ms.length) break; if (ms.length > 1) unica = false; P.step(world, vv, "seq"); pasos++; }
  const inv = Object.fromEntries(Object.entries(U.codS).map(([s, c]) => [c, s]));
  const leidos = [];
  for (let x = 0; x < U.n; x++) { let c = 0; U.filaS.forEach((f, b) => { c |= world.cells[(U.y0 + f) * world.w + x] << b; }); leidos.push(inv[c] || "?"); }
  const c = T.cintaDe(leidos, U.inicioCinta), ref = T.simular(m.tabla, m), dir = T.universalDirecta(T.tira(m).simbolos);
  check(`universal mínima (${vv.length} reglas, ${U.celdas} celdas, sin anclaje) con ${m.id}: 1 coincidencia por paso, ${pasos} pasos, cinta ${c.cinta}`,
    unica && pasos === dir.pasos && c.cinta === ref.cinta);
}

// Máquinas en su mínima expresión (minimas.js): mismas comprobaciones, reglas ya compiladas
for (const m of require("../minimas.js")) {
  const ex = EXAMPLES.find(e => e.id === m.id);
  const world = P.newWorld(ex.world.w, ex.world.h); Object.assign(world.lattice, ex.world.lattice); ex.init(world);
  const vv = P.compileRules(ex.rules());
  let pasos = 0, unica = true;
  for (;;) { const n = P.findMatches(world, vv).length; if (!n) break; if (n !== 1) unica = false; P.step(world, vv, "seq"); pasos++; }
  let cinta = ""; for (let x = 0; x < world.w; x++) cinta += world.cells[(m.h + m.filaSimbolo) * world.w + x] ? "1" : "0";
  const ref = T.simular(m.tabla, { cinta: "", cabeza: 30, largo: world.w });
  check(`${m.id} (${m.h} celdas por casilla, ${m.celdas} celdas de reglas${m.anclada ? ", anclada" : ""}): 1 coincidencia por paso, ${ref.pasos} pasos y cinta idéntica`,
    unica && pasos === ref.pasos && cinta === ref.cinta);
}
console.log(ok ? "\nTODO OK" : "\nHAY FALLOS");
process.exit(ok ? 0 : 1);
