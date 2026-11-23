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
    S.mode = ex.mode; S.cell = ex.cell; S.speed = ex.speed;
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
  function loop() {
    if (!S.running) return;
    let st;
    for (let i = 0; i < S.speed; i++) {
      st = doStep();
      if (!st.applied) { stop(); S.last = st; break; }
    }
    draw(); updateStats();
    if (S.running) requestAnimationFrame(loop);
  }
  function start() { if (S.running) return; S.running = true; $("playBtn").textContent = "⏸ Pausa"; requestAnimationFrame(loop); }
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
    // últimas escrituras
    if (S.last && S.last.written && S.last.written.length < 5000) {
      ctx.fillStyle = "rgba(214,51,108,.5)";
      for (const i of S.last.written) ctx.fillRect((i % w.w) * c, ((i / w.w) | 0) * c, c, c);
    }
    // •
    ctx.fillStyle = "#1d1d1f";
    const r = c * 0.36;
    for (let i = 0; i < w.cells.length; i++) {
      if (!w.cells[i]) continue;
      const x = i % w.w, y = (i / w.w) | 0;
      if (c < 5) ctx.fillRect(x * c, y * c, c, c);
      else { ctx.beginPath(); ctx.arc(x * c + c / 2, y * c + c / 2, r, 0, 6.2832); ctx.fill(); }
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
    $("speed").value = S.speed; $("speedOut").textContent = S.speed;
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
      initial: init, rules: S.rules, mode: S.mode, cell: S.cell, speed: S.speed, tile: S.tile,
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
    S.rules = d.rules || []; S.mode = d.mode || "par-prio"; S.cell = d.cell || 10; S.speed = d.speed || 1;
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
  EXAMPLES.forEach(e => { const o = document.createElement("option"); o.value = e.id; o.textContent = e.name; $("exampleSelect").appendChild(o); });
  $("loadExample").onclick = () => loadExample($("exampleSelect").value);
  $("playBtn").onclick = () => S.running ? stop() : start();
  $("stepBtn").onclick = () => { stop(); doStep(); draw(); updateStats(); save(); };
  $("resetBtn").onclick = () => { stop(); if (S.initial) S.world.cells.set(S.initial); S.stepCount = 0; S.last = null; draw(); updateStats(); save(); };
  $("setInitBtn").onclick = () => { snapshotInitial(); updateStats(); save(); };
  $("modeSelect").onchange = e => { S.mode = e.target.value; save(); };
  $("speed").oninput = e => { S.speed = +e.target.value; $("speedOut").textContent = S.speed; save(); };
  $("zoom").oninput = e => { S.cell = +e.target.value; resizeCanvas(); draw(); save(); };
  $("showMatches").onchange = e => { S.showMatches = e.target.checked; draw(); };
  $("addRule").onclick = () => { S.rules.push(P.newRule(3, 3, `Regla ${S.rules.length + 1}`)); markRules(); renderRules(); updateStats(); };

  document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
    document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("active", x === b));
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("hidden", t.id !== "tab-" + b.dataset.tab));
  });

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
    if (e.target.matches("input, select, textarea")) return;
    if (e.code === "Space") { e.preventDefault(); S.running ? stop() : start(); }
    if (e.key === "n" || e.key === "N") $("stepBtn").click();
  });

  // ---------- Arranque ----------
  let restored = false;
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) { deserialize(JSON.parse(raw)); restored = true; }
  } catch (e) { restored = false; }
  if (restored) syncAll(); else loadExample("hormiga6");
})();
