// Tabla completa: para cada máquina y altura, el mínimo de celdas especificadas, anclada y sin anclaje,
// verificado en el motor real. Guarda las soluciones en resultados.json.
const fs = require("fs");
const { buscar, MAQ } = require("./minima.js");
const { ejecutar } = require("./verificar.js");
const CASOS = [["bb2", 0, true], ["bb2", 1, false], ["bb2", 2, false], ["bb2", 3, false],
  ["bb3", 0, true], ["bb3", 2, false], ["bb3", 3, false],
  ["bb4", 0, true], ["bb4", 1, false], ["bb4", 2, false]];
const out = [];
for (const [id, e, a] of CASOS) {
  const t0 = Date.now(), s = buscar(MAQ[id], e, a);
  if (!s) { out.push({ id, extra: e, anclada: a, solucion: null }); console.log(id, e, a, "sin solución"); continue; }
  const r = ejecutar(s, MAQ[id]);
  const fila = { id, h: s.h, anclada: a, celdas: s.total, reglas: r.reglas, unica: r.unica, ok: r.ok, segundos: (Date.now() - t0) / 1000,
    filaSimbolo: s.sr, codigos: Object.fromEntries(Object.entries(s.cod).map(([q, c]) => [q, c.toString(2).padStart(s.h, "0").split("").reverse().join("")])) };
  out.push(fila);
  console.log(`${id} ${a ? "anclada   " : "sin anclaje"} h=${s.h}: ${s.total} celdas · ${r.unica ? "1 coincidencia/paso" : "AMBIGUA"} · ${r.ok ? "idéntica a la directa" : "DISTINTA"} · ${fila.segundos.toFixed(0)} s`);
  fs.writeFileSync(__dirname + "/resultados.json", JSON.stringify(out, null, 1));
}
