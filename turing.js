/*
 * Máquinas de Turing en el lenguaje •
 * -----------------------------------
 * La cinta es una fila de columnas. Cada columna es una casilla de la cinta, de arriba abajo:
 *   fila 0          marca • (siempre)
 *   fila 1          símbolo (• = 1, vacío = 0)
 *   filas 2..1+b    estado de la cabeza en binario (todo vacío = la cabeza no está aquí)
 *   fila 2+b        marca • (siempre)
 * con b = bits para numerar los estados (incluido el de parada) empezando en 1.
 *
 * Una regla por transición (estado q, símbolo s) → (escribe w, mueve d, estado q'): lee la columna de la cabeza
 * (marcas, s y el código de q) y la columna vecina en la dirección d (marcas y sin cabeza; su símbolo da igual);
 * escribe w, borra la cabeza y la pone con el estado q' en la vecina. El estado de parada no tiene reglas: al
 * llegar a él no hay coincidencias y el motor se detiene.
 *
 * Por qué solo encaja en la cabeza real (sin red ni anclaje):
 *  - En vertical: la regla exige • en la fila 0 y en la última de la columna. Fuera de la cinta todo está vacío,
 *    así que cualquier desplazamiento vertical deja una de las dos marcas fuera y falla.
 *  - En horizontal: las casillas miden una columna, así que toda posición está alineada; y solo la columna de
 *    la cabeza tiene un código de estado distinto de cero.
 */
(function (global) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./engine.js") : global.Punto;
  const { ANY, DOT, EMPTY } = P;

  // tabla: { A: { 0: "1RB", 1: "1LB" }, ... }; "H" es el estado de parada
  function preparar(tabla) {
    const estados = [...Object.keys(tabla), "H"];
    const b = Math.ceil(Math.log2(estados.length + 1));
    const codigo = q => estados.indexOf(q) + 1;
    return { estados, b, alto: b + 3, codigo };
  }

  function reglasTuring(tabla) {
    const M = preparar(tabla), { b } = M, rules = [];
    const fondo = b + 2;
    for (const q of Object.keys(tabla))
      for (const s of [0, 1]) {
        const t = tabla[q][s];
        if (!t) continue;
        const w = +t[0], d = t[1] === "R" ? 1 : -1, q2 = t[2];
        const cells = [];
        // columna de la cabeza
        cells.push([0, 0, DOT, ANY], [0, 1, s ? DOT : EMPTY, s === w ? ANY : (w ? DOT : EMPTY)], [0, fondo, DOT, ANY]);
        for (let i = 0; i < b; i++) {
          const bit = (M.codigo(q) >> (b - 1 - i)) & 1;
          cells.push([0, 2 + i, bit ? DOT : EMPTY, bit ? EMPTY : ANY]);
        }
        // columna vecina
        cells.push([d, 0, DOT, ANY], [d, fondo, DOT, ANY]);
        for (let i = 0; i < b; i++) {
          const bit = (M.codigo(q2) >> (b - 1 - i)) & 1;
          cells.push([d, 2 + i, EMPTY, bit ? DOT : ANY]);
        }
        const x0 = Math.min(0, d);
        const r = P.newRule(2, M.alto, `${q} lee ${s} → escribe ${w}, ${d > 0 ? "→" : "←"}, ${q2}`);
        for (const [x, y, l, rr] of cells) { r.lhs[y * 2 + x - x0] = l; r.rhs[y * 2 + x - x0] = rr; }
        r.anchor = [-x0, 0];
        rules.push(r);
      }
    return rules;
  }

  /** Pinta la cinta (columnas x0..x0+largo-1 desde la fila y0) con los símbolos y la cabeza en x0+cabeza. */
  function pintarCinta(world, tabla, { x0, y0, largo, cinta = "", cabeza = 0, estado }) {
    const M = preparar(tabla);
    const set = (x, y) => { world.cells[(y0 + y) * world.w + x0 + x] = 1; };
    for (let x = 0; x < largo; x++) {
      set(x, 0); set(x, M.alto - 1);
      if (cinta[x] === "1") set(x, 1);
    }
    const c = M.codigo(estado || Object.keys(tabla)[0]);
    for (let i = 0; i < M.b; i++) if ((c >> (M.b - 1 - i)) & 1) set(cabeza, 2 + i);
  }

  /** Lee la cinta: símbolos, posición y estado de la cabeza. */
  function leerCinta(world, tabla, { x0, y0, largo }) {
    const M = preparar(tabla);
    const at = (x, y) => world.cells[(y0 + y) * world.w + x0 + x];
    let s = "", cabeza = -1, estado = null;
    for (let x = 0; x < largo; x++) {
      s += at(x, 1) ? "1" : "0";
      let c = 0;
      for (let i = 0; i < M.b; i++) c = (c << 1) | at(x, 2 + i);
      if (c) { cabeza = x; estado = M.estados[c - 1]; }
    }
    return { cinta: s, cabeza, estado };
  }

  /** Simulación directa de la máquina (referencia para las pruebas). */
  function simular(tabla, { cinta = "", cabeza = 0, estado, largo, max = 1e6 }) {
    const t = cinta.padEnd(largo, "0").split("").map(Number);
    let q = estado || Object.keys(tabla)[0], pasos = 0;
    while (q !== "H" && pasos < max) {
      const tr = tabla[q][t[cabeza]];
      t[cabeza] = +tr[0]; cabeza += tr[1] === "R" ? 1 : -1; q = tr[2]; pasos++;
      if (cabeza < 0 || cabeza >= largo) throw new Error("la cabeza se sale de la cinta");
    }
    return { cinta: t.join(""), cabeza, estado: q, pasos };
  }

  const MAQUINAS = [
    {
      id: "turing-suma", nombre: "Suma unaria: 3 + 2",
      desc: "Cinta 111 0 11. Recorre los unos, rellena el hueco, va al final y borra un uno: quedan 5 unos.",
      tabla: { A: { 1: "1RA", 0: "1RB" }, B: { 1: "1RB", 0: "0LC" }, C: { 1: "0LH" } },
      cinta: "000111011000", cabeza: 3, largo: 12,
    },
    {
      id: "turing-bb2", nombre: "Busy beaver de 2 estados",
      desc: "La máquina de 2 estados que más unos escribe antes de parar: 4 unos en 6 pasos.",
      tabla: { A: { 0: "1RB", 1: "1LB" }, B: { 0: "1LA", 1: "1RH" } },
      cinta: "", cabeza: 6, largo: 12,
    },
    {
      id: "turing-bb3", nombre: "Busy beaver de 3 estados",
      desc: "Campeona de 3 estados en número de unos: 6 unos en 14 pasos antes de parar.",
      tabla: { A: { 0: "1RB", 1: "1RH" }, B: { 0: "0RC", 1: "1RB" }, C: { 0: "1LC", 1: "1LA" } },
      cinta: "", cabeza: 6, largo: 16,
    },
    {
      id: "turing-bb4", nombre: "Busy beaver de 4 estados",
      desc: "Campeona de 4 estados: 13 unos y 107 pasos antes de parar.",
      tabla: { A: { 0: "1RB", 1: "1LB" }, B: { 0: "1LA", 1: "0LC" }, C: { 0: "1RH", 1: "1LD" }, D: { 0: "1RD", 1: "0RA" } },
      cinta: "", cabeza: 12, largo: 20,
    },
  ];

  const api = { preparar, reglasTuring, pintarCinta, leerCinta, simular, MAQUINAS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PuntoTuring = api;
})(typeof window !== "undefined" ? window : globalThis);
