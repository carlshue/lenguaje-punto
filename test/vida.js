// Juego de la Vida (vida.js) con las reglas normales del editor: generación a generación idéntico a una
// implementación directa de Conway, en toro y en mundo con bordes.
const P = require("../engine.js");
const V = require("../vida.js");
let ok = true;
function check(name, cond) { console.log((cond ? "OK   " : "FALLA") + " " + name); ok = ok && cond; }

const rules = V.reglasVida(), v = P.compileRules(rules);
const cuenta = k => rules.filter(r => r.name.startsWith(k)).length;
check(`${rules.length} reglas (nace ${cuenta("nace")}, soledad ${cuenta("muere por soledad")}, exceso ${cuenta("muere por exceso")}) → ${v.length} variantes, ninguna anclada`,
  rules.every(r => !r.anchored) && v.length === 56 + 9 + 70);

function probar(nombre, w, h, wrap, preparar, gens) {
  const world = P.newWorld(w, h); world.wrap = wrap; preparar(world);
  let ref = world.cells.slice(), igual = true, primera = -1;
  for (let g = 1; g <= gens; g++) {
    P.step(world, v, "par-prio");
    ref = V.generacion(ref, w, h, wrap);
    if (igual && world.cells.some((c, i) => c !== ref[i])) { igual = false; primera = g; }
  }
  check(`${nombre}: ${gens} generaciones idénticas a Conway${igual ? "" : " (difiere en la " + primera + ")"} · población final ${P.countDots(world)}`, igual);
  return world;
}
probar("sopa en toro 64×48", 64, 48, true, w => V.sopa(w, 0, 0, 64, 48, 3), 300);
probar("sopa con bordes 60×40", 60, 40, false, w => V.sopa(w, 5, 5, 50, 30, 9), 300);
probar("planeador en toro", 20, 20, true, w => V.poner(w, V.PATRONES.planeador, 2, 2), 80);
probar("pulsar", 21, 21, false, w => V.poner(w, V.PATRONES.pulsar, 4, 4), 30);
const canon = probar("cañón de Gosper", 80, 50, false, w => V.poner(w, V.PATRONES.canon, 2, 2), 120);

// comprobaciones de patrones conocidos (con la referencia)
let c = new Uint8Array(80 * 50); V.PATRONES.canon.forEach(([x, y]) => c[(y + 2) * 80 + x + 2] = 1);
const n0 = c.reduce((a, b) => a + b); for (let g = 0; g < 30; g++) c = V.generacion(c, 80, 50, false);
check(`cañón de Gosper: tras 30 generaciones, ${n0} + 5 (un planeador) = ${c.reduce((a, b) => a + b)}`, c.reduce((a, b) => a + b) === n0 + 5);
let p = new Uint8Array(21 * 21); V.PATRONES.pulsar.forEach(([x, y]) => p[(y + 4) * 21 + x + 4] = 1);
let p3 = p; for (let g = 0; g < 3; g++) p3 = V.generacion(p3, 21, 21, false);
check("pulsar: periodo 3", p3.every((x, i) => x === p[i]));
console.log(ok ? "\nTODO OK" : "\nHAY FALLOS");
process.exit(ok ? 0 : 1);
