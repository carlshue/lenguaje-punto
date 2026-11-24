"""Conservativas de 5 celdas por clases de peso (hormigas con wa •, sin hormiga con wn •), exhaustivo con numpy."""
import sys, json, itertools, time
import numpy as np
from codigos import *

def clase(geo, wa, wn):
    pc = [bin(i).count("1") for i in range(32)]
    poolN = [i for i in range(32) if pc[i] == wn]
    poolA = [i for i in range(32) if pc[i] == wa]
    ops = simetrias(geo); vistos = {}; total = 0
    for N0, N1 in itertools.permutations(poolN, 2):
        rest = [a for a in poolA if a not in (N0, N1)]
        perms = np.array(list(itertools.permutations(rest, 8)), dtype=np.int64)
        for i in range(0, len(perms), 400000):
            A = perms[i:i + 400000]
            P = np.empty((len(A), 10), dtype=np.int64)
            P[:, 0] = N0; P[:, 5] = N1; P[:, 1:5] = A[:, :4]; P[:, 6:10] = A[:, 4:]
            total += len(P)
            for r in P[~ambiguos(geo, P)]:
                r = tuple(int(x) for x in r); vistos.setdefault(canonica(geo, r, ops), r)
    return total, vistos

if __name__ == "__main__":
    wa, wn = int(sys.argv[1]), int(sys.argv[2])
    out = {}
    for geo in [rect(1, 5), rect(5, 1), cruz()]:
        t0 = time.time()
        total, v = clase(geo, wa, wn)
        print(f"{geo.nombre} hormiga {wa}•, sin hormiga {wn}•: {total} candidatos, {len(v)} válidas sin duplicados, {time.time()-t0:.0f}s", flush=True)
        out[geo.nombre] = [list(k) for k in v]
    json.dump(out, open(f"cons5_{wa}{wn}.json", "w"))
