/*
 * Juego de la Vida de Conway en el lenguaje •, con las reglas normales del editor (sin tocar el motor)
 * ----------------------------------------------------------------------------------------------------
 * Cada regla es una ventana 3×3 centrada en la celda que cambia y solo escribe en el centro. Se usa la simetría
 * «all» (rotaciones y espejos), así que basta con una regla por clase de vecindario. Modo paralelo: todas las
 * reglas leen el estado anterior y se escriben a la vez, que es justo la actualización síncrona de Conway.
 *
 *   nace          centro vacío y exactamente 3 vecinos     → las 9 celdas especificadas, pone •
 *   soledad       centro • y 0 o 1 vecinos                 → las 9 celdas especificadas, vacía
 *   exceso        centro • y al menos 4 vecinos            → solo el centro y 4 vecinos •, el resto «cualquiera»
 *   (sobrevive con 2 o 3 vecinos: no hace falta regla, no cambia nada)
 *
 * Con «exceso» varias reglas pueden encajar en la misma celda (si tiene 5 vecinos, hay 5 cuartetos). Todas
 * escriben lo mismo (vaciar), así que el modo «paralelo: gana la primera» da el resultado correcto. En «paralelo:
 * descarta conflictos» esas coincidencias se anularían entre sí: hay que usar par-prio.
 */
(function (global) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./engine.js") : global.Punto;
  const { ANY, DOT, EMPTY } = P;

  const VEC = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  const D4 = [(x, y) => [x, y], (x, y) => [-y, x], (x, y) => [-x, -y], (x, y) => [y, -x],
    (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [y, x], (x, y) => [-y, -x]];
  const idx = (x, y) => VEC.findIndex(([a, b]) => a === x && b === y);

  /** Representantes de los subconjuntos de k vecinos, salvo rotaciones y espejos. */
  function clases(k) {
    const vistos = new Set(), out = [];
    for (let m = 0; m < 256; m++) {
      let n = 0; for (let i = 0; i < 8; i++) n += (m >> i) & 1;
      if (n !== k) continue;
      const canon = Math.min(...D4.map(t => {
        let r = 0; for (let i = 0; i < 8; i++) if ((m >> i) & 1) r |= 1 << idx(...t(...VEC[i])); return r;
      }));
      if (!vistos.has(canon)) { vistos.add(canon); out.push(canon); }
    }
    return out;
  }

  function regla(nombre, centroL, centroR, mascara, resto) {
    const r = P.newRule(3, 3, nombre);
    r.lhs[4] = centroL; r.rhs[4] = centroR;
    VEC.forEach(([x, y], i) => { r.lhs[(y + 1) * 3 + x + 1] = (mascara >> i) & 1 ? DOT : resto; });
    r.anchor = [1, 1]; r.sym = "all";
    return r;
  }
  function reglasVida() {
    const rules = [];
    clases(3).forEach((m, i) => rules.push(regla(`nace (3 vecinos, forma ${i + 1})`, EMPTY, DOT, m, EMPTY)));
    clases(0).concat(clases(1)).forEach(m => rules.push(regla(`muere por soledad (${m ? 1 : 0} vecino${m ? "" : "s"})`, DOT, EMPTY, m, EMPTY)));
    clases(4).forEach((m, i) => rules.push(regla(`muere por exceso (≥ 4 vecinos, forma ${i + 1})`, DOT, EMPTY, m, ANY)));
    return rules;
  }

  // ---------- Referencia directa (para las pruebas) ----------
  // Bordes: en un mundo sin toro, una ventana 3×3 que se sale no encaja, así que las celdas del borde no cambian.
  function generacion(cells, w, h, wrap) {
    const out = cells.slice();
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!wrap && (x === 0 || y === 0 || x === w - 1 || y === h - 1)) continue;
        let n = 0;
        for (const [dx, dy] of VEC) n += cells[((y + dy + h) % h) * w + ((x + dx + w) % w)];
        const c = cells[y * w + x];
        out[y * w + x] = c ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
      }
    return out;
  }

  // ---------- Patrones ----------
  const dibujo = s => { const out = []; s.trim().split("\n").forEach((f, y) => [...f.trim()].forEach((c, x) => { if (c === "o") out.push([x, y]); })); return out; };
  const PATRONES = {
    planeador: dibujo(`
      .o.
      ..o
      ooo`),
    nave: dibujo(`
      .o..o
      o....
      o...o
      oooo.`),
    pulsar: dibujo(`
      ..ooo...ooo..
      .............
      o....o.o....o
      o....o.o....o
      o....o.o....o
      ..ooo...ooo..
      .............
      ..ooo...ooo..
      o....o.o....o
      o....o.o....o
      o....o.o....o
      .............
      ..ooo...ooo..`),
    rpentomino: dibujo(`
      .oo
      oo.
      .o.`),
    bellota: dibujo(`
      .o.....
      ...o...
      oo..ooo`),
    canon: [[24, 0], [22, 1], [24, 1], [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2], [11, 3], [15, 3], [20, 3], [21, 3],
      [34, 3], [35, 3], [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4], [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5],
      [22, 5], [24, 5], [10, 6], [16, 6], [24, 6], [11, 7], [15, 7], [12, 8], [13, 8]],
  };
  function poner(world, celdas, x0, y0) { for (const [x, y] of celdas) world.cells[(y0 + y) * world.w + x0 + x] = 1; }
  function sopa(world, x0, y0, w, h, semilla = 1, densidad = 0.35) {
    let s = semilla; const azar = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (azar() < densidad) world.cells[(y0 + y) * world.w + x0 + x] = 1;
  }

  const api = { reglasVida, clases, generacion, PATRONES, poner, sopa };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PuntoVida = api;
})(typeof window !== "undefined" ? window : globalThis);
