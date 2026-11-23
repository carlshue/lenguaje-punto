/*
 * Motor del lenguaje •
 * --------------------
 * El mundo es una grilla de celdas con • (1) o vacío (0).
 * Una regla es "disposición de celdas ~> disposición de celdas":
 *   LHS (condición), por celda: 0 = cualquiera, 1 = •, 2 = vacío
 *   RHS (resultado), por celda: 0 = no tocar,   1 = •, 2 = vacío
 * Las reglas no saben dónde están: se buscan en cualquier posición de la grilla.
 * Opcionalmente una regla puede estar "anclada": su celda ancla solo puede caer
 * sobre los puntos de la red (rectangular o diagonal) definida en el mundo.
 */
(function (global) {
  "use strict";

  const ANY = 0, DOT = 1, EMPTY = 2;

  // ---------- Simetrías ----------
  const T = {
    id: (x, y) => [x, y],
    r90: (x, y) => [-y, x],
    r180: (x, y) => [-x, -y],
    r270: (x, y) => [y, -x],
    mx: (x, y) => [-x, y],
    my: (x, y) => [x, -y],
    d1: (x, y) => [y, x],
    d2: (x, y) => [-y, -x],
  };
  const SYM = {
    none: ["id"],
    rot: ["id", "r90", "r180", "r270"],
    mirror: ["id", "mx"],
    mirrorv: ["id", "my"],
    all: ["id", "r90", "r180", "r270", "mx", "my", "d1", "d2"],
  };

  function newRule(w = 3, h = 3, name = "Regla") {
    return {
      name, enabled: true, sym: "none", anchored: false,
      w, h, anchor: [0, 0],
      lhs: new Array(w * h).fill(ANY),
      rhs: new Array(w * h).fill(ANY),
    };
  }

  function resizeRule(rule, w, h) {
    const lhs = new Array(w * h).fill(ANY), rhs = new Array(w * h).fill(ANY);
    for (let y = 0; y < Math.min(h, rule.h); y++)
      for (let x = 0; x < Math.min(w, rule.w); x++) {
        lhs[y * w + x] = rule.lhs[y * rule.w + x];
        rhs[y * w + x] = rule.rhs[y * rule.w + x];
      }
    rule.w = w; rule.h = h; rule.lhs = lhs; rule.rhs = rhs;
    rule.anchor = [Math.min(rule.anchor[0], w - 1), Math.min(rule.anchor[1], h - 1)];
  }

  /** Compila una regla en sus variantes (una por simetría, sin duplicados). */
  function compileRule(rule, ruleIndex) {
    const out = [], seen = new Set();
    const [ax, ay] = rule.anchor;
    for (const tn of SYM[rule.sym] || SYM.none) {
      const t = T[tn];
      const cells = [];
      for (let y = 0; y < rule.h; y++)
        for (let x = 0; x < rule.w; x++) {
          const l = rule.lhs[y * rule.w + x], r = rule.rhs[y * rule.w + x];
          if (l === ANY && r === ANY) continue;
          const [dx, dy] = t(x - ax, y - ay); // coordenadas relativas al ancla
          cells.push({ dx, dy, l, r });
        }
      if (!cells.length) continue;
      const key = cells.map(c => `${c.dx},${c.dy},${c.l},${c.r}`).sort().join(";");
      if (seen.has(key)) continue;
      seen.add(key);
      const req = cells.filter(c => c.l === DOT);
      const emp = cells.filter(c => c.l === EMPTY);
      const writes = cells.filter(c => c.r !== ANY);
      if (!writes.length) continue;
      let minx = 0, miny = 0, maxx = 0, maxy = 0;
      for (const c of cells) {
        minx = Math.min(minx, c.dx); maxx = Math.max(maxx, c.dx);
        miny = Math.min(miny, c.dy); maxy = Math.max(maxy, c.dy);
      }
      out.push({
        ruleIndex, sym: tn, anchored: !!rule.anchored,
        checks: req.concat(emp), // primero los • (más selectivos)
        lead: req[0] || null,     // celda • usada para buscar candidatos
        writes, bbox: [minx, miny, maxx, maxy],
      });
    }
    return out;
  }

  function compileRules(rules) {
    const v = [];
    rules.forEach((r, i) => { if (r.enabled) v.push(...compileRule(r, i)); });
    return v;
  }

  // ---------- Mundo ----------
  function newWorld(w, h) {
    return {
      w, h, wrap: false, cells: new Uint8Array(w * h),
      lattice: { type: "none", px: 3, py: 2, ox: 0, oy: 0, m: 2, n: 5, k: 0 },
    };
  }

  function onLattice(world, x, y) {
    const L = world.lattice;
    const mod = (a, n) => ((a % n) + n) % n;
    if (L.type === "rect") return mod(x - L.ox, L.px) === 0 && mod(y - L.oy, L.py) === 0;
    if (L.type === "diag") return mod(x + L.m * y - L.k, L.n) === 0;
    return true;
  }

  function cellIndex(world, x, y) {
    if (world.wrap) {
      x = ((x % world.w) + world.w) % world.w;
      y = ((y % world.h) + world.h) % world.h;
      return y * world.w + x;
    }
    if (x < 0 || y < 0 || x >= world.w || y >= world.h) return -1;
    return y * world.w + x;
  }

  function matchAt(world, v, ox, oy) {
    if (v.anchored && !onLattice(world, ox, oy)) return false;
    const c = world.cells;
    for (const k of v.checks) {
      const i = cellIndex(world, ox + k.dx, oy + k.dy);
      if (i < 0) return false;
      if (k.l === DOT ? c[i] !== 1 : c[i] !== 0) return false;
    }
    for (const k of v.writes) if (cellIndex(world, ox + k.dx, oy + k.dy) < 0) return false;
    return true;
  }

  /** Todas las coincidencias sobre el estado actual, en orden: regla, simetría, posición. */
  function findMatches(world, variants, limit = Infinity) {
    const res = [];
    const dots = [];
    const c = world.cells;
    for (let i = 0; i < c.length; i++) if (c[i]) dots.push(i);
    for (const v of variants) {
      if (v.lead) {
        for (const i of dots) {
          const x = i % world.w, y = (i / world.w) | 0;
          const ox = x - v.lead.dx, oy = y - v.lead.dy;
          if (matchAt(world, v, ox, oy)) { res.push({ v, ox, oy }); if (res.length >= limit) return res; }
        }
      } else {
        for (let y = 0; y < world.h; y++)
          for (let x = 0; x < world.w; x++)
            if (matchAt(world, v, x, y)) { res.push({ v, ox: x, oy: y }); if (res.length >= limit) return res; }
      }
    }
    // En mundos toroidales una misma coincidencia puede aparecer con coordenadas equivalentes: deduplicar
    if (world.wrap) {
      const seen = new Set();
      return res.filter(m => {
        const k = m.v.ruleIndex + m.v.sym + ":" + cellIndex(world, m.ox, m.oy);
        if (seen.has(k)) return false; seen.add(k); return true;
      });
    }
    return res;
  }

  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));[a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Un paso.
   * modos:
   *  "par-prio"  paralelo: todas las coincidencias a la vez; si dos escriben la misma celda gana la primera
   *  "par-skip"  paralelo: las coincidencias que escriben celdas en disputa se descartan todas
   *  "par-rand"  paralelo con prioridad aleatoria
   *  "seq"       secuencial: solo la primera coincidencia (por orden de reglas)
   *  "seq-rand"  secuencial: una coincidencia al azar
   */
  function step(world, variants, mode = "par-prio", rnd = Math.random) {
    const sequential = mode === "seq";
    let matches = findMatches(world, variants, sequential ? 1 : Infinity);
    const stats = { matches: matches.length, applied: 0, conflicts: 0, written: [] };
    if (!matches.length) return stats;

    let accepted = [];
    if (mode === "seq") accepted = [matches[0]];
    else if (mode === "seq-rand") accepted = [matches[Math.floor(rnd() * matches.length)]];
    else {
      if (mode === "par-rand") shuffle(matches, rnd);
      if (mode === "par-skip") {
        const count = new Map();
        for (const m of matches) for (const k of m.v.writes) {
          const i = cellIndex(world, m.ox + k.dx, m.oy + k.dy);
          count.set(i, (count.get(i) || 0) + 1);
        }
        for (const m of matches) {
          const ok = m.v.writes.every(k => count.get(cellIndex(world, m.ox + k.dx, m.oy + k.dy)) === 1);
          if (ok) accepted.push(m); else stats.conflicts++;
        }
      } else {
        const claimed = new Set();
        for (const m of matches) {
          const idx = m.v.writes.map(k => cellIndex(world, m.ox + k.dx, m.oy + k.dy));
          if (idx.some(i => claimed.has(i))) { stats.conflicts++; continue; }
          idx.forEach(i => claimed.add(i));
          accepted.push(m);
        }
      }
    }
    // Se lee del estado anterior y se escribe después (actualización síncrona)
    const c = world.cells;
    for (const m of accepted)
      for (const k of m.v.writes) {
        const i = cellIndex(world, m.ox + k.dx, m.oy + k.dy);
        c[i] = k.r === DOT ? 1 : 0;
        stats.written.push(i);
      }
    stats.applied = accepted.length;
    return stats;
  }

  function countDots(world) {
    let n = 0;
    for (const v of world.cells) n += v;
    return n;
  }

  function fillTile(world, tile, ox = 0, oy = 0) {
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) {
        const tx = ((x - ox) % tile.w + tile.w) % tile.w, ty = ((y - oy) % tile.h + tile.h) % tile.h;
        if (tile.cells[ty * tile.w + tx]) world.cells[y * world.w + x] = 1;
      }
  }

  const api = {
    ANY, DOT, EMPTY, SYM, newRule, resizeRule, compileRule, compileRules,
    newWorld, onLattice, cellIndex, findMatches, step, countDots, fillTile,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.Punto = api;
})(typeof window !== "undefined" ? window : globalThis);
