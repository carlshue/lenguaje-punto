/* Ejemplos precargados del lenguaje • */
(function (global) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./engine.js") : global.Punto;
  const { ANY, DOT, EMPTY } = P;

  /** Construye una regla a partir de una lista de celdas [x, y, lhs, rhs] con coordenadas libres. */
  function ruleFromCells(name, cells, opts = {}) {
    const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
    const anchor = opts.anchor || [cells[0][0], cells[0][1]];
    xs.push(anchor[0]); ys.push(anchor[1]);
    const minx = Math.min(...xs), miny = Math.min(...ys);
    const w = Math.max(...xs) - minx + 1, h = Math.max(...ys) - miny + 1;
    const r = P.newRule(w, h, name);
    for (const [x, y, l, rr] of cells) {
      r.lhs[(y - miny) * w + (x - minx)] = l;
      r.rhs[(y - miny) * w + (x - minx)] = rr;
    }
    r.anchor = [anchor[0] - minx, anchor[1] - miny];
    r.sym = opts.sym || "none";
    r.anchored = !!opts.anchored;
    return r;
  }

  const IZQ = { U: "L", L: "D", D: "R", R: "U" };
  const DER = { U: "R", R: "D", D: "L", L: "U" };
  const FLECHA = { U: "↑", L: "←", D: "↓", R: "→" };

  // ---------- Hormiga de 6 celdas (conservativa) ----------
  // Bloque 3x2:  [←][↑][P blanco]
  //              [↓][→][P negro ]
  const SLOT6 = { L: [0, 0], U: [1, 0], D: [0, 1], R: [1, 1] };
  const PW = [2, 0], PB = [2, 1];
  const MOV6 = { U: [0, -2], D: [0, 2], L: [-3, 0], R: [3, 0] };

  function reglasHormiga6() {
    const rules = [];
    for (const d of ["U", "L", "D", "R"])
      for (const negro of [false, true]) {
        const nd = negro ? DER[d] : IZQ[d];
        const cells = [];
        for (const s of ["L", "U", "D", "R"]) {
          const [x, y] = SLOT6[s];
          cells.push(s === d ? [x, y, DOT, EMPTY] : [x, y, EMPTY, ANY]);
        }
        const on = negro ? PB : PW, off = negro ? PW : PB;
        cells.push([on[0], on[1], DOT, EMPTY], [off[0], off[1], EMPTY, DOT]);
        const t = [SLOT6[nd][0] + MOV6[nd][0], SLOT6[nd][1] + MOV6[nd][1]];
        cells.push([t[0], t[1], EMPTY, DOT]);
        rules.push(ruleFromCells(`${FLECHA[d]} sobre ${negro ? "negro" : "blanco"} → ${FLECHA[nd]}`, cells, { anchor: [0, 0], anchored: true }));
      }
    return rules;
  }

  // ---------- Hormiga en cruz de 5 celdas ----------
  //      [↑]
  //  [←] [P] [→]      P: • = negro, vacío = blanco
  //      [↓]
  const ARM = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  const MOVX = { R: [2, -1], D: [1, 2], L: [-2, 1], U: [-1, -2] }; // red de cruces (x + 2y) % 5 == 0

  function reglasHormigaCruz() {
    const rules = [];
    for (const negro of [false, true]) {
      const d = "U", nd = negro ? DER[d] : IZQ[d];
      const cells = [[0, 0, negro ? DOT : EMPTY, negro ? EMPTY : DOT]];
      for (const s of ["U", "D", "L", "R"]) {
        const [x, y] = ARM[s];
        cells.push(s === d ? [x, y, DOT, EMPTY] : [x, y, EMPTY, ANY]);
      }
      const t = [MOVX[nd][0] + ARM[nd][0], MOVX[nd][1] + ARM[nd][1]];
      cells.push([t[0], t[1], EMPTY, DOT]);
      rules.push(ruleFromCells(`Píxel ${negro ? "negro: gira derecha" : "blanco: gira izquierda"}`, cells,
        { anchor: [0, 0], sym: "rot", anchored: true }));
    }
    return rules;
  }

  function set(world, x, y) { world.cells[y * world.w + x] = 1; }

  const EXAMPLES = [
    {
      id: "hormiga6",
      name: "Hormiga de Langton • (6 celdas, conserva los •)",
      desc: "Cada píxel es un bloque 3×2. El • de la columna derecha es el píxel: arriba = blanco, abajo = negro. " +
        "La hormiga es un único • en una de las 4 celdas de la izquierda: su posición es su orientación. " +
        "8 reglas ancladas a la red 3×2. El número de • no cambia nunca. Hacia el paso 10.000 aparece la autopista. " +
        "Prueba a desmarcar «anclada»: un • de píxel se puede leer como la hormiga de un bloque falso y la regla " +
        "encaja en varios sitios a la vez. Dónde empieza cada bloque es información que aporta la red, no los •.",
      world: { w: 360, h: 240, wrap: false, lattice: { type: "rect", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 } },
      tile: { w: 3, h: 2, cells: [0, 0, 1, 0, 0, 0] },
      mode: "seq", cell: 4, speed: 300,
      rules: reglasHormiga6,
      init(world) {
        P.fillTile(world, this.tile);
        set(world, 45 * 3 + 1, 45 * 2); // hormiga mirando ↑ en el bloque (45, 45)
      },
    },
    {
      id: "hormigaCruz",
      name: "Hormiga de Langton en cruz (5 celdas, ancladas)",
      desc: "Cada píxel es una cruz: centro = píxel (• negro, vacío blanco) y la hormiga en un brazo. Las cruces teselan el plano. " +
        "Solo 2 reglas: la simetría de rotación genera las 8. Pero necesitan ANCLAJE a la red diagonal (x + 2y) mod 5 = 0: " +
        "con el mundo vacío, un • suelto encaja en las 4 rotaciones y la regla no sabe dónde está el centro. " +
        "Desmarca «anclada» en las reglas para verlo fallar. Esa información la aporta la red, no los •.",
      world: { w: 250, h: 200, wrap: false, lattice: { type: "diag", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 } },
      mode: "seq", cell: 4, speed: 200,
      rules: reglasHormigaCruz,
      init(world) {
        // centro de cruz cerca de (100, 90): (x + 2y) % 5 == 0
        let x = 100, y = 90;
        while ((x + 2 * y) % 5 !== 0) x++;
        set(world, x, y - 1); // hormiga en el brazo ↑
      },
    },
    {
      id: "gas",
      name: "Gas de partículas (paseo aleatorio)",
      desc: "Una sola regla: [• vacío] ~> [vacío •], con las 4 rotaciones. Cada • se mueve a un hueco vecino al azar. " +
        "Es conservativa: mira el contador de •. Mundo toroidal.",
      world: { w: 120, h: 80, wrap: true, lattice: { type: "none", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 } },
      mode: "par-rand", cell: 7, speed: 1,
      rules: () => [ruleFromCells("Moverse", [[0, 0, DOT, EMPTY], [1, 0, EMPTY, DOT]], { sym: "rot" })],
      init(world) {
        for (let y = 30; y < 50; y++) for (let x = 50; x < 70; x++) if (Math.random() < 0.6) set(world, x, y);
      },
    },
    {
      id: "arena",
      name: "Arena (gravedad)",
      desc: "Dos reglas: caer si debajo hay hueco, y deslizarse en diagonal si debajo hay • (con espejo). " +
        "Modo paralelo: si dos granos quieren el mismo hueco, gana el primero. Los • se conservan y se forma un montón.",
      world: { w: 120, h: 80, wrap: false, lattice: { type: "none", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 } },
      mode: "par-prio", cell: 7, speed: 1,
      rules: () => [
        ruleFromCells("Caer", [[0, 0, DOT, EMPTY], [0, 1, EMPTY, DOT]]),
        ruleFromCells("Deslizar", [[0, 0, DOT, EMPTY], [0, 1, DOT, ANY], [1, 0, EMPTY, ANY], [1, 1, EMPTY, DOT]], { sym: "mirror" }),
      ],
      init(world) {
        for (let y = 5; y < 25; y++) for (let x = 45; x < 75; x++) set(world, x, y);
      },
    },
    {
      id: "sierpinski",
      name: "Triángulo de Sierpinski (regla 90)",
      desc: "Una regla con espejo: si arriba-izquierda hay • y arriba-derecha no (o al revés), pon • debajo en el centro. " +
        "Cada fila es un instante de tiempo: la segunda dimensión es el tiempo. Partiendo de un solo • sale el triángulo.",
      world: { w: 257, h: 129, wrap: false, lattice: { type: "none", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 } },
      mode: "par-prio", cell: 4, speed: 1,
      rules: () => [ruleFromCells("XOR", [[0, 0, DOT, ANY], [2, 0, EMPTY, ANY], [1, 1, EMPTY, DOT]], { anchor: [1, 1], sym: "mirror" })],
      init(world) { set(world, 128, 0); },
    },
    {
      id: "libre",
      name: "Lienzo libre",
      desc: "Grilla vacía y una regla en blanco para empezar desde cero.",
      world: { w: 80, h: 60, wrap: false, lattice: { type: "none", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 } },
      mode: "par-prio", cell: 12, speed: 1,
      rules: () => [P.newRule(3, 3, "Mi regla")],
      init() { },
    },
  ];

  const api = { EXAMPLES, ruleFromCells };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PuntoEjemplos = api;
})(typeof window !== "undefined" ? window : globalThis);
