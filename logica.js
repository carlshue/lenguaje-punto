/*
 * Puertas lógicas en el lenguaje •
 * --------------------------------
 * Las señales bajan por «carriles» verticales. Cada carril mide W = 6 celdas: las dos primeras son los raíles
 * (doble raíl: • en el primero = 0, • en el segundo = 1, los dos vacíos = sin señal) y las otras 4 quedan vacías.
 * El doble raíl hace falta para NOT: con un solo raíl el 0 sería vacío y ninguna regla podría dispararse con él.
 *
 * Un circuito es una pila de etapas. Las filas pares llevan señales y las impares los componentes:
 *   fila 2s     entradas de la etapa s
 *   fila 2s+1   código del componente (patrón de • que dice qué es: AND, OR, cruce...)
 *   fila 2s+2   salidas de la etapa s = entradas de la etapa s+1
 * Cada componente es un juego de reglas (una por combinación de entradas): leen las entradas, el código y las
 * salidas vacías; borran las entradas y escriben las salidas. No hay red ni anclaje: el código va en los •.
 *
 * Por qué ninguna regla puede encajar donde no debe (demostración, no simulación):
 *  - Todo código empieza por «11» y en una fila de señales nunca hay dos • seguidos. Así la fila de código de
 *    una regla solo puede caer sobre una fila de código, y la regla queda alineada en vertical.
 *  - En horizontal es un código sin coma en 1D: todo código es «11» + carga sin «11» que empieza por 0 + «0».
 *    En una fila de códigos, «11» solo aparece donde empieza un componente, así que una regla solo puede
 *    empezar donde empieza un componente. Además, ningún código de 2 carriles empieza por un código de 1
 *    carril seguido de 0. `verificarSinComa` comprueba estas condiciones.
 */
(function (global) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./engine.js") : global.Punto;
  const { ANY, DOT, EMPTY } = P;
  const W = 6;

  // k: carriles que ocupa; ent / sal: carriles de entrada y de salida; f: valores de salida
  const TIPOS = {
    PASO: { k: 1, ent: [0], sal: [0], f: ([a]) => [a], nombre: "paso" },
    NOT: { k: 1, ent: [0], sal: [0], f: ([a]) => [1 - a], nombre: "NOT" },
    AND: { k: 2, ent: [0, 1], sal: [0], f: ([a, b]) => [a & b], nombre: "AND" },
    OR: { k: 2, ent: [0, 1], sal: [0], f: ([a, b]) => [a | b], nombre: "OR" },
    XOR: { k: 2, ent: [0, 1], sal: [0], f: ([a, b]) => [a ^ b], nombre: "XOR" },
    NAND: { k: 2, ent: [0, 1], sal: [0], f: ([a, b]) => [1 - (a & b)], nombre: "NAND" },
    NOR: { k: 2, ent: [0, 1], sal: [0], f: ([a, b]) => [1 - (a | b)], nombre: "NOR" },
    XNOR: { k: 2, ent: [0, 1], sal: [0], f: ([a, b]) => [1 - (a ^ b)], nombre: "XNOR" },
    COPIA: { k: 2, ent: [0], sal: [0, 1], f: ([a]) => [a, a], nombre: "copia" },
    CRUCE: { k: 2, ent: [0, 1], sal: [0, 1], f: ([a, b]) => [b, a], nombre: "cruce" },
    DER: { k: 2, ent: [0], sal: [1], f: ([a]) => [a], nombre: "→" },
    IZQ: { k: 2, ent: [1], sal: [0], f: ([a]) => [a], nombre: "←" },
  };

  // ---------- Códigos ----------
  const sin11 = s => !s.includes("11");
  function cargas(n) {
    const out = [];
    for (let i = 0; i < 1 << n; i++) {
      const s = i.toString(2).padStart(n, "0");
      if (s[0] === "0" && sin11(s)) out.push(s);
    }
    return out;
  }
  const CODIGO = {};
  {
    const uno = cargas(W - 3).map(p => "11" + p + "0");          // 110000, 110010, 110100
    CODIGO.PASO = uno[0]; CODIGO.NOT = uno[2];
    const usados = [CODIGO.PASO, CODIGO.NOT];
    const dos = cargas(2 * W - 3).map(p => "11" + p + "0")
      .filter(c => !usados.includes(c.slice(0, W)));                // no empieza por un código de 1 carril
    let i = 0;
    for (const t of Object.keys(TIPOS)) if (TIPOS[t].k === 2) CODIGO[t] = dos[i++];
  }

  /** Comprueba las condiciones de código sin coma sobre todas las concatenaciones de 3 unidades. */
  function verificarSinComa() {
    const codigos = Object.values(CODIGO), unidades = ["0".repeat(W), ...codigos];
    for (const c of codigos) if (!c.startsWith("11") || c.indexOf("11", 1) >= 0 || !c.endsWith("0")) return false;
    for (const a of unidades) for (const b of unidades) for (const c of unidades) {
      const s = a + b + c;
      for (let o = 0; o < a.length; o++)
        for (const k of codigos) if (s.substr(o, k.length) === k && !(o === 0 && k === a)) return false;
    }
    return true;
  }

  // ---------- Reglas ----------
  const combinaciones = n => [...Array(1 << n).keys()].map(i => [...Array(n).keys()].map(j => (i >> (n - 1 - j)) & 1));

  function reglasDe(tipo) {
    const T = TIPOS[tipo], code = CODIGO[tipo], rules = [];
    for (const vals of combinaciones(T.ent.length)) {
      const out = T.f(vals), cells = [];
      T.ent.forEach((c, j) => {
        cells.push([c * W + vals[j], 0, DOT, EMPTY], [c * W + 1 - vals[j], 0, EMPTY, ANY]);
      });
      for (let x = 0; x < code.length; x++) cells.push([x, 1, code[x] === "1" ? DOT : EMPTY, ANY]);
      T.sal.forEach((c, j) => {
        cells.push([c * W + out[j], 2, EMPTY, DOT], [c * W + 1 - out[j], 2, EMPTY, ANY]);
      });
      rules.push(celdasARegla(`${T.nombre} ${vals.join("·")} → ${out.join("·")}`, cells));
    }
    return rules;
  }
  function celdasARegla(name, cells) {
    const w = Math.max(...cells.map(c => c[0])) + 1, h = 3;
    const r = P.newRule(w, h, name);
    for (const [x, y, l, rr] of cells) { r.lhs[y * w + x] = l; r.rhs[y * w + x] = rr; }
    r.anchor = [0, 0];
    return r;
  }
  function reglasLogica(tipos) { return tipos.flatMap(reglasDe); }

  // ---------- Circuitos ----------
  // circuito = { entradas: [carril, ...], etapas: [[[tipo, carril], ...], ...], salidas: [carril, ...], carriles }
  /** Evalúa el circuito de forma abstracta (lo que debería salir) y comprueba que está bien cableado. */
  function evaluar(circ, vals) {
    let L = new Map(circ.entradas.map((c, i) => [c, vals[i]]));
    for (const etapa of circ.etapas) {
      const N = new Map(), usados = new Set();
      for (const [t, c] of etapa) {
        const T = TIPOS[t];
        const ins = T.ent.map(j => { if (!L.has(c + j)) throw new Error(`${t} en el carril ${c}: falta la entrada ${c + j}`); usados.add(c + j); return L.get(c + j); });
        T.f(ins).forEach((v, j) => N.set(c + T.sal[j], v));
      }
      for (const c of L.keys()) if (!usados.has(c)) throw new Error(`la señal del carril ${c} no tiene componente`);
      L = N;
    }
    return circ.salidas.map(c => L.get(c));
  }
  /** Pinta un circuito con las entradas dadas a partir de (x0, y0). */
  function pintar(world, circ, vals, x0, y0) {
    const set = (x, y) => { world.cells[(y0 + y) * world.w + x0 + x] = 1; };
    circ.entradas.forEach((c, i) => set(c * W + vals[i], 0));
    circ.etapas.forEach((etapa, s) => {
      for (const [t, c] of etapa) {
        const code = CODIGO[t];
        for (let x = 0; x < code.length; x++) if (code[x] === "1") set(c * W + x, 2 * s + 1);
      }
    });
  }
  const tiposDe = circs => [...new Set(circs.flatMap(c => c.etapas.flat().map(([t]) => t)))];
  /** Lee las salidas de un circuito ya ejecutado (null si no hay señal o es inválida). */
  function leer(world, circ, x0, y0) {
    const y = y0 + 2 * circ.etapas.length;
    return circ.salidas.map(c => {
      const a = world.cells[y * world.w + x0 + c * W], b = world.cells[y * world.w + x0 + c * W + 1];
      return a && !b ? 0 : b && !a ? 1 : null;
    });
  }

  // Semisumador: A en el carril 0, B en el 2 → suma en el 0, acarreo en el 2
  const SEMI = [
    [["COPIA", 0], ["COPIA", 2]],                        // A A B B
    [["PASO", 0], ["CRUCE", 1], ["PASO", 3]],            // A B A B
    [["XOR", 0], ["AND", 2]],                            // suma · acarreo
  ];
  const CIRCUITOS = {
    semisumador: { nombre: "Semisumador", entradas: [0, 2], etapas: SEMI, salidas: [0, 2], carriles: 4,
      etiquetas: { entradas: ["A", "B"], salidas: ["suma", "acarreo"] } },
    sumador: {
      nombre: "Sumador completo", entradas: [0, 2, 4], salidas: [0, 3], carriles: 6,
      etiquetas: { entradas: ["A", "B", "Cin"], salidas: ["suma", "Cout"] },
      etapas: [
        ...SEMI.map(e => [...e, ["PASO", 4]]),                              // s1 @0, c1 @2, C @4
        [["PASO", 0], ["DER", 2], ["PASO", 4]],                             // s1 @0, c1 @3, C @4
        [["PASO", 0], ["CRUCE", 3]],                                        // s1 @0, C @3, c1 @4
        [["PASO", 0], ["IZQ", 2], ["DER", 4]],                              // s1 @0, C @2, c1 @5
        ...SEMI.map(e => [...e, ["PASO", 5]]),                              // s @0, c2 @2, c1 @5
        [["PASO", 0], ["DER", 2], ["IZQ", 4]],                              // s @0, c2 @3, c1 @4
        [["PASO", 0], ["OR", 3]],                                           // s @0, Cout @3
      ],
    },
  };

  /** Una sola puerta: entradas en los carriles 0 y 1 (o solo el 0), salida en el 0. */
  function circuitoPuerta(tipo) {
    const T = TIPOS[tipo];
    return { nombre: T.nombre, entradas: T.ent, etapas: [[[tipo, 0]]], salidas: T.sal, carriles: T.k };
  }

  /** Mundo con una copia del circuito por cada combinación de entradas, en una fila (y, si hay varias, apiladas). */
  function mundoTablas(filas) {
    // filas: [{ circ, combos }]
    const sep = 1;                                                      // carriles vacíos entre copias
    const anchos = filas.map(f => f.combos.length * (f.circ.carriles + sep) * W);
    const altos = filas.map(f => 2 * f.circ.etapas.length + 1);
    const w = Math.max(...anchos) + W, h = altos.reduce((a, b) => a + b + 2, 0) + 2;
    const sitios = [];
    let y = 2;
    filas.forEach((f, i) => {
      f.combos.forEach((vals, j) => sitios.push({ circ: f.circ, vals, x: W + j * (f.circ.carriles + sep) * W, y }));
      y += altos[i] + 2;
    });
    return { w, h, sitios };
  }

  const PUERTAS = ["AND", "OR", "XOR", "NAND", "NOR", "XNOR", "NOT"];

  const api = { W, TIPOS, CODIGO, verificarSinComa, reglasDe, reglasLogica, evaluar, pintar, leer, tiposDe,
    CIRCUITOS, circuitoPuerta, combinaciones, mundoTablas, PUERTAS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PuntoLogica = api;
})(typeof window !== "undefined" ? window : globalThis);
