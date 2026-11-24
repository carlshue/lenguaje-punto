"""Hormiga sin red, familia separable (F2): zona de píxel y zona de hormiga independientes.
 (a) el vacío es la red: píxel blanco = vacío y «sin hormiga» = vacío.
 (b) la red crece delante: una celda de marca • en todo bloque construido; el vacío total es «sin construir».
8 reglas de hormiga: LHS = bloque actual completo + zona de hormiga del destino «sin hormiga» (+ marca en (b));
escriben el píxel invertido, borran la hormiga y escriben su código en la zona de hormiga del destino.
En (b), 4 reglas de crecimiento: marca del bloque origen • y bloque destino entero vacío -> bloque blanco."""
import itertools, sys, time
from sin_red import Bloque, encaja_en_falso, izq, der, U, L, D, R


def estados_de(n_, Pw, Pb, codigos, marca):
    base = (1 << marca) if marca is not None else 0
    est = {("N", 0): base | Pw, ("N", 1): base | Pb}
    for c, P in ((0, Pw), (1, Pb)):
        for d in range(4):
            est[("A", c, d)] = base | P | codigos[d]
    if marca is not None:
        est[("vacio",)] = 0
    return est


def reglas(B, est, za, marca, marco=()):
    """LHS de las 8 reglas de hormiga y de las 4 de crecimiento."""
    out = []
    for d in range(4):
        for c in (0, 1):
            nd = izq(d) if c == 0 else der(d)
            p = est[("A", c, d)]
            L_ = {B.pos(k): (1 if p >> k & 1 else 2) for k in range(B.n)}
            vx, vy = B.vec[nd]
            for k in za:                      # zona de hormiga del destino: «sin hormiga» = vacía
                x, y = B.pos(k); L_[(vx + x, vy + y)] = 2
            if marca is not None:
                x, y = B.pos(marca); L_[(vx + x, vy + y)] = 1
            out.append(L_)
    if marca is not None:
        out += crecer(B, marca, marco)
    return out


def crecer(B, marca, marco=()):
    """LHS de las 4 reglas de crecimiento: marca del bloque origen •, sus celdas de marco (siempre vacías)
    vacías, y el bloque vecino entero vacío."""
    out = []
    for v in range(4):
        mx, my = B.pos(marca); L_ = {(mx, my): 1}
        for k in marco:
            x, y = B.pos(k); L_[(x, y)] = 2
        vx, vy = B.vec[v]
        for k in range(B.n):
            x, y = B.pos(k); L_[(vx + x, vy + y)] = 2
        out.append(L_)
    return out


def buscar(variante, n, limite=50):
    sols = []
    for w in range(1, n + 1):
        if n % w: continue
        B = Bloque(w, n // w)
        for p in range(1, n):
            for zp in itertools.combinations(range(n), p):
                resto = [i for i in range(n) if i not in zp]
                for marca in ([None] if variante == "a" else resto):
                    libres = [i for i in resto if i != marca]
                    tams = [len(libres)] if variante == "a" else range(3, len(libres) + 1)
                    for q in tams:
                      for za in itertools.combinations(libres, q):
                        za = list(za); marco = [i for i in libres if i not in za]
                        if len(za) < 3: continue
                        cods = [sum(1 << za[j] for j in range(len(za)) if m >> j & 1) for m in range(1, 1 << len(za))]
                        psub = [sum(1 << zp[j] for j in range(p) if m >> j & 1) for m in range(1 << p)]
                        pares = [(0, b) for b in psub if b] if variante == "a" else [(a, b) for a in psub for b in psub if a != b]
                        for Pw, Pb in pares:
                            if marca is not None:
                                est0 = {k: v for k, v in estados_de(n, Pw, Pb, (0, 0, 0, 0), marca).items() if k[0] != "A"}
                                if len(set(est0.values())) != len(est0): continue
                                sin_h = {k: False for k in est0}
                                if any(encaja_en_falso(B, L_, est0, sin_h) is not None for L_ in crecer(B, marca, marco)):
                                    continue
                            for codigos in itertools.permutations(cods, 4):
                                est = estados_de(n, Pw, Pb, codigos, marca)
                                if len(set(est.values())) != len(est): continue
                                es_h = {s_: s_[0] == "A" for s_ in est}
                                if all(encaja_en_falso(B, L_, est, es_h) is None for L_ in reglas(B, est, za, marca, marco)):
                                    sols.append(dict(w=w, h=n // w, zp=zp, za=za, marco=marco, marca=marca, Pw=Pw, Pb=Pb, codigos=codigos))
                                    if len(sols) >= limite: return sols
    return sols


def dibujo(s):
    w, h = s["w"], s["h"]
    est = estados_de(w * h, s["Pw"], s["Pb"], s["codigos"], s["marca"])
    filas = ["        " + "   ".join(x.ljust(w) for x in ["-", "↑", "←", "↓", "→"])]
    for c in (0, 1):
        pats = [est[("N", c)]] + [est[("A", c, d)] for d in range(4)]
        for y in range(h):
            filas.append((("blanco  " if c == 0 else "negro   ") if y == 0 else "        ") +
                         "   ".join("".join("•" if q >> (y * w + x) & 1 else "·" for x in range(w)) for q in pats))
    return "\n".join(filas)


if __name__ == "__main__":
    variante = sys.argv[1]
    for n in range(4, 10):
        t = time.time(); s = buscar(variante, n)
        print(f"({variante}) n={n}: {len(s)} soluciones{' (corté en 50)' if len(s) >= 50 else ''}, {time.time() - t:.0f}s", flush=True)
        if s:
            peso = lambda x: sum(bin(v).count("1") for v in (x["Pw"], x["Pb"], *x["codigos"]))
            for x in sorted(s, key=peso)[:3]:
                print({k: x.get(k) for k in ("w", "h", "zp", "za", "marco", "marca")}); print(dibujo(x))
            break
