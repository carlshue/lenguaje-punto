/*
 * Máquina de Turing universal en el lenguaje •
 * --------------------------------------------
 * Un único juego de reglas fijo. El programa (la tabla de transiciones de la máquina simulada) y su cinta están
 * escritos en • en el mundo; para ejecutar otro programa se cambian los •, no las reglas.
 *
 * El mundo es una tira de columnas. Cada columna es una casilla de la cinta de la máquina universal:
 *   fila 0        marca • (siempre)
 *   filas 1..5    símbolo de la casilla (5 bits, alfabeto SIMBOLOS)
 *   filas 6..10   estado del cabezal universal (5 bits; todo vacío = el cabezal no está aquí)
 *   fila 11       marca • (siempre)
 * Una regla por (estado del cabezal, grupo de símbolos con la misma acción): lee la columna del cabezal y la
 * vecina, reescribe el símbolo y pasa el cabezal a la vecina. Exactamente una coincidencia por paso: las dos
 * marcas fijan la fila (fuera de la tira todo está vacío) y solo la columna del cabezal tiene estado.
 *
 * La tira, de izquierda a derecha:
 *   #  bloque del estado 1  bloque del estado 2 ...  $  cinta simulada
 * Bloque de un estado:  B  W D N…N  S  W D N…N     (transición con 0 · separador · transición con 1)
 *   W0/W1 = símbolo que escribe, L/R = hacia dónde mueve, k veces N = número del estado siguiente (0 = parar).
 * Marcas: B* = estado actual; W* = transición en curso; N* y B' = contador; T0* y T1* = cabezal simulado.
 *
 * Ciclo por paso simulado:
 *   1. Lee el símbolo bajo T* y lo recuerda en su estado.            READ
 *   2. Va a la izquierda hasta B*, lo borra, entra en la transición   GP, FE
 *      de ese símbolo, marca su W y recuerda W y D.                    RD
 *   3. Va a T*, escribe, mueve el cabezal simulado y lo marca.         TT, MK
 *   4. Vuelve a W*, la desmarca y cuenta las N del estado siguiente:   BK, CS, C0
 *      por cada N marca un bloque más desde la izquierda.              CL, SK, CL2, FN, CN
 *   5. Limpia el contador (N* → N, B' → B) y vuelve a 1.               UN, CL3, CU
 *      Sin N: para (HALT).
 */
(function (global) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./engine.js") : global.Punto;
  const { ANY, DOT, EMPTY } = P;

  const SIMBOLOS = ["#", "B", "B*", "B'", "W0", "W1", "W0*", "W1*", "L", "R", "N", "N*", "S", "$", "T0", "T1", "T0*", "T1*"];
  const BS = 5, BE = 5, ALTO = BS + BE + 2;       // bits de símbolo, bits de estado, alto de la columna
  const codSimbolo = s => SIMBOLOS.indexOf(s) + 1;  // 0 queda libre (nunca aparece)

  // ---------- Tabla fija de la máquina universal ----------
  // delta[estado] = [[símbolos], escribe (null = igual), mueve (-1 | 1), siguiente]; el resto de símbolos no aparece
  const TODOS = SIMBOLOS;
  const menos = (...x) => TODOS.filter(s => !x.includes(s));
  const DELTA = {
    READ: [[["T0*"], null, -1, "GP0"], [["T1*"], null, -1, "GP1"], [menos("T0*", "T1*"), null, 1, "READ"]],
    GP0: [[["B*"], "B", 1, "FE0"], [menos("B*"), null, -1, "GP0"]],
    GP1: [[["B*"], "B", 1, "FE1"], [menos("B*"), null, -1, "GP1"]],
    FE0: [[["W0"], "W0*", 1, "RD0"], [["W1"], "W1*", 1, "RD1"]],
    FE1: [[["S"], null, 1, "FE0"], [["W0", "W1", "L", "R", "N"], null, 1, "FE1"]],
    RD0: [[["L"], null, 1, "TT0L"], [["R"], null, 1, "TT0R"]],
    RD1: [[["L"], null, 1, "TT1L"], [["R"], null, 1, "TT1R"]],
    TT0L: [[["T0*", "T1*"], "T0", -1, "MK"], [menos("T0*", "T1*"), null, 1, "TT0L"]],
    TT0R: [[["T0*", "T1*"], "T0", 1, "MK"], [menos("T0*", "T1*"), null, 1, "TT0R"]],
    TT1L: [[["T0*", "T1*"], "T1", -1, "MK"], [menos("T0*", "T1*"), null, 1, "TT1L"]],
    TT1R: [[["T0*", "T1*"], "T1", 1, "MK"], [menos("T0*", "T1*"), null, 1, "TT1R"]],
    MK: [[["T0"], "T0*", -1, "BK"], [["T1"], "T1*", -1, "BK"]],
    BK: [[["W0*"], "W0", 1, "CS"], [["W1*"], "W1", 1, "CS"], [menos("W0*", "W1*"), null, -1, "BK"]],
    CS: [[["L", "R"], null, 1, "C0"]],
    C0: [[["N"], "N*", -1, "CL"], [["S", "B", "$"], null, -1, "HALT"]],
    CL: [[["#"], null, 1, "SK"], [menos("#"), null, -1, "CL"]],
    SK: [[["B*"], "B'", 1, "SK"], [["B"], "B*", -1, "CL2"], [menos("B*", "B"), null, 1, "SK"]],
    CL2: [[["#"], null, 1, "FN"], [menos("#"), null, -1, "CL2"]],
    FN: [[["N*"], null, 1, "CN"], [menos("N*"), null, 1, "FN"]],
    CN: [[["N*"], null, 1, "CN"], [["N"], "N*", -1, "CL"], [["S", "B", "B*", "B'", "$"], null, -1, "UN"]],
    UN: [[["N*"], "N", -1, "UN"], [["L", "R"], null, -1, "CL3"]],
    CL3: [[["#"], null, 1, "CU"], [menos("#"), null, -1, "CL3"]],
    CU: [[["B'"], "B", 1, "CU"], [["$"], null, 1, "READ"], [menos("B'", "$"), null, 1, "CU"]],
    HALT: [],
  };
  const ESTADOS = Object.keys(DELTA);
  const codEstado = q => ESTADOS.indexOf(q) + 1;

  // ---------- Compilación a reglas • ----------
  // Cada grupo de símbolos con la misma acción se cubre con «cubos» de bits (bits fijos y bits «cualquiera»)
  // que no incluyan símbolos de otros grupos; los códigos libres sirven de comodín. Menos reglas, mismo efecto.
  function cubos(grupo, prohibidos) {
    const libres = new Set(grupo.map(codSimbolo)), mal = new Set(prohibidos.map(codSimbolo));
    const todos = [];
    for (let i = 0; i < 3 ** BS; i++) {                  // cada bit: 0, 1 o comodín (2)
      const c = []; let t = i;
      for (let k = 0; k < BS; k++) { c.push(t % 3); t = Math.floor(t / 3); }
      const miembros = [];
      for (let v = 0; v < 1 << BS; v++) if (c.every((b, k) => b === 2 || b === ((v >> (BS - 1 - k)) & 1))) miembros.push(v);
      if (miembros.some(v => mal.has(v))) continue;
      const cubre = miembros.filter(v => libres.has(v));
      if (cubre.length) todos.push({ c, cubre });
    }
    const falta = new Set(libres), elegidos = [];
    while (falta.size) {
      let mejor = null, n = 0;
      for (const q of todos) { const m = q.cubre.filter(v => falta.has(v)).length; if (m > n) { n = m; mejor = q; } }
      elegidos.push(mejor.c); mejor.cubre.forEach(v => falta.delete(v));
    }
    return elegidos;
  }

  const bitsDe = (v, n) => [...Array(n).keys()].map(k => (v >> (n - 1 - k)) & 1);
  function reglasUniversales() {
    const rules = [];
    for (const q of ESTADOS) {
      const grupos = DELTA[q];
      grupos.forEach(([sims, escribe, mueve, q2], gi) => {
        const otros = grupos.filter((_, j) => j !== gi).flatMap(g => g[0]);
        for (const cubo of cubos(sims, otros)) {
          const cells = [];
          const x0 = Math.min(0, mueve);
          const add = (x, y, l, r) => cells.push([x - x0, y, l, r]);
          add(0, 0, DOT, ANY); add(0, ALTO - 1, DOT, ANY); add(mueve, 0, DOT, ANY); add(mueve, ALTO - 1, DOT, ANY);
          const w = escribe ? bitsDe(codSimbolo(escribe), BS) : null;
          cubo.forEach((b, k) => {
            const l = b === 2 ? ANY : b ? DOT : EMPTY;
            const r = !w || (b !== 2 && b === w[k]) ? ANY : w[k] ? DOT : EMPTY;
            add(0, 1 + k, l, r);
          });
          const e1 = bitsDe(codEstado(q), BE), e2 = bitsDe(codEstado(q2), BE);
          for (let k = 0; k < BE; k++) {
            add(0, 1 + BS + k, e1[k] ? DOT : EMPTY, e1[k] ? EMPTY : ANY);
            add(mueve, 1 + BS + k, EMPTY, e2[k] ? DOT : ANY);
          }
          const r = P.newRule(2, ALTO, `${q} · ${sims.length > 3 ? sims.length + " símbolos" : sims.join(" ")} → ${escribe || "="}, ${mueve > 0 ? "→" : "←"}, ${q2}`);
          for (const [x, y, l, rr] of cells) { r.lhs[y * 2 + x] = l; r.rhs[y * 2 + x] = rr; }
          r.anchor = [-x0, 0];
          rules.push(r);
        }
      });
    }
    return rules;
  }

  // ---------- Programas ----------
  // tabla: { A: { 0: "1RB", 1: "1LB" }, ... }; "H" = parar. El primer estado es el inicial.
  function codificarPrograma(tabla) {
    const est = Object.keys(tabla), out = ["#"];
    est.forEach((q, i) => {
      out.push(i === 0 ? "B*" : "B");
      [0, 1].forEach(s => {
        if (s === 1) out.push("S");
        const t = tabla[q][s] || "0RH";
        out.push("W" + t[0], t[1]);
        const k = t[2] === "H" ? 0 : est.indexOf(t[2]) + 1;
        for (let j = 0; j < k; j++) out.push("N");
      });
    });
    out.push("$");
    return out;
  }
  /** Tira completa: programa + cinta (con el cabezal simulado en `cabeza`). */
  function tira(m) {
    const prog = codificarPrograma(m.tabla);
    const cinta = [...Array(m.largo).keys()].map(i => "T" + (m.cinta[i] === "1" ? 1 : 0) + (i === m.cabeza ? "*" : ""));
    return { simbolos: [...prog, ...cinta], inicioCinta: prog.length };
  }
  function pintar(world, simbolos, x0, y0, cabezal = 0, estado = "READ") {
    const set = (x, y) => { world.cells[(y0 + y) * world.w + x0 + x] = 1; };
    simbolos.forEach((s, x) => {
      set(x, 0); set(x, ALTO - 1);
      bitsDe(codSimbolo(s), BS).forEach((b, k) => { if (b) set(x, 1 + k); });
    });
    bitsDe(codEstado(estado), BE).forEach((b, k) => { if (b) set(cabezal, 1 + BS + k); });
  }
  function leer(world, n, x0, y0) {
    const at = (x, y) => world.cells[(y0 + y) * world.w + x0 + x];
    const simbolos = [];
    let cabezal = -1, estado = null;
    for (let x = 0; x < n; x++) {
      let c = 0, e = 0;
      for (let k = 0; k < BS; k++) c = (c << 1) | at(x, 1 + k);
      for (let k = 0; k < BE; k++) e = (e << 1) | at(x, 1 + BS + k);
      simbolos.push(SIMBOLOS[c - 1] || "?");
      if (e) { cabezal = x; estado = ESTADOS[e - 1]; }
    }
    return { simbolos, cabezal, estado };
  }
  /** Cinta simulada a partir de los símbolos de la tira. */
  function cintaDe(simbolos, inicio) {
    const t = simbolos.slice(inicio);
    return { cinta: t.map(s => s[1]).join(""), cabeza: t.findIndex(s => s.endsWith("*")) };
  }

  /** La máquina universal ejecutada directamente sobre símbolos (rápida; referencia del algoritmo). */
  function universalDirecta(simbolos, max = 1e7) {
    const t = simbolos.slice();
    let x = 0, q = "READ", pasos = 0;
    while (q !== "HALT" && pasos < max) {
      const g = DELTA[q].find(([sims]) => sims.includes(t[x]));
      if (!g) throw new Error(`sin transición: ${q} con ${t[x]} en ${x}`);
      if (g[1]) t[x] = g[1];
      x += g[2]; q = g[3]; pasos++;
    }
    return { simbolos: t, pasos };
  }

  /** Simulación directa de la máquina simulada (referencia para las pruebas). */
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

  const PROGRAMAS = [
    {
      id: "suma", nombre: "Suma unaria 3 + 2",
      desc: "Cinta 111 0 11: recorre los unos, rellena el hueco, va al final y borra un uno. Quedan 5 unos.",
      tabla: { A: { 1: "1RA", 0: "1RB" }, B: { 1: "1RB", 0: "0LC" }, C: { 1: "0LH" } },
      cinta: "0111011000", cabeza: 1, largo: 10,
    },
    {
      id: "bb2", nombre: "Busy beaver de 2 estados",
      desc: "La máquina de 2 estados que más unos escribe antes de parar: 4 unos en 6 pasos.",
      tabla: { A: { 0: "1RB", 1: "1LB" }, B: { 0: "1LA", 1: "1RH" } },
      cinta: "", cabeza: 3, largo: 6,
    },
    {
      id: "bb3", nombre: "Busy beaver de 3 estados",
      desc: "Campeona de 3 estados en número de unos: 6 unos en 14 pasos.",
      tabla: { A: { 0: "1RB", 1: "1RH" }, B: { 0: "0RC", 1: "1RB" }, C: { 0: "1LC", 1: "1LA" } },
      cinta: "", cabeza: 4, largo: 9,
    },
    {
      id: "bb4", nombre: "Busy beaver de 4 estados",
      desc: "Campeona de 4 estados: 13 unos en 107 pasos.",
      tabla: { A: { 0: "1RB", 1: "1LB" }, B: { 0: "1LA", 1: "0LC" }, C: { 0: "1RH", 1: "1LD" }, D: { 0: "1RD", 1: "0RA" } },
      cinta: "", cabeza: 10, largo: 16,
    },
  ];

  const api = { SIMBOLOS, ALTO, BS, BE, DELTA, ESTADOS, reglasUniversales, codificarPrograma, tira, pintar, leer, cintaDe,
    universalDirecta, simular, PROGRAMAS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PuntoTuring = api;
})(typeof window !== "undefined" ? window : globalThis);
