// Máquinas de Turing (turing.js) en el motor, sin anclaje: 1 coincidencia por paso, misma cinta, mismos pasos
// y mismo estado final que la simulación directa.
const P = require("../engine.js");
const T = require("../turing.js");
const { EXAMPLES } = require("../examples.js");
let ok = true;
function check(name, cond) { console.log((cond ? "OK   " : "FALLA") + " " + name); ok = ok && cond; }

for (const m of T.MAQUINAS) {
  const ex = EXAMPLES.find(e => e.id === m.id);
  const world = P.newWorld(ex.world.w, ex.world.h);
  ex.init(world);
  const rules = ex.rules();
  check(`${m.id}: reglas sin anclaje`, rules.every(r => !r.anchored));
  const v = P.compileRules(rules);
  let pasos = 0, unica = true;
  while (pasos < 10000) {
    const n = P.findMatches(world, v).length;
    if (n === 0) break;
    if (n !== 1) unica = false;
    P.step(world, v, "seq"); pasos++;
  }
  const ref = T.simular(m.tabla, m), fin = T.leerCinta(world, m.tabla, ex.cinta);
  check(`${m.id}: exactamente 1 coincidencia por paso`, unica);
  check(`${m.id}: para en ${ref.pasos} pasos como la máquina directa (motor: ${pasos})`, pasos === ref.pasos);
  check(`${m.id}: cinta final ${ref.cinta}`, fin.cinta === ref.cinta);
  check(`${m.id}: cabeza en ${ref.cabeza} y estado ${ref.estado}`, fin.cabeza === ref.cabeza && fin.estado === ref.estado);
}
console.log(ok ? "\nTODO OK" : "\nHAY FALLOS");
process.exit(ok ? 0 : 1);
