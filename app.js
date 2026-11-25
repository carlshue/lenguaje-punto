/* Interfaz del editor de reglas • */
(function () {
  "use strict";
  const P = window.Punto, { EXAMPLES } = window.PuntoEjemplos;
  const $ = id => document.getElementById(id);
  const STORE = "punto-estado-v1";

  // ---------- Estado ----------
  const S = {
    world: P.newWorld(80, 60),
    initial: null,          // copia de las celdas del estado inicial
    initialDots: 0,
    rules: [],
    variants: [],
    dirty: true,            // hay que recompilar reglas
    mode: "par-prio",
    cell: 10,
    speed: 1,
    running: false,
    stepCount: 0,
    last: null,             // estadísticas del último paso
    tile: { w: 3, h: 2, cells: [0, 0, 1, 0, 0, 0], ox: 0, oy: 0 },
    showLattice: true,
    showMatches: false,
    exampleId: null,
    desc: "",
  };

  const canvas = $("canvas"), ctx = canvas.getContext("2d");

  // ---------- Utilidades ----------
  function compile() {
    if (S.dirty) { S.variants = P.compileRules(S.rules); S.dirty = false; }
    return S.variants;
  }
  function markRules() { S.dirty = true; save(); updateStats(); if (S.showMatches) draw(); }
  function snapshotInitial() {
    S.initial = S.world.cells.slice();
    S.initialDots = P.countDots(S.world);
    S.stepCount = 0; S.last = null;
  }

  // ---------- Ejemplos ----------
  function loadExample(id) {
    const ex = EXAMPLES.find(e => e.id === id) || EXAMPLES[0];
    stop();
    const w = P.newWorld(ex.world.w, ex.world.h);
    w.wrap = ex.world.wrap;
    Object.assign(w.lattice, ex.world.lattice);
    ex.init.call(ex, w);
    S.world = w;
    S.rules = ex.rules();
    S.mode = ex.mode; S.cell = ex.cell; S.speed = ex.speed; S.sps = (ex.speed || 1) * 60;
    if (ex.tile) S.tile = Object.assign({ ox: 0, oy: 0 }, JSON.parse(JSON.stringify(ex.tile)));
    S.exampleId = ex.id; S.desc = ex.desc;
    S.dirty = true;
    snapshotInitial();
    syncAll();
    save();
  }

  // ---------- Simulación ----------
  function doStep() {
    const v = compile();
    const st = P.step(S.world, v, S.mode);
    if (st.applied) S.stepCount++;
    S.last = st;
    return st;
  }
  // Velocidad en pasos por segundo (escala logarítmica de 0,5 a 20.000), con acumulador de tiempo
  const spsDe = v => 0.5 * Math.pow(40000, v / 100);
  const valorDe = sps => Math.round(100 * Math.log(Math.max(0.5, sps) / 0.5) / Math.log(40000));
  const textoSps = sps => (sps < 10 ? sps.toFixed(1).replace(".0", "") : Math.round(sps)) + "/s";
  let ultimoT = 0, deuda = 0;
  function loop(t) {
    if (!S.running) return;
    if (!ultimoT) ultimoT = t;
    deuda = Math.min(deuda + (t - ultimoT) / 1000 * S.sps, Math.max(1, S.sps / 10));
    ultimoT = t;
    let st, hechos = 0;
    while (deuda >= 1 && hechos < 5000) {
      st = doStep(); deuda -= 1; hechos++;
      if (!st.applied) { stop(); S.last = st; break; }
    }
    if (hechos) { draw(); updateStats(); }
    if (S.running) requestAnimationFrame(loop);
  }
  function start() { if (S.running) return; S.running = true; ultimoT = 0; deuda = 1; $("playBtn").textContent = "⏸ Pausa"; requestAnimationFrame(loop); }
  function stop() { S.running = false; $("playBtn").textContent = "▶ Ejecutar"; save(); }

  // ---------- Dibujo ----------
  function resizeCanvas() {
    canvas.width = S.world.w * S.cell;
    canvas.height = S.world.h * S.cell;
  }
  function draw() {
    const w = S.world, c = S.cell;
    if (canvas.width !== w.w * c || canvas.height !== w.h * c) resizeCanvas();
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // líneas finas de celda
    if (c >= 7) {
      ctx.strokeStyle = "#efede7"; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x <= w.w; x++) { ctx.moveTo(x * c + .5, 0); ctx.lineTo(x * c + .5, w.h * c); }
      for (let y = 0; y <= w.h; y++) { ctx.moveTo(0, y * c + .5); ctx.lineTo(w.w * c, y * c + .5); }
      ctx.stroke();
    }
    // red
    const L = w.lattice;
    if (S.showLattice && L.type === "rect" && c >= 3) {
      ctx.strokeStyle = "rgba(47,91,211,.28)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = ((L.ox % L.px) + L.px) % L.px; x <= w.w; x += L.px) { ctx.moveTo(x * c + .5, 0); ctx.lineTo(x * c + .5, w.h * c); }
      for (let y = ((L.oy % L.py) + L.py) % L.py; y <= w.h; y += L.py) { ctx.moveTo(0, y * c + .5); ctx.lineTo(w.w * c, y * c + .5); }
      ctx.stroke();
    } else if (S.showLattice && L.type === "diag") {
      ctx.fillStyle = "rgba(47,91,211,.13)";
      for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++)
        if (P.onLattice(w, x, y)) ctx.fillRect(x * c, y * c, c, c);
    }
    // coincidencias
    if (S.showMatches) {
      const m = P.findMatches(w, compile(), 2000);
      ctx.lineWidth = Math.max(1, c / 8);
      for (const mm of m) {
        const [x0, y0, x1, y1] = mm.v.bbox;
        ctx.fillStyle = "rgba(255,170,0,.15)"; ctx.strokeStyle = "rgba(230,120,0,.8)";
        ctx.fillRect((mm.ox + x0) * c, (mm.oy + y0) * c, (x1 - x0 + 1) * c, (y1 - y0 + 1) * c);
        ctx.strokeRect((mm.ox + x0) * c + .5, (mm.oy + y0) * c + .5, (x1 - x0 + 1) * c - 1, (y1 - y0 + 1) * c - 1);
      }
    }
    // píxeles encendidos
    ctx.fillStyle = "#1d1d1f";
    for (let i = 0; i < w.cells.length; i++) {
      if (!w.cells[i]) continue;
      ctx.fillRect((i % w.w) * c, ((i / w.w) | 0) * c, c, c);
    }
    // últimas escrituras: rosa encima (oscuro si se encendió, claro si se apagó)
    if (S.last && S.last.written && S.last.written.length < 5000) {
      for (const i of S.last.written) {
        ctx.fillStyle = w.cells[i] ? "rgba(214,51,108,.75)" : "rgba(214,51,108,.3)";
        ctx.fillRect((i % w.w) * c, ((i / w.w) | 0) * c, c, c);
      }
    }
  }

  function updateStats() {
    const n = P.countDots(S.world);
    const cons = n === S.initialDots;
    const v = compile();
    const l = S.last;
    $("stats").innerHTML =
      `<span>Paso <b>${S.stepCount}</b></span>` +
      `<span>• <b>${n}</b> <span class="${cons ? "ok" : "warn"}">${cons ? "(se conservan)" : `(inicial ${S.initialDots}, Δ ${n - S.initialDots > 0 ? "+" : ""}${n - S.initialDots})`}</span></span>` +
      `<span>Reglas activas <b>${S.rules.filter(r => r.enabled).length}</b> → variantes <b>${v.length}</b></span>` +
      (l ? `<span>Último paso: coincidencias <b>${l.matches}</b>, aplicadas <b>${l.applied}</b>${l.conflicts ? `, conflictos <b class="warn">${l.conflicts}</b>` : ""}${!l.applied ? ` — <b class="warn">sin coincidencias</b>` : ""}</span>` : "");
  }

  // ---------- Pintar en la grilla ----------
  let painting = false, paintVal = 1;
  function cellAt(ev) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((ev.clientX - r.left) / S.cell), y = Math.floor((ev.clientY - r.top) / S.cell);
    if (x < 0 || y < 0 || x >= S.world.w || y >= S.world.h) return -1;
    return y * S.world.w + x;
  }
  canvas.addEventListener("pointerdown", ev => {
    const i = cellAt(ev); if (i < 0) return;
    const b = $("brush").value;
    paintVal = b === "dot" ? 1 : b === "erase" ? 0 : 1 - S.world.cells[i];
    painting = true; canvas.setPointerCapture(ev.pointerId);
    S.world.cells[i] = paintVal; draw(); updateStats();
  });
  canvas.addEventListener("pointermove", ev => {
    if (!painting) return;
    const i = cellAt(ev); if (i < 0) return;
    if (S.world.cells[i] !== paintVal) { S.world.cells[i] = paintVal; draw(); updateStats(); }
  });
  canvas.addEventListener("pointerup", () => { if (painting) { painting = false; save(); } });

  // ---------- Mini‑grillas ----------
  const CLS = ["", "dot", "emp"];
  function miniGrid(w, h, get, onClick, onRight, anchor) {
    const g = document.createElement("div");
    g.className = "mini";
    g.style.gridTemplateColumns = `repeat(${w}, 22px)`;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = document.createElement("div");
      d.className = "c " + CLS[get(x, y)] + (anchor && anchor[0] === x && anchor[1] === y ? " anchor" : "");
      d.addEventListener("click", () => onClick(x, y));
      d.addEventListener("contextmenu", e => { e.preventDefault(); if (onRight) onRight(x, y); });
      g.appendChild(d);
    }
    return g;
  }

  // ---------- Editor de reglas ----------
  function renderRules() {
    const list = $("rulesList");
    list.innerHTML = "";
    const variantsPerRule = S.rules.map((r, i) => r.enabled ? P.compileRule(r, i).length : 0);
    S.rules.forEach((r, i) => {
      const card = document.createElement("div");
      card.className = "rule" + (r.enabled ? "" : " off");

      const head = document.createElement("div"); head.className = "head";
      const en = document.createElement("input"); en.type = "checkbox"; en.checked = r.enabled; en.title = "Activar / desactivar";
      en.onchange = () => { r.enabled = en.checked; markRules(); renderRules(); updateStats(); };
      const name = document.createElement("input"); name.type = "text"; name.value = r.name;
      name.oninput = () => { r.name = name.value; save(); };
      head.append(en, name);
      const mk = (t, title, fn) => { const b = document.createElement("button"); b.textContent = t; b.title = title; b.onclick = fn; head.appendChild(b); };
      mk("▲", "Subir (más prioridad)", () => { if (i > 0) { [S.rules[i - 1], S.rules[i]] = [S.rules[i], S.rules[i - 1]]; markRules(); renderRules(); } });
      mk("▼", "Bajar", () => { if (i < S.rules.length - 1) { [S.rules[i + 1], S.rules[i]] = [S.rules[i], S.rules[i + 1]]; markRules(); renderRules(); } });
      mk("⧉", "Duplicar", () => { S.rules.splice(i + 1, 0, JSON.parse(JSON.stringify(r))); markRules(); renderRules(); });
      mk("✕", "Eliminar", () => { S.rules.splice(i, 1); markRules(); renderRules(); updateStats(); });

      const meta = document.createElement("div"); meta.className = "meta";
      const num = (lab, val, fn) => {
        const l = document.createElement("label"); l.textContent = lab;
        const n = document.createElement("input"); n.type = "number"; n.min = 1; n.max = 15; n.value = val;
        n.onchange = () => { fn(Math.max(1, Math.min(15, +n.value || 1))); markRules(); renderRules(); };
        l.appendChild(n); meta.appendChild(l);
      };
      num("W", r.w, v => P.resizeRule(r, v, r.h));
      num("H", r.h, v => P.resizeRule(r, r.w, v));
      const symL = document.createElement("label"); symL.textContent = "Simetría";
      const sym = document.createElement("select");
      [["none", "ninguna"], ["rot", "4 rotaciones"], ["mirror", "espejo ↔"], ["mirrorv", "espejo ↕"], ["all", "rotaciones + espejos (8)"]]
        .forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sym.appendChild(o); });
      sym.value = r.sym; sym.onchange = () => { r.sym = sym.value; markRules(); renderRules(); updateStats(); };
      symL.appendChild(sym); meta.appendChild(symL);
      const anL = document.createElement("label");
      const an = document.createElement("input"); an.type = "checkbox"; an.checked = r.anchored;
      an.onchange = () => { r.anchored = an.checked; markRules(); };
      anL.append(an, " anclada ⚓"); anL.title = "La celda ancla solo puede caer sobre la red (pestaña Mundo)";
      meta.appendChild(anL);
      const vc = document.createElement("span"); vc.textContent = `${variantsPerRule[i]} variante${variantsPerRule[i] === 1 ? "" : "s"}`;
      meta.appendChild(vc);

      const grids = document.createElement("div"); grids.className = "grids";
      const setAnchor = (x, y) => { r.anchor = [x, y]; markRules(); renderRules(); };
      const wrapG = (lab, el) => { const d = document.createElement("div"); const l = document.createElement("div"); l.className = "lab"; l.textContent = lab; d.append(l, el); return d; };
      const lhs = miniGrid(r.w, r.h, (x, y) => r.lhs[y * r.w + x],
        (x, y) => { const k = y * r.w + x; r.lhs[k] = (r.lhs[k] + 1) % 3; markRules(); renderRules(); }, setAnchor, r.anchor);
      const rhs = miniGrid(r.w, r.h, (x, y) => r.rhs[y * r.w + x],
        (x, y) => { const k = y * r.w + x; r.rhs[k] = (r.rhs[k] + 1) % 3; markRules(); renderRules(); }, setAnchor, r.anchor);
      const arrow = document.createElement("div"); arrow.className = "arrow"; arrow.textContent = "~>";
      grids.append(wrapG("Si", lhs), arrow, wrapG("Entonces", rhs));

      card.append(head, meta, grids);
      list.appendChild(card);
    });
    if (S.showMatches) draw();
  }

  // ---------- Mosaico ----------
  function renderTile() {
    const t = S.tile, el = $("tileGrid");
    el.replaceWith(Object.assign(miniGrid(t.w, t.h, (x, y) => t.cells[y * t.w + x] ? 1 : 0,
      (x, y) => { t.cells[y * t.w + x] ^= 1; renderTile(); save(); }), { id: "tileGrid" }));
    $("tileW").value = t.w; $("tileH").value = t.h; $("tileOx").value = t.ox; $("tileOy").value = t.oy;
  }
  function resizeTile() {
    const w = Math.max(1, Math.min(16, +$("tileW").value || 1)), h = Math.max(1, Math.min(16, +$("tileH").value || 1));
    const old = S.tile, cells = new Array(w * h).fill(0);
    for (let y = 0; y < Math.min(h, old.h); y++) for (let x = 0; x < Math.min(w, old.w); x++) cells[y * w + x] = old.cells[y * old.w + x];
    S.tile = { w, h, cells, ox: +$("tileOx").value || 0, oy: +$("tileOy").value || 0 };
    renderTile(); save();
  }

  // ---------- Panel Mundo ----------
  function syncWorldPanel() {
    const w = S.world, L = w.lattice;
    $("worldW").value = w.w; $("worldH").value = w.h; $("wrap").checked = w.wrap;
    $("latType").value = L.type; $("latPx").value = L.px; $("latPy").value = L.py; $("latOx").value = L.ox; $("latOy").value = L.oy;
    $("latM").value = L.m; $("latN").value = L.n; $("latK").value = L.k;
    $("showLattice").checked = S.showLattice;
    document.querySelectorAll(".lat").forEach(e => e.classList.add("hidden"));
    const sel = document.querySelector(".lat-" + L.type); if (sel) sel.classList.remove("hidden");
  }
  function readLattice() {
    const L = S.world.lattice;
    L.type = $("latType").value;
    L.px = Math.max(1, +$("latPx").value || 1); L.py = Math.max(1, +$("latPy").value || 1);
    L.ox = +$("latOx").value || 0; L.oy = +$("latOy").value || 0;
    L.m = +$("latM").value || 0; L.n = Math.max(1, +$("latN").value || 1); L.k = +$("latK").value || 0;
    syncWorldPanel(); draw(); save();
  }

  function syncAll() {
    $("modeSelect").value = S.mode;
    $("speed").value = valorDe(S.sps); $("speedOut").textContent = textoSps(S.sps);
    $("zoom").value = S.cell;
    $("exampleSelect").value = S.exampleId || "";
    $("exampleDesc").textContent = S.desc || "";
    $("showMatches").checked = S.showMatches;
    syncWorldPanel(); renderRules(); renderTile();
    resizeCanvas(); draw(); updateStats();
  }

  // ---------- Guardar / cargar ----------
  function serialize() {
    const dots = [], init = [];
    S.world.cells.forEach((v, i) => { if (v) dots.push(i); });
    if (S.initial) S.initial.forEach((v, i) => { if (v) init.push(i); });
    return {
      formato: "punto-1",
      world: { w: S.world.w, h: S.world.h, wrap: S.world.wrap, lattice: S.world.lattice, dots },
      initial: init, rules: S.rules, mode: S.mode, cell: S.cell, speed: S.speed, sps: S.sps, tile: S.tile,
      exampleId: S.exampleId, desc: S.desc, stepCount: S.stepCount,
    };
  }
  function deserialize(d) {
    const w = P.newWorld(d.world.w, d.world.h);
    w.wrap = !!d.world.wrap; Object.assign(w.lattice, d.world.lattice || {});
    for (const i of d.world.dots || []) w.cells[i] = 1;
    S.world = w;
    S.initial = new Uint8Array(w.w * w.h); for (const i of d.initial || []) S.initial[i] = 1;
    S.initialDots = (d.initial || []).length;
    S.rules = d.rules || []; S.mode = d.mode || "par-prio"; S.cell = d.cell || 10; S.speed = d.speed || 1; S.sps = d.sps || S.speed * 60;
    if (d.tile) S.tile = d.tile;
    S.exampleId = d.exampleId || null; S.desc = d.desc || ""; S.stepCount = d.stepCount || 0;
    S.dirty = true; S.last = null;
  }
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(serialize())); } catch (e) { /* sin almacenamiento */ } }, 300);
  }

  // ---------- Eventos ----------
  // ---------- Galería: navegación rápida entre autómatas ----------
  function categoria(e) {
    if (/^(hormiga|auto)/.test(e.id)) return "Hormigas";
    if (/^logica-/.test(e.id)) return "Puertas lógicas";
    if (/^turing-/.test(e.id)) return "Máquinas de Turing";
    if (/^ent-/.test(e.id)) return "Entropía · una regla";
    if (/^bb-/.test(e.id)) return "Busy beaver";
    if (/^multi-/.test(e.id)) return "Órdenes · varias reglas";
    return "Clásicos";
  }
  // Favoritos: instantáneas completas (reglas + mundo inicial + modo), guardadas en favoritos.json vía el servidor
  // local (para poder estudiarlas después) o, si no hay servidor, en el navegador.
  let FAVS = [];
  const claveReglas = rules => JSON.stringify(rules.map(r => [r.w, r.h, r.lhs, r.rhs, r.sym, !!r.anchored]));
  const claveEj = e => e._clave || (e._clave = (e.fav ? e.fav.clave : claveReglas(e.rules()) + "|" + e.world.w + "x" + e.world.h));
  function favAEjemplo(f) {
    return { id: "fav-" + f.fid, name: "★ " + f.nombre, desc: f.estado.desc, fav: f, world: f.estado.world };
  }
  function esFav(e) { const k = claveEj(e); return FAVS.some(f => f.clave === k); }
  async function cargarFavs() {
    try { const r = await fetch("api/favoritos", { cache: "no-store" }); if (r.ok) { FAVS = await r.json(); return; } } catch (e) { /* sin servidor */ }
    try { FAVS = JSON.parse(localStorage.getItem(STORE + ":favs") || "[]"); } catch (e) { FAVS = []; }
  }
  async function guardarFavs() {
    try { localStorage.setItem(STORE + ":favs", JSON.stringify(FAVS)); } catch (e) { /* nada */ }
    try { await fetch("api/favoritos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(FAVS, null, 1) }); } catch (e) { /* sin servidor */ }
  }
  function alternarFav() {
    // La clave sale de lo que hay en pantalla: si se editaron las reglas, es otro sistema
    const actual = [...EXAMPLES, ...FAVS.map(favAEjemplo)].find(e => e.id === S.exampleId);
    const k = claveReglas(S.rules) + "|" + S.world.w + "x" + S.world.h;
    const editado = actual && claveEj(actual) !== k;
    const i = FAVS.findIndex(f => f.clave === k);
    if (i >= 0) FAVS.splice(i, 1);
    else {
      const est = serialize();
      est.world.dots = est.initial.slice(); est.stepCount = 0;            // se guarda desde el estado inicial
      const nombre = (actual ? actual.name.replace(/^★ /, "") : "Mi sistema") + (editado ? " (editado)" : "");
      FAVS.push({ fid: Date.now().toString(36), nombre, fecha: new Date().toISOString(), origen: S.exampleId, clave: k, estado: est });
    }
    guardarFavs(); renderGaleria();
  }
  const CATS = ["★ Favoritos", "Hormigas", "Puertas lógicas", "Máquinas de Turing", "Clásicos", "Entropía · una regla", "Busy beaver", "Órdenes · varias reglas"];
  const porCat = c => c === "★ Favoritos" ? FAVS.map(favAEjemplo) : EXAMPLES.filter(e => categoria(e) === c);
  for (const c of CATS.slice(1)) {
    const L = porCat(c); if (!L.length) continue;
    const g = document.createElement("optgroup"); g.label = `${c} (${L.length})`;
    L.forEach(e => { const o = document.createElement("option"); o.value = e.id; o.textContent = e.name; g.appendChild(o); });
    $("exampleSelect").appendChild(g);
  }
  let autoRun = true;
  try { autoRun = localStorage.getItem(STORE + ":auto") !== "0"; } catch (e) { /* sin almacenamiento */ }
  $("autoRun").checked = autoRun;
  $("autoRun").onchange = e => { autoRun = e.target.checked; try { localStorage.setItem(STORE + ":auto", autoRun ? "1" : "0"); } catch (err) { /* nada */ } };
  function visibles() {
    const q = ($("galFilter").value || "").trim().toLowerCase();
    const orden = CATS.flatMap(porCat);
    return q ? orden.filter(e => (e.name + " " + categoria(e) + " " + (e.desc || "")).toLowerCase().includes(q)) : orden;
  }
  function abrir(id) {
    const f = FAVS.find(x => "fav-" + x.fid === id);
    if (f) {
      stop(); deserialize(JSON.parse(JSON.stringify(f.estado))); S.exampleId = id; snapshotInitial(); syncAll(); save();
    } else loadExample(id);
    renderGaleria();
    if (autoRun) start();
  }
  function mover(d) {
    const L = visibles(); if (!L.length) return;
    const i = L.findIndex(e => e.id === S.exampleId);
    const j = i < 0 ? (d > 0 ? 0 : L.length - 1) : (i + d + L.length) % L.length;
    abrir(L[j].id);
  }
  function renderGaleria() {
    const el = $("galList"); el.innerHTML = "";
    const L = visibles(); let cat = null;
    for (const e of L) {
      const c = e.fav ? "★ Favoritos" : categoria(e);
      if (c !== cat) { cat = c; const h = document.createElement("h4"); h.textContent = c; el.appendChild(h); }
      const fila = document.createElement("div"); fila.className = "galRow";
      const st = document.createElement("button"); st.className = "galStar";
      const on = esFav(e); st.textContent = on ? "★" : "☆"; st.title = on ? "Quitar de favoritos" : "Marcar como favorito";
      st.onclick = ev => { ev.stopPropagation(); if (S.exampleId !== e.id) abrir(e.id); alternarFav(); };
      const b = document.createElement("button");
      b.className = "galItem" + (e.id === S.exampleId ? " active" : "");
      b.textContent = e.name.replace(/^(★ )?(Entropía|Busy beaver|Órdenes) · /, "$1");
      b.title = e.desc || e.name;
      b.onclick = () => abrir(e.id);
      fila.appendChild(st); fila.appendChild(b); el.appendChild(fila);
    }
    if (!L.length) el.innerHTML = '<p class="hint">Nada coincide con el filtro.</p>';
    const act = el.querySelector(".active"); if (act) act.scrollIntoView({ block: "nearest" });
    const actual = [...EXAMPLES, ...FAVS.map(favAEjemplo)].find(x => x.id === S.exampleId);
    const kAct = claveReglas(S.rules) + "|" + S.world.w + "x" + S.world.h;
    $("favBtn").textContent = FAVS.some(f => f.clave === kAct) ? "★" : "☆";
  }
  $("galFilter").oninput = renderGaleria;
  $("exampleSelect").onchange = e => { abrir(e.target.value); e.target.blur(); };
  $("favBtn").onclick = alternarFav;
  $("prevEx").onclick = () => mover(-1);
  $("nextEx").onclick = () => mover(1);
  $("playBtn").onclick = () => S.running ? stop() : start();
  $("stepBtn").onclick = () => { stop(); doStep(); draw(); updateStats(); save(); };
  $("resetBtn").onclick = () => { stop(); if (S.initial) S.world.cells.set(S.initial); S.stepCount = 0; S.last = null; draw(); updateStats(); save(); };
  $("setInitBtn").onclick = () => { snapshotInitial(); updateStats(); save(); };
  $("modeSelect").onchange = e => { S.mode = e.target.value; save(); };
  $("speed").oninput = e => { S.sps = spsDe(+e.target.value); $("speedOut").textContent = textoSps(S.sps); save(); };
  $("zoom").oninput = e => { S.cell = +e.target.value; resizeCanvas(); draw(); save(); };
  $("showMatches").onchange = e => { S.showMatches = e.target.checked; draw(); };
  $("addRule").onclick = () => { S.rules.push(P.newRule(3, 3, `Regla ${S.rules.length + 1}`)); markRules(); renderRules(); updateStats(); };

  document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
    document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("active", x === b));
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("hidden", t.id !== "tab-" + b.dataset.tab));
  });

  // Máquina universal: programa propio con las mismas reglas
  $("tmCargar").onclick = () => {
    try {
      const E = PuntoEjemplos;
      const tabla = E.leerPrograma($("tmTabla").value);
      const largo = Math.max(1, +$("tmLargo").value || 8), cabeza = Math.min(largo - 1, Math.max(0, +$("tmCabeza").value || 0));
      const cinta = ($("tmCinta").value || "").replace(/[^01]/g, "");
      const ex = E.ejemploTuring({ id: "propio", nombre: "Tu programa", desc: "Programa escrito en la pestaña Mundo.",
        tabla, cinta, cabeza, largo: Math.max(largo, cinta.length) });
      const i = EXAMPLES.findIndex(e => e.id === ex.id);
      if (i >= 0) EXAMPLES[i] = ex; else EXAMPLES.push(ex);
      loadExample(ex.id); renderGaleria();
      if (autoRun) start();
    } catch (err) { alert("Programa no válido: " + err.message); }
  };

  $("applySize").onclick = () => {
    stop();
    const nw = Math.max(4, Math.min(1000, +$("worldW").value || 4)), nh = Math.max(4, Math.min(1000, +$("worldH").value || 4));
    const old = S.world, w = P.newWorld(nw, nh);
    w.wrap = old.wrap; w.lattice = old.lattice;
    for (let y = 0; y < Math.min(nh, old.h); y++) for (let x = 0; x < Math.min(nw, old.w); x++) w.cells[y * nw + x] = old.cells[y * old.w + x];
    S.world = w; snapshotInitial(); syncAll(); save();
  };
  $("wrap").onchange = e => { S.world.wrap = e.target.checked; save(); };
  $("clearBtn").onclick = () => { stop(); S.world.cells.fill(0); S.last = null; draw(); updateStats(); save(); };
  ["latType", "latPx", "latPy", "latOx", "latOy", "latM", "latN", "latK"].forEach(id => $(id).onchange = readLattice);
  $("showLattice").onchange = e => { S.showLattice = e.target.checked; draw(); };
  ["tileW", "tileH", "tileOx", "tileOy"].forEach(id => $(id).onchange = resizeTile);
  $("fillTile").onclick = () => { stop(); P.fillTile(S.world, S.tile, S.tile.ox, S.tile.oy); S.last = null; draw(); updateStats(); save(); };

  $("exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify(serialize(), null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = (S.exampleId || "punto") + ".json"; a.click(); URL.revokeObjectURL(a.href);
  };
  $("importFile").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { stop(); deserialize(JSON.parse(await f.text())); syncAll(); save(); }
    catch (err) { alert("No se pudo leer el archivo: " + err.message); }
    e.target.value = "";
  };
  document.addEventListener("keydown", e => {
    if (e.target instanceof Element && e.target.matches("input, select, textarea")) return;
    if (e.code === "Space") { e.preventDefault(); S.running ? stop() : start(); }
    if (e.key === "n" || e.key === "N") $("stepBtn").click();
    if (e.key === "f" || e.key === "F") alternarFav();
    if (e.key === "ArrowRight") { e.preventDefault(); mover(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); mover(-1); }
  });

  // ---------- Arranque ----------
  let restored = false;
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) { deserialize(JSON.parse(raw)); restored = true; }
  } catch (e) { restored = false; }
  if (restored) syncAll(); else loadExample("hormiga6");
  renderGaleria();
  cargarFavs().then(renderGaleria);
})();
