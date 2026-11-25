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
console.log(ok ? "\nTODO OK" : "\nHAY FALLOS");
process.exit(ok ? 0 : 1);
