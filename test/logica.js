// Puertas lógicas (logica.js): cada circuito, con todas sus entradas a la vez y sin anclaje, da la salida esperada,
// y en cada paso todas las coincidencias están en componentes reales (ninguna regla encaja donde no debe).
const P = require("../engine.js");
const L = require("../logica.js");
let ok = true;
function check(name, cond) { console.log((cond ? "OK   " : "FALLA") + " " + name); ok = ok && cond; }

check("códigos: sin coma en 1D y empiezan por 11", L.verificarSinComa());

function probar(nombre, filas) {
  const { w, h, sitios } = L.mundoTablas(filas);
  const world = P.newWorld(w, h);
  for (const s of sitios) L.pintar(world, s.circ, s.vals, s.x, s.y);
  const v = P.compileRules(L.reglasLogica(L.tiposDe(filas.map(f => f.circ))));
  // posiciones reales de los componentes (esquina superior izquierda de su regla)
  const reales = new Set();
  for (const s of sitios) s.circ.etapas.forEach((e, k) => e.forEach(([, c]) => reales.add(`${s.x + c * L.W},${s.y + 2 * k}`)));
  let falsas = 0, conflictos = 0, pasos = 0;
  for (; pasos < 200; pasos++) {
    for (const m of P.findMatches(world, v)) if (!reales.has(`${m.ox},${m.oy}`)) falsas++;
    const st = P.step(world, v, "par-skip");
    conflictos += st.conflicts;
    if (!st.applied) break;
  }
  check(`${nombre}: ninguna coincidencia fuera de un componente real`, falsas === 0);
  check(`${nombre}: sin conflictos`, conflictos === 0);
  let bien = true;
  for (const s of sitios) {
    const esperado = L.evaluar(s.circ, s.vals).join(""), obtenido = L.leer(world, s.circ, s.x, s.y).join("");
    if (esperado !== obtenido) { bien = false; console.log(`   ${s.circ.nombre} ${s.vals.join("")}: esperado ${esperado}, sale ${obtenido}`); }
  }
  check(`${nombre}: ${sitios.length} casos, todas las salidas correctas (${pasos} pasos)`, bien);
}

probar("tablas de verdad", L.PUERTAS.map(t => { const circ = L.circuitoPuerta(t); return { circ, combos: L.combinaciones(circ.entradas.length) }; }));
for (const k of ["semisumador", "sumador"]) {
  const circ = L.CIRCUITOS[k];
  probar(circ.nombre, [{ circ, combos: L.combinaciones(circ.entradas.length) }]);
}
console.log(ok ? "\nTODO OK" : "\nHAY FALLOS");
process.exit(ok ? 0 : 1);
