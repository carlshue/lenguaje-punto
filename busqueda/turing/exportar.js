// Exporta las máquinas mínimas al editor (../../minimas.js): reglas ya compiladas y código del cabezal inicial.
const fs = require("fs");
const { buscar, MAQ } = require("./minima.js");
const { reglas, ejecutar } = require("./verificar.js");
const NOMBRE = { bb2: "busy beaver 2", bb3: "busy beaver 3", bb4: "busy beaver 4" };
const CASOS = [["bb4", 0, true], ["bb4", 1, false], ["bb3", 2, false], ["bb2", 2, false]];
const out = [];
for (const [id, e, a] of CASOS) {
  const s = buscar(MAQ[id], e, a), r = ejecutar(s, MAQ[id]);
  if (!r.ok || !r.unica) throw new Error(id + " no verifica");
  const q0 = Object.keys(MAQ[id])[0];
  out.push({
    id: `turing-min-${id}${a ? "-anclada" : ""}`, maquina: id, nombre: NOMBRE[id], anclada: a, h: s.h, filaSimbolo: s.sr, celdas: s.total,
    tabla: MAQ[id], cabezal: s.cod[q0],
    codigos: Object.fromEntries(Object.entries(s.cod).map(([q, c]) => [q, c.toString(2).padStart(s.h, "0").split("").reverse().join("")])),
    reglas: reglas(s).map(r => ({ name: r.name, w: r.w, h: r.h, lhs: r.lhs, rhs: r.rhs, anchor: r.anchor, anchored: r.anchored })),
  });
  console.log(out[out.length - 1].id, s.total, "celdas");
}
fs.writeFileSync(__dirname + "/../../minimas.js",
  "/* Generado por busqueda/turing/exportar.js: máquinas de Turing en su mínima expresión. No editar a mano. */\n" +
  "(function (global) {\n  const MINIMAS = " + JSON.stringify(out) + ";\n" +
  "  if (typeof module !== \"undefined\" && module.exports) module.exports = MINIMAS;\n  else global.PuntoMinimas = MINIMAS;\n" +
  "})(typeof window !== \"undefined\" ? window : globalThis);\n");
