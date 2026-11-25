/*
 * La máquina de Turing universal compilada a • con el esquema mínimo.
 *
 * Columna = h celdas: kS filas de símbolo + kQ filas de estado (todo vacío = sin cabezal).
 *   - El símbolo T0 (casilla en blanco de la cinta simulada) tiene código 0: la cinta en blanco es el mundo vacío.
 *   - Al pasar a HALT el cabezal desaparece (HALT no necesita código).
 * Una regla por (estado, «cubo» de símbolos con la misma acción). El Si de cada regla es el conjunto mínimo de
 * celdas que, entre todas las columnas legales (cualquier símbolo, sin cabezal o con cabezal en cualquier estado),
 * solo acepta las suyas: un problema de conjunto de impacto mínimo, resuelto exactamente.
 * Las parejas (estado, símbolo) sin transición no aparecen nunca en una ejecución: se tratan como comodín.
 *
 * La asignación de códigos (qué patrón de bits recibe cada símbolo y cada estado) se busca con recocido simulado.
 * Métrica: celdas especificadas = celdas del Si + celdas del Entonces que escriben.
 */
const U = require("../../turing.js");
const pc = x => { let n = 0; while (x) { n += x & 1; x >>= 1; } return n; };

function preparar(delta = U.DELTA, simbolos = U.SIMBOLOS, { blanco = "T0", parada = "HALT", anclada = true, filasExtra = 0, arriba = 0 } = {}) {
  const estados = Object.keys(delta).filter(q => q !== parada);
  const kS = Math.ceil(Math.log2(simbolos.length)), kQ = Math.ceil(Math.log2(estados.length + 1)) + filasExtra;
  // acciones por estado: símbolo → índice de acción; símbolos sin transición: comodín
  const acciones = {};
  for (const q of estados) {
    acciones[q] = delta[q].map(([sims, escribe, mueve, q2]) => ({ sims, escribe, mueve, q2 }));
  }
  // filas físicas: `arriba` bits de estado encima del símbolo y el resto debajo
  const filaQ = [], filaS = [];
  for (let b = 0; b < arriba; b++) filaQ.push(b);
  for (let b = 0; b < kS; b++) filaS.push(arriba + b);
  for (let b = arriba; b < kQ; b++) filaQ.push(kS + b);
  return { delta, simbolos, estados, kS, kQ, h: kS + kQ, blanco, parada, acciones, anclada, filaS, filaQ };
}

// Cubos de kS bits: [fijos (máscara), valores]
function todosLosCubos(kS) {
  const out = [];
  for (let m = 0; m < 1 << kS; m++) for (let v = 0; v < 1 << kS; v++) if ((v & ~m) === 0) out.push([m, v]);
  return out;
}
const dentro = (codigo, [m, v]) => (codigo & m) === v;

/** Coste total y reglas para una asignación de códigos. */
function evaluar(M, codS, codQ, CUBOS, conReglas = false) {
  const { simbolos, estados, kS, kQ, acciones, parada } = M;
  const usados = new Set(simbolos.map(s => codS[s]));
  const sCod = simbolos.map(s => codS[s]);
  let total = 0, imposibles = 0; const reglas = [];
  for (const q of estados) {
    const acc = acciones[q];
    const accionDe = new Map();
    acc.forEach((a, i) => a.sims.forEach(s => accionDe.set(codS[s], i)));
    acc.forEach((a, ai) => {
      // cubrir los símbolos de la acción con cubos que no contengan símbolos de otra acción
      const mios = new Set(a.sims.map(s => codS[s]));
      const validos = CUBOS.filter(c => sCod.every(x => !dentro(x, c) || !accionDe.has(x) || accionDe.get(x) === ai) && [...mios].some(x => dentro(x, c)));
      const falta = new Set(mios), elegidos = [];
      while (falta.size) {
        let mejor = null, n = -1;
        for (const c of validos) {
          // cubos disjuntos: un símbolo ya cubierto no puede caer en otro cubo (si no, encajarían 2 reglas)
          if ([...mios].some(x => !falta.has(x) && dentro(x, c))) continue;
          let k = 0; for (const x of falta) if (dentro(x, c)) k++;
          // a igual cobertura, el cubo con menos bits fijos (Si más pequeño)
          if (k > n || (k === n && k > 0 && pc(c[0]) < pc(mejor[0]))) { n = k; mejor = c; }
        }
        elegidos.push(mejor); for (const x of [...falta]) if (dentro(x, mejor)) falta.delete(x);
      }
      for (const cubo of elegidos) {
        // Si mínimo: filas candidatas = filas fijas del cubo (símbolo) + filas de estado
        const filas = [];
        for (let b = 0; b < kS; b++) if ((cubo[0] >> b) & 1) filas.push({ r: M.filaS[b], v: (cubo[1] >> b) & 1 });
        for (let b = 0; b < kQ; b++) filas.push({ r: M.filaQ[b], v: (codQ[q] >> b) & 1 });
        // columnas malas (a desplazamiento 0): sin cabezal; cabezal en otro estado; cabezal en q con símbolo de otra acción
        const malas = new Set();
        const columna = (s, e) => { let c = 0; for (let b = 0; b < kS; b++) if ((s >> b) & 1) c |= 1 << M.filaS[b]; for (let b = 0; b < kQ; b++) if ((e >> b) & 1) c |= 1 << M.filaQ[b]; return c; };
        for (const s of sCod) {
          malas.add(columna(s, 0));
          for (const q2 of estados) if (q2 !== q) malas.add(columna(s, codQ[q2]));
          if (accionDe.has(s) && !dentro(s, cubo)) malas.add(columna(s, codQ[q]));   // lo cubre otra regla
        }
        if (!M.anclada) {
          // sin anclaje: cualquier columna legal desplazada en vertical (fuera de la tira, vacío) también es mala
          const h = kS + kQ, legales = [];
          for (const s of sCod) { legales.push(columna(s, 0)); for (const q2 of estados) legales.push(columna(s, codQ[q2])); }
          for (let k = -(h - 1); k <= h - 1; k++) if (k) for (const X of legales) {
            let d = 0; for (let t = 0; t < h; t++) { const u = t + k; if (u >= 0 && u < h && (X >> u) & 1) d |= 1 << t; }
            malas.add(d);
          }
        }
        const objetivo = filas.reduce((x, f) => x | (f.v << f.r), 0);
        const mascarasMalas = new Set();
        for (const c of malas) {
          let m = 0; filas.forEach((f, i) => { if (((c >> f.r) & 1) !== f.v) m |= 1 << i; });
          if (m === 0) { mascarasMalas.add(-1); break; }
          mascarasMalas.add(m);
        }
        if (mascarasMalas.has(-1)) { imposibles++; total += 1000; continue; }   // ningún Si sirve: penalización
        const mm = [...mascarasMalas];
        let si = null;
        for (let tam = 1; tam <= filas.length && si === null; tam++) {
          const rec = (desde, quedan, sub) => {
            if (si !== null) return;
            if (!quedan) { if (mm.every(x => x & sub)) si = sub; return; }
            for (let i = desde; i < filas.length; i++) rec(i + 1, quedan - 1, sub | (1 << i));
          };
          rec(0, tam, 0);
        }
        // Entonces
        let entonces = 0;
        const escribeS = a.escribe != null ? codS[a.escribe] : null;
        if (escribeS != null) for (let b = 0; b < kS; b++) {
          const fijo = (cubo[0] >> b) & 1, val = (cubo[1] >> b) & 1, t = (escribeS >> b) & 1;
          if (!(fijo && val === t)) entonces++;
        }
        entonces += pc(codQ[q]) + (a.q2 === parada ? 0 : pc(codQ[a.q2]));
        const costeSi = pc(si);
        total += costeSi + entonces;
        if (conReglas) reglas.push({ q, cubo, a, si: filas.filter((_, i) => (si >> i) & 1), costeSi, entonces });
      }
    });
  }
  return { total, reglas, n: reglas.length, imposibles };
}

/** Recocido simulado sobre las asignaciones de códigos. */
function optimizar(M, { iteraciones = 4000, semilla = 1, T0 = 3, log = false } = {}) {
  let s = semilla; const azar = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const CUBOS = todosLosCubos(M.kS);
  const nS = 1 << M.kS, nQ = 1 << M.kQ;
  // inicial: blanco = 0, resto en orden; estados 1..n
  let codS = {}, codQ = {};
  const libresS = [...Array(nS).keys()].filter(x => x !== 0);
  M.simbolos.forEach(sim => { codS[sim] = sim === M.blanco ? 0 : libresS.shift(); });
  M.estados.forEach((q, i) => { codQ[q] = i + 1; });
  let actual = evaluar(M, codS, codQ, CUBOS).total, mejor = { total: actual, codS: { ...codS }, codQ: { ...codQ } };
  for (let it = 0; it < iteraciones; it++) {
    const T = T0 * (1 - it / iteraciones) + 0.05;
    const nS2 = { ...codS }, nQ2 = { ...codQ };
    if (azar() < 0.5) {
      const sims = M.simbolos.filter(x => x !== M.blanco);
      const a = sims[Math.floor(azar() * sims.length)];
      const ocup = new Map(Object.entries(nS2).map(([k, v]) => [v, k]));
      const destino = 1 + Math.floor(azar() * (nS - 1));
      const b = ocup.get(destino);
      if (b === M.blanco) continue;
      if (b) nS2[b] = nS2[a]; nS2[a] = destino;
    } else {
      const a = M.estados[Math.floor(azar() * M.estados.length)];
      const ocup = new Map(Object.entries(nQ2).map(([k, v]) => [v, k]));
      const destino = 1 + Math.floor(azar() * (nQ - 1));
      const b = ocup.get(destino);
      if (b) nQ2[b] = nQ2[a]; nQ2[a] = destino;
    }
    const c = evaluar(M, nS2, nQ2, CUBOS).total;
    if (c <= actual || azar() < Math.exp((actual - c) / T)) {
      codS = nS2; codQ = nQ2; actual = c;
      if (c < mejor.total) { mejor = { total: c, codS: { ...codS }, codQ: { ...codQ } }; if (log) console.log(`  it ${it}: ${c}`); }
    }
  }
  const final = evaluar(M, mejor.codS, mejor.codQ, CUBOS, true);
  return { ...mejor, reglas: final.reglas, M };
}

module.exports = { preparar, evaluar, optimizar, todosLosCubos };
if (require.main === module) {
  const M = preparar();
  console.log(`universal: ${M.estados.length} estados (sin HALT), ${M.simbolos.length} símbolos → h = ${M.kS} + ${M.kQ} = ${M.h}`);
  const CUBOS = todosLosCubos(M.kS);
  const ini = {}; let i = 1; M.simbolos.forEach(s => ini[s] = s === "T0" ? 0 : i++);
  const iq = {}; M.estados.forEach((q, j) => iq[q] = j + 1);
  const e0 = evaluar(M, ini, iq, CUBOS, true);
  console.log(`códigos en orden: ${e0.total} celdas, ${e0.n} reglas`);
  const t0 = Date.now();
  const r = optimizar(M, { iteraciones: +process.argv[2] || 3000, semilla: +process.argv[3] || 1, log: true });
  console.log(`optimizado: ${r.total} celdas, ${r.reglas.length} reglas (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  require("fs").writeFileSync(__dirname + "/universal_min.json", JSON.stringify({ total: r.total, codS: r.codS, codQ: r.codQ }));
}
