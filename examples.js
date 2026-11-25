/* Ejemplos precargados del lenguaje • */
(function (global) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./engine.js") : global.Punto;
  const { ANY, DOT, EMPTY } = P;
  const SISTEMAS_MULTI = (typeof module !== "undefined" && module.exports ? (() => { try { return require("./sistemas_multi.js"); } catch (e) { return null; } })() : global.PuntoSistemasMulti) || null;
  const SISTEMAS = (typeof module !== "undefined" && module.exports ? require("./sistemas.js") : global.PuntoSistemas) || null;
  const LOGICA = typeof module !== "undefined" && module.exports ? require("./logica.js") : global.PuntoLogica;
  const VIDA = typeof module !== "undefined" && module.exports ? require("./vida.js") : global.PuntoVida;
  const TURING = typeof module !== "undefined" && module.exports ? require("./turing.js") : global.PuntoTuring;
  const GANADORES = (typeof module !== "undefined" && module.exports ? require("./ganadores.js") : global.PuntoGanadores) || [];

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

  // ---------- Hormiga con grid y el mínimo de reglas: 8 reglas de 3 celdas sobre cruces ----------
  // Cada regla lee el píxel (centro) y la hormiga (un brazo), invierte el píxel, borra la hormiga y la pone en el
  // brazo del bloque vecino. No comprueba nada más: solo hay una hormiga en el mundo.
  function reglasHormigaMinima() {
    const rules = [];
    for (const d of ["U", "L", "D", "R"])
      for (const negro of [false, true]) {
        const nd = negro ? DER[d] : IZQ[d];
        const t = [MOVX[nd][0] + ARM[nd][0], MOVX[nd][1] + ARM[nd][1]];
        rules.push(ruleFromCells(`${FLECHA[d]} sobre ${negro ? "negro" : "blanco"} → ${FLECHA[nd]}`, [
          [0, 0, negro ? DOT : EMPTY, negro ? EMPTY : DOT],
          [ARM[d][0], ARM[d][1], DOT, EMPTY],
          [t[0], t[1], ANY, DOT],
        ], { anchor: [0, 0], anchored: true }));
      }
    return rules;
  }

  // ---------- Hormigas separables sin anclaje (zona de píxel + zona de hormiga) ----------
  // s = { w, h, za: celdas de la zona de hormiga, marca: celda de marca o null, Pw, Pb: píxel, codigos: hormiga ↑←↓→ }
  // Sin marca: el bloque blanco sin hormiga es todo vacío, así que el mundo vacío ya es la red.
  // Con marca: los bloques construidos llevan un • fijo y 4 reglas de crecimiento extienden la red; la hormiga
  // solo avanza sobre bloques con marca.
  const DIRS4 = ["U", "L", "D", "R"];
  function reglasSeparables(s) {
    const { w, h, za } = s, n = w * h, marca = s.marca;
    const base = marca == null ? 0 : 1 << marca;
    const N = [base | s.Pw, base | s.Pb];
    const A = [0, 1].map(c => [0, 1, 2, 3].map(d => N[c] | s.codigos[d]));
    const pos = k => [k % w, Math.floor(k / w)];
    const vec = { U: [0, -h], D: [0, h], L: [-w, 0], R: [w, 0] };
    const rules = [];
    for (let d = 0; d < 4; d++)
      for (const c of [0, 1]) {
        const nd = c === 0 ? IZQ[DIRS4[d]] : DER[DIRS4[d]], ndi = DIRS4.indexOf(nd), [vx, vy] = vec[nd];
        const cells = [];
        for (let k = 0; k < n; k++) {
          const [x, y] = pos(k), a = (A[c][d] >> k) & 1, b = (N[1 - c] >> k) & 1;
          cells.push([x, y, a ? DOT : EMPTY, a === b ? ANY : (b ? DOT : EMPTY)]);
        }
        for (const k of za) {
          const [x, y] = pos(k);
          cells.push([vx + x, vy + y, EMPTY, (s.codigos[ndi] >> k) & 1 ? DOT : ANY]);
        }
        if (marca != null) { const [x, y] = pos(marca); cells.push([vx + x, vy + y, DOT, ANY]); }
        rules.push(ruleFromCells(`${FLECHA[DIRS4[d]]} sobre ${c ? "negro" : "blanco"} → ${FLECHA[nd]}`, cells, { anchor: [0, 0] }));
      }
    if (marca != null)
      for (const v of DIRS4) {
        const [vx, vy] = vec[v], [mx, my] = pos(marca);
        const cells = [[mx, my, DOT, ANY]];
        for (let k = 0; k < n; k++) { const [x, y] = pos(k); cells.push([vx + x, vy + y, EMPTY, (N[0] >> k) & 1 ? DOT : ANY]); }
        rules.push(ruleFromCells(`crecer ${FLECHA[v]}`, cells, { anchor: [mx, my] }));
      }
    return { rules, N, A, pos };
  }
  // Mejor solución de la variante «el vacío es la red» (busqueda/hormiga/sin_red2.py a): bloque 1×6,
  // arriba el píxel (• = negro) y 5 celdas para el código de la hormiga.
  const SIN_RED_A = { w: 1, h: 6, za: [1, 2, 3, 4, 5], marca: null, Pw: 0, Pb: 1, codigos: [10, 34, 38, 52] };

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
      id: "hormigaMinima",
      name: "Hormiga con grid y mínimo de reglas: 8 reglas de 3 celdas",
      desc: "El mínimo contando cada variante como una regla: 8 (4 direcciones × 2 colores; ninguna regla puede cubrir dos casos). " +
        "Cada regla mira solo 3 celdas: el píxel (centro de la cruz), la hormiga (un brazo) y el brazo de llegada del vecino. " +
        "No hace falta comprobar los demás brazos: solo hay una hormiga. Ancladas a la red diagonal (x + 2y) mod 5 = 0.",
      world: { w: 250, h: 200, wrap: false, lattice: { type: "diag", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 } },
      mode: "seq", cell: 4, speed: 200,
      rules: reglasHormigaMinima,
      init(world) {
        let x = 100, y = 90;
        while ((x + 2 * y) % 5 !== 0) x++;
        set(world, x, y - 1);
      },
    },
    {
      id: "hormigaSinRed",
      name: "Hormiga sin red: el mundo vacío ya es la red (8 reglas, sin anclaje)",
      desc: "El mundo empieza completamente vacío y nada está anclado. Bloques 1×6: arriba el píxel (• = negro) y debajo un código " +
        "de varios • para la hormiga, con una forma distinta para cada dirección. El bloque blanco sin hormiga es todo vacío, así que " +
        "el vacío ya es una red blanca implícita y la hormiga va dejando la estructura al pasar. Con la hormiga como un único • es " +
        "imposible: un • aislado en el vacío encaja igual en las 4 direcciones.",
      world: { w: 120, h: 720, wrap: false, lattice: { type: "rect", px: 1, py: 6, ox: 0, oy: 0, m: 2, n: 5, k: 0 } },
      mode: "seq", cell: 3, speed: 200,
      rules: () => reglasSeparables(SIN_RED_A).rules,
      init(world) {
        const { A, pos } = reglasSeparables(SIN_RED_A);
        for (let k = 0; k < 6; k++) { const [x, y] = pos(k); if ((A[0][0] >> k) & 1) set(world, 60 + x, 60 * 6 + y); }
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

  // ---------- Puertas lógicas (logica.js) ----------
  // Cada carril mide 6 celdas: • en la 1.ª = 0, • en la 2.ª = 1. Filas pares: señales; impares: código del componente.
  if (LOGICA) {
    const sinRed = { type: "none", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 };
    const ejLogica = (id, name, desc, filas, cell = 6) => {
      const M = LOGICA.mundoTablas(filas);
      EXAMPLES.push({
        id, name, desc, mode: "par-skip", cell, speed: 0.1,
        world: { w: M.w, h: M.h, wrap: false, lattice: sinRed },
        rules: () => LOGICA.reglasLogica(LOGICA.tiposDe(filas.map(f => f.circ))),
        init(world) { for (const s of M.sitios) LOGICA.pintar(world, s.circ, s.vals, s.x, s.y); },
        logica: M,
      });
    };
    const todas = c => [{ circ: c, combos: LOGICA.combinaciones(c.entradas.length) }];
    const COD = "Cada señal ocupa un carril de 6 celdas con doble raíl: • en la primera celda = 0, • en la segunda = 1 " +
      "(con un solo raíl el 0 sería vacío y NOT no podría dispararse). Las señales bajan: filas pares, señales; impares, " +
      "el código de cada componente, un patrón de • que empieza por «••». Sin red ni anclaje: en una fila de señales nunca " +
      "hay dos • seguidos, así que las reglas solo encajan alineadas con un código, y los códigos son sin coma.";
    ejLogica("logica-tablas", "Puertas lógicas: tablas de verdad (AND, OR, XOR, NAND, NOR, XNOR, NOT)",
      "Una fila por puerta, de arriba abajo AND, OR, XOR, NAND, NOR, XNOR y NOT, con todas sus entradas (00, 01, 10, 11). " +
      "Cada puerta son 4 reglas (2 para NOT): leen las dos entradas y el código, borran las entradas y escriben la salida. " + COD,
      LOGICA.PUERTAS.map(t => todas(LOGICA.circuitoPuerta(t))[0]), 12);
    ejLogica("logica-semisumador", "Puertas lógicas: semisumador (A + B)",
      "Las 4 sumas a la vez, de izquierda a derecha 0+0, 0+1, 1+0, 1+1. Etapa 1: copia A y B; etapa 2: cruce para " +
      "tener A B A B; etapa 3: XOR da la suma (carril 0) y AND el acarreo (carril 2). " + COD,
      todas(LOGICA.CIRCUITOS.semisumador));
    ejLogica("logica-sumador", "Puertas lógicas: sumador completo (A + B + Cin)",
      "Las 8 combinaciones a la vez. Dos semisumadores y un OR, con desplazamientos y cruces para llevar cada señal a su " +
      "sitio: 11 etapas. Al final, la suma en el carril 0 y el acarreo en el carril 3. " + COD,
      todas(LOGICA.CIRCUITOS.sumador));
  }

  // ---------- Juego de la Vida de Conway (vida.js) ----------
  if (VIDA) {
    const nada = { type: "none", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 };
    const COMO = "Las reglas de Conway con las reglas normales del editor: 26 reglas 3×3 con simetría (135 variantes), modo " +
      "paralelo «gana la primera». Nace: centro vacío y exactamente 3 vecinos (10 formas). Muere por soledad: 0 o 1 vecinos " +
      "(3 formas). Muere por exceso: 4 vecinos • y el resto «cualquiera» (13 formas). Sobrevivir con 2 o 3 no necesita regla.";
    const ejVida = (id, name, desc, w, h, wrap, cell, init) => EXAMPLES.push({
      id: "vida-" + id, name: "Vida · " + name, desc: desc + " " + COMO + (wrap ? " Mundo toroidal." : " Sin toro: las celdas del borde no cambian (su ventana 3×3 se sale del mundo)."),
      world: { w, h, wrap, lattice: nada }, mode: "par-prio", cell, speed: 0.25,
      rules: () => VIDA.reglasVida(), init,
    });
    ejVida("planeadores", "planeador y nave ligera", "Un planeador (periodo 4, avanza en diagonal) y una nave ligera (periodo 4, avanza en horizontal).",
      80, 50, true, 9, w => { VIDA.poner(w, VIDA.PATRONES.planeador, 5, 5); VIDA.poner(w, VIDA.PATRONES.nave, 10, 30); });
    ejVida("pulsar", "púlsar", "Oscilador de periodo 3 con 48 células.", 21, 21, false, 18, w => VIDA.poner(w, VIDA.PATRONES.pulsar, 4, 4));
    ejVida("canon", "cañón de Gosper", "El primer patrón de crecimiento infinito: dispara un planeador cada 30 generaciones.",
      120, 80, false, 6, w => VIDA.poner(w, VIDA.PATRONES.canon, 4, 4));
    ejVida("rpentomino", "R-pentominó", "Cinco células que tardan 1103 generaciones en estabilizarse y sueltan planeadores.",
      180, 130, true, 4, w => VIDA.poner(w, VIDA.PATRONES.rpentomino, 89, 64));
    ejVida("sopa", "sopa aleatoria", "Ruido al 35 % que se ordena en bloques, colmenas, parpadeadores y planeadores.",
      100, 70, true, 6, w => VIDA.sopa(w, 0, 0, 100, 70, 11));
  }

  // ---------- Máquina de Turing universal (turing.js) ----------
  // Un único juego de reglas para todos los programas: lo que cambia entre ejemplos son los •.
  const tablaTexto = tabla => Object.entries(tabla).map(([q, t]) => `${q}: ${t[0] || "-"} ${t[1] || "-"}`).join("\n");
  function ejemploTuring(m) {
    const { simbolos, inicioCinta } = TURING.tira(m);
    const n = TURING.reglasUniversales().length;
    return {
      id: "turing-" + m.id, name: "Turing universal · " + m.nombre,
      desc: `${m.desc} Programa: ${tablaTexto(m.tabla).replace(/\n/g, "; ")} (escribe, mueve y estado siguiente al leer 0 y al leer 1). ` +
        `Las mismas ${n} reglas para todos los programas: el programa y su cinta están en los •. Cada columna es una casilla ` +
        `de la máquina universal: marca •, símbolo (5 bits), estado del cabezal universal (5 bits) y marca •. A la izquierda, ` +
        `el programa (${inicioCinta} columnas: un bloque por estado; el número del estado siguiente va en unario); a la derecha, la ` +
        "cinta simulada. Sin anclaje: en cada paso hay exactamente una coincidencia, y al llegar a HALT no queda ninguna.",
      world: { w: simbolos.length + 2, h: TURING.ALTO + 2, wrap: false, lattice: { type: "none", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 } },
      mode: "seq", cell: 12, speed: 10,
      rules: () => TURING.reglasUniversales(),
      init(world) { TURING.pintar(world, simbolos, 1, 1); },
      programa: m,
    };
  }
  /** «A: 1RB 1LB» por línea (transición al leer 0 y al leer 1; H = parar, - = no definida). */
  function leerPrograma(texto) {
    const tabla = {};
    for (const linea of texto.split(/[\n;]+/).map(l => l.trim()).filter(Boolean)) {
      const m = linea.match(/^(\w+)\s*:\s*(\S+)\s+(\S+)$/);
      if (!m) throw new Error(`no entiendo «${linea}»`);
      tabla[m[1]] = {};
      [m[2], m[3]].forEach((t, s) => {
        if (t === "-") return;
        if (!/^[01][LR]\w+$/.test(t)) throw new Error(`transición «${t}»: usa escribe (0/1), mueve (L/R) y estado`);
        tabla[m[1]][s] = t[0] + t[1] + t.slice(2);
      });
    }
    for (const q of Object.keys(tabla)) for (const t of Object.values(tabla[q]))
      if (t.slice(2) !== "H" && !tabla[t.slice(2)]) throw new Error(`el estado ${t.slice(2)} no está definido`);
    if (!Object.keys(tabla).length) throw new Error("el programa está vacío");
    return tabla;
  }
  if (TURING) for (const m of TURING.PROGRAMAS) EXAMPLES.push(ejemploTuring(m));

  // ---------- Codificaciones autolocalizables (generadas por busqueda/) ----------
  // Estados: s = 5·c + 0 (sin hormiga) o 5·c + 1 + d, con c 0 blanco / 1 negro y d 0 ↑, 1 ←, 2 ↓, 3 →.
  const DIRS = ["U", "L", "D", "R"];
  function vecBloque(g, d) {
    return { U: [-g.D[0], -g.D[1]], D: g.D, L: [-g.R[0], -g.R[1]], R: g.R }[DIRS[d]];
  }
  function reglasBloques(g) {
    const rules = [], p = g.pats, n = g.cells.length;
    for (let d = 0; d < 4; d++)
      for (const c of [0, 1]) {
        const nd = c === 0 ? (d + 1) % 4 : (d + 3) % 4;
        const v = vecBloque(g, nd);
        for (const c2 of [0, 1]) {
          const A = p[5 * c + 1 + d], B = p[5 * c2], A2 = p[5 * (1 - c)], B2 = p[5 * c2 + 1 + nd];
          const cells = [];
          const pon = (ox, oy, antes, despues) => {
            for (let k = 0; k < n; k++) {
              const a = (antes >> k) & 1, b = (despues >> k) & 1;
              cells.push([ox + g.cells[k][0], oy + g.cells[k][1], a ? DOT : EMPTY, a === b ? ANY : (b ? DOT : EMPTY)]);
            }
          };
          pon(0, 0, A, A2);
          pon(v[0], v[1], B, B2);
          rules.push(ruleFromCells(`${FLECHA[DIRS[d]]} sobre ${c ? "negro" : "blanco"}, destino ${c2 ? "negro" : "blanco"} → ${FLECHA[DIRS[nd]]}`,
            cells, { anchor: g.cells[0] }));
        }
      }
    return rules;
  }
  /** Pinta el estado s del bloque (a, b); las celdas fuera del mundo se ignoran. */
  function pintaBloque(world, g, a, b, s) {
    const X = g.origen[0] + a * g.R[0] + b * g.D[0], Y = g.origen[1] + a * g.R[1] + b * g.D[1];
    g.cells.forEach(([x, y], k) => {
      const i = P.cellIndex(world, X + x, Y + y);
      if (i >= 0) world.cells[i] = (g.pats[s] >> k) & 1;
    });
  }
  function initBloques(world, g) {
    for (let a = 0; a < g.na; a++) for (let b = 0; b < g.nb; b++) pintaBloque(world, g, a, b, 0);
    pintaBloque(world, g, g.a0, g.b0, 1); // hormiga ↑ sobre blanco
  }
  for (const g of GANADORES) {
    const m = g.metricas;
    EXAMPLES.push({
      id: g.id, name: g.nombre,
      desc: g.desc + ` [${g.forma}, ${m.n} celdas, densidad ${m.densidad}, ${m.celdas_cambian} celdas cambian en total en las 16 reglas]`,
      world: { w: g.world.w, h: g.world.h, wrap: false, lattice: g.lattice },
      mode: "seq", cell: 3, speed: 200,
      rules: () => reglasBloques(g),
      init(world) { initBloques(world, g); },
      bloques: g,
    });
  }

  // ---------- Sistemas de una regla clasificados por entropía (generados por busqueda/entropia/) ----------
  if (SISTEMAS) {
    for (const sis of SISTEMAS.sistemas) {
      EXAMPLES.push({
        id: sis.id, name: sis.nombre, desc: sis.desc,
        world: { w: SISTEMAS.n, h: SISTEMAS.n, wrap: true, lattice: { type: "none", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 } },
        mode: "par-skip", cell: 7, speed: 4,
        rules() {
          const r = P.newRule(3, 3, sis.nombre);
          r.lhs = sis.lhs.slice(); r.rhs = sis.rhs.slice(); r.sym = sis.sym; r.anchor = [1, 1];
          return [r];
        },
        init(world) {
          const bits = SISTEMAS.iniciales[sis.init];
          for (let i = 0; i < bits.length; i++) world.cells[i] = bits.charCodeAt(i) - 48;
        },
      });
    }
  }

  // ---------- Sistemas de varias reglas por orden (productiva / consumidora / movedora) ----------
  if (SISTEMAS_MULTI) {
    for (const sis of SISTEMAS_MULTI.sistemas) {
      EXAMPLES.push({
        id: sis.id, name: sis.nombre, desc: sis.desc,
        world: { w: SISTEMAS_MULTI.n, h: SISTEMAS_MULTI.n, wrap: true, lattice: { type: "none", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 } },
        mode: "par-skip", cell: 7, speed: 4,
        rules() {
          return sis.reglas.map((x, j) => {
            const r = P.newRule(3, 3, `Regla ${j + 1}`);
            r.lhs = x.lhs.slice(); r.rhs = x.rhs.slice(); r.sym = x.sym; r.anchor = [1, 1];
            return r;
          });
        },
        init(world) {
          const bits = SISTEMAS_MULTI.iniciales[sis.init];
          for (let i = 0; i < bits.length; i++) world.cells[i] = bits.charCodeAt(i) - 48;
        },
      });
    }
  }

  const api = { EXAMPLES, ejemploTuring, leerPrograma, tablaTexto, ruleFromCells, reglasHormigaMinima, reglasSeparables, SIN_RED_A, reglasBloques, pintaBloque, GANADORES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PuntoEjemplos = api;
})(typeof window !== "undefined" ? window : globalThis);
