"""Contraste: el simulador por bits (motor.py) frente al motor del editor (engine.js), par-skip en el toro."""
import json, random, subprocess, sys
import numpy as np
from reglas import aleatoria, variantes, normalizada
from motor import Lote, desempaquetar, empaquetar, N

rng = random.Random(7)
reglas = []
while len(reglas) < 300:
    l, r, s = aleatoria(rng, (rng.choice([1, 2, 3]), rng.choice([1, 2, 3])))
    vs = variantes(l, r, s)
    if vs: reglas.append((l, r, s, vs))
reglas += [((1, 2, 0, 0, 0, 0, 0, 0, 0), (2, 1, 0, 0, 0, 0, 0, 0, 0), "rot", None),       # gas
           ((1, 1, 0, 0, 0, 0, 0, 0, 0), (0, 2, 0, 0, 0, 0, 0, 0, 0), "rot", None)]       # [• •] con rotación
reglas = [(l, r, s, vs or variantes(l, r, s)) for (l, r, s, vs) in reglas]
A0 = np.random.default_rng(1).integers(0, 2, (N, N), dtype=np.uint8)
PASOS = 30
W = np.repeat(empaquetar(A0)[None], len(reglas), axis=0)
lote = Lote([vs for *_, vs in reglas])
for _ in range(PASOS): W = lote.paso(W)
py = desempaquetar(W)
datos = {"init": A0.ravel().tolist(), "pasos": PASOS,
         "reglas": [dict(zip(("lhs", "rhs"), normalizada(l, r)), sym=s) for (l, r, s, _) in reglas]}
json.dump(datos, open("_contraste.json", "w"))
js = r'''
const P = require("../../engine.js"), d = require("./_contraste.json");
const out = [];
for (const r of d.reglas) {
  const w = P.newWorld(64, 64); w.wrap = true; w.cells.set(d.init);
  const rule = P.newRule(3, 3, "x"); rule.lhs = r.lhs; rule.rhs = r.rhs; rule.sym = r.sym; rule.anchor = [1, 1];
  const v = P.compileRules([rule]);
  for (let i = 0; i < d.pasos; i++) P.step(w, v, "par-skip");
  out.push(Array.from(w.cells));
}
process.stdout.write(JSON.stringify(out));
'''
res = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, cwd=".").stdout)
iguales = [np.array_equal(np.array(res[i]).reshape(N, N), py[i]) for i in range(len(reglas))]
cambian = sum(not np.array_equal(py[i], A0) for i in range(len(reglas)))
print(f"{sum(iguales)}/{len(reglas)} idénticos tras {PASOS} pasos ({cambian} reglas cambian el mundo)")
for i, ok in enumerate(iguales):
    if not ok: print("DISTINTO:", reglas[i][:3]); break
