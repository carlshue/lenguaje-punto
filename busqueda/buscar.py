import sys, time, json
import numpy as np
from codigos import *

def formas(n):
    return [rect(w, n // w) for w in range(1, n + 1) if n % w == 0]

def buscar(fam, ns, extra=None):
    res = []
    for n in ns:
        for geo in formas(n):
            t0 = time.time(); total = 0; vistos = {}
            ops = simetrias(geo)
            gen = familia_F1(geo) if fam == "F1" else familia_F2(geo, extra)
            for pats in gen:
                total += len(pats)
                ok = ~ambiguos(geo, pats)
                for r in pats[ok]:
                    r = tuple(int(x) for x in r)
                    k = canonica(geo, r, ops)
                    vistos.setdefault(k, r)
            print(f"{fam} n={n} {geo.nombre}: {total} candidatos, {len(vistos)} válidos (sin duplicados), {time.time()-t0:.1f}s", flush=True)
            for k in vistos:
                res.append((geo.nombre, n, list(k)))
    return res

if __name__ == "__main__":
    fam = sys.argv[1]; ns = [int(x) for x in sys.argv[2].split(",")]
    extra = int(sys.argv[3]) if len(sys.argv) > 3 else None
    res = buscar(fam, ns, extra)
    json.dump(res, open(f"res_{fam}_{sys.argv[2].replace(',', '-')}{'_p'+str(extra) if extra else ''}.json", "w"))
