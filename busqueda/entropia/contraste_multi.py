"""Contraste de sistemas de varias reglas: simulador por bits frente a engine.js (par-skip, toro)."""
import json, random, subprocess
import numpy as np
from multi import sistema_aleatorio, variantes_literal
from motor import Lote, desempaquetar, empaquetar, N
rng = random.Random(11)
sis = [sistema_aleatorio(rng, p_simetria=0.5)[0] for _ in range(120)]
A0 = np.random.default_rng(2).integers(0, 2, (N, N), dtype=np.uint8)
PASOS = 25
L = Lote([[v for (l, r, s) in rs for v in variantes_literal(l, r, s)] for rs in sis])
W = np.repeat(empaquetar(A0)[None], len(sis), axis=0)
for _ in range(PASOS): W = L.paso(W)
py = desempaquetar(W)
json.dump({"init": A0.ravel().tolist(), "pasos": PASOS,
           "sis": [[dict(lhs=l, rhs=r, sym=s) for (l, r, s) in rs] for rs in sis]}, open("_contraste.json", "w"))
js = r'''
const P = require("../../engine.js"), d = require("./_contraste.json"); const out = [];
for (const rs of d.sis) {
  const w = P.newWorld(64, 64); w.wrap = true; w.cells.set(d.init);
  const rules = rs.map(r => { const x = P.newRule(3, 3, "x"); x.lhs = r.lhs; x.rhs = r.rhs; x.sym = r.sym; x.anchor = [1, 1]; return x; });
  const v = P.compileRules(rules);
  for (let i = 0; i < d.pasos; i++) P.step(w, v, "par-skip");
  out.push(Array.from(w.cells));
}
process.stdout.write(JSON.stringify(out));'''
res = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True).stdout)
ok = [np.array_equal(np.array(res[i]).reshape(N, N), py[i]) for i in range(len(sis))]
print(f"{sum(ok)}/{len(sis)} sistemas idénticos tras {PASOS} pasos; "
      f"{sum(not np.array_equal(py[i], A0) for i in range(len(sis)))} cambian el mundo; reglas por sistema: {min(map(len, sis))}–{max(map(len, sis))}")
