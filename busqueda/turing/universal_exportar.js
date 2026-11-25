// Exporta la universal mínima (sin anclaje) al editor: ../../universal_minima.js con códigos y reglas compiladas.
// Elige la mejor solución guardada (um_libre_*.json), la verifica con los 4 programas y la escribe.
const fs = require("fs"), path = require("path");
const T = require("../../turing.js");
const { preparar } = require("./universal_min.js");
const { construir, ejecutar } = require("./universal_verificar.js");
const sols = fs.readdirSync(__dirname).filter(f => /^um_libre_.*\.json$/.test(f)).map(f => ({ f, ...JSON.parse(fs.readFileSync(path.join(__dirname, f))) }))
  .filter(s => !s.imposibles && s.total < 1e4 && s.filasExtra === 2 && s.arriba === 2).sort((a, b) => a.total - b.total);
const sol = sols[0];
const M = preparar(undefined, undefined, { anclada: false, filasExtra: sol.filasExtra, arriba: sol.arriba });
for (const m of T.PROGRAMAS) {
  const r = ejecutar(sol, m, { anclada: false }, M);
  if (!r.ok || !r.unica) throw new Error(`${sol.f} falla con ${m.id}`);
  console.log(`${m.id}: ok (${r.pasos} pasos, ${r.celdas} celdas, ${r.reglas} reglas)`);
}
const anclada = JSON.parse(fs.readFileSync(path.join(__dirname, "um_2.json")));
const { rules } = construir(sol, M, { anclada: false });
const datos = {
  h: M.h, filaS: M.filaS, filaQ: M.filaQ, codS: sol.codS, codQ: sol.codQ, celdas: sol.total, celdasAnclada: anclada.total,
  reglas: rules.map(r => ({ name: r.name, w: r.w, h: r.h, lhs: r.lhs, rhs: r.rhs, anchor: r.anchor })),
};
fs.writeFileSync(path.join(__dirname, "../../universal_minima.js"),
  "/* Generado por busqueda/turing/universal_exportar.js: la máquina universal compilada a • con el esquema mínimo. No editar a mano. */\n" +
  "(function (global) {\n  const UNIVERSAL_MINIMA = " + JSON.stringify(datos) + ";\n" +
  "  if (typeof module !== \"undefined\" && module.exports) module.exports = UNIVERSAL_MINIMA;\n  else global.PuntoUniversalMinima = UNIVERSAL_MINIMA;\n" +
  "})(typeof window !== \"undefined\" ? window : globalThis);\n");
console.log(`escrito universal_minima.js desde ${sol.f}: ${sol.total} celdas, ${rules.length} reglas, h = ${M.h}`);
