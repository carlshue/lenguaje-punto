"""Contraste: enumera literalmente las asignaciones legales (2^nb colores × (1 + 4·nb) hormigas)."""
import itertools, random, json
import numpy as np
from codigos import *

def asignaciones(nb):
    for cols in itertools.product((0, 1), repeat=nb):
        yield [5 * c for c in cols]
        for i in range(nb):
            for d in range(4):
                a = [5 * c for c in cols]; a[i] += 1 + d
                yield a

def amb_bruta(geo, pats):
    if len(set(pats)) < 10: return True
    for (d, c, c2, nd, sA, sB, _, _) in REGLAS:
        for lst in geo.geo[nd]:
            # LHS como dict celda-de-bloque -> bit
            for asg in asignaciones(len(lst)):
                if all(((pats[s] >> kl) & 1) == ((pats[sB if src else sA] >> k) & 1)
                       for s, (m, maps) in zip(asg, lst) for (src, k, kl) in maps):
                    return True
    return False

if __name__ == "__main__":
    random.seed(1)
    rng = np.random.default_rng(0)
    res = json.load(open("res_F1_5-6-7.json"))
    for geo in [rect(2, 3), rect(3, 2), rect(1, 6), rect(1, 5), rect(2, 2), cruz(), rect(1, 7)]:
        n = geo.n
        cands = [tuple(random.sample(range(1 << n), 10)) for _ in range(100)] if (1 << n) >= 10 else []
        for pats in familia_F1(geo):
            cands += [tuple(map(int, r)) for r in pats[rng.choice(len(pats), min(2, len(pats)), replace=False)]]
        cands += [tuple(p) for f, nn, p in res if f == geo.nombre][:150]
        cands = cands[:900]
        rap = ambiguos(geo, np.array(cands))
        bru = np.array([amb_bruta(geo, c) for c in cands])
        print(geo.nombre, len(cands), "coinciden:", bool((rap == bru).all()), "ambiguas:", int(bru.sum()), flush=True)
