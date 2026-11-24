"""Búsqueda general (10 patrones arbitrarios) por backtracking con poda.
Poda válida: si con los estados ya asignados existe un testigo de ambigüedad, añadir más estados
no lo elimina (solo da más opciones al mundo)."""
import sys, time, json
from codigos import *

ORDEN = [0, 5, 1, 6, 2, 7, 3, 8, 4, 9]

def amb_parcial(geo, pats, reglas):
    asig = [s for s in range(10) if pats[s] is not None]
    sin_h = [pats[s] for s in asig if s % 5 == 0]
    con_h = [pats[s] for s in asig if s % 5]
    for (d, c, c2, nd, sA, sB, _, _) in reglas:
        A, B = pats[sA], pats[sB]
        for lst in geo.geo[nd]:
            nec = 0; ok = True
            for (m, maps) in lst:
                V = 0
                for (src, k, kl) in maps:
                    V |= (((B if src else A) >> k) & 1) << kl
                if any((p & m) == V for p in sin_h): continue
                if any((p & m) == V for p in con_h): nec += 1
                else: ok = False; break
                if nec > 1: ok = False; break
            if ok: return True
    return False

def buscar(geo, conservar=False, limite=None, cuenta_n=None):
    n = geo.n
    sols = []
    pats = [None] * 10
    usados = set()
    t0 = time.time()
    nodos = [0]
    def reglas_activas():
        return [r for r in REGLAS if pats[r[4]] is not None and pats[r[5]] is not None]
    def rec(i):
        if limite and len(sols) >= limite: return
        if i == 10:
            sols.append(tuple(pats)); return
        s = ORDEN[i]
        for p in range(1 << n):
            if p in usados: continue
            if conservar and s % 5 and i > 2:
                # todas las hormigas con el mismo número de •
                if popcount(p) != popcount(pats[1]): continue
            if conservar and s == 5 and popcount(p) != popcount(pats[0]): continue
            pats[s] = p; usados.add(p); nodos[0] += 1
            if not amb_parcial(geo, pats, reglas_activas()):
                rec(i + 1)
            pats[s] = None; usados.discard(p)
    rec(0)
    return sols, nodos[0], time.time() - t0

if __name__ == "__main__":
    formas = sys.argv[1].split(",")
    conservar = len(sys.argv) > 2 and sys.argv[2] == "c"
    limite = int(sys.argv[3]) if len(sys.argv) > 3 else None
    out = {}
    for f in formas:
        geo = cruz() if f == "cruz" else rect(*map(int, f.split("x")))
        sols, nodos, t = buscar(geo, conservar, limite)
        ops = simetrias(geo)
        canon = sorted({canonica(geo, s, ops) for s in sols})
        print(f"{f} conservar={conservar}: {len(sols)} soluciones, {len(canon)} sin duplicados, {nodos} nodos, {t:.1f}s", flush=True)
        out[f] = [list(c) for c in canon]
    json.dump(out, open(f"gen_{sys.argv[1].replace(',', '-')}{'_c' if conservar else ''}.json", "w"))
