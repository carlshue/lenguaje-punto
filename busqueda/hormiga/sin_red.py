"""Hormiga sin red (sin anclaje, el mundo empieza vacío). Dos variantes:

 (a) «el vacío es la red»: el bloque blanco sin hormiga es todo vacío, así que el mundo a cero ya es una red blanca.
     Solo reglas de hormiga, sin anclar.
 (b) «la red crece delante»: todo bloque construido lleva un • de marca; el vacío total es «sin construir».
     4 reglas de crecimiento copian el bloque blanco a los huecos vecinos y la hormiga solo avanza sobre bloques con marca.

Familia F1 (estilo Carlos): la hormiga es un único • en una de 4 casillas; el píxel, un patrón del resto.
Reglas de hormiga: LHS = bloque actual completo + casilla de llegada vacía (+ la marca del destino en (b)).
Es decir, 8 reglas (una por dirección y color), sin mirar el resto del bloque destino.

Comprobación (exacta, como en busqueda/codigos.py): para cada regla y cada desplazamiento no alineado,
¿existe un mundo con como mucho una hormiga (y bloques sin construir en (b)) que reproduzca el LHS?
La restricción se separa por bloques del mundo: basta mirar qué estados son compatibles en cada uno.
"""
import itertools, sys, time

U, L, D, R = 0, 1, 2, 3
FL = "↑←↓→"
izq = lambda d: (d + 1) % 4
der = lambda d: (d + 3) % 4


class Bloque:
    def __init__(self, w, h):
        self.w, self.h, self.n = w, h, w * h
        self.vec = {U: (0, -h), D: (0, h), L: (-w, 0), R: (w, 0)}

    def celda(self, x, y):
        """Píxel absoluto -> (bloque (a, b), índice local)."""
        a, xl = divmod(x, self.w); b, yl = divmod(y, self.h)
        return (a, b), yl * self.w + xl

    def pos(self, k):
        return k % self.w, k // self.w


def lhs_hormiga(B, est, d, c, marca):
    """LHS de la regla (d, c) como {(x, y): 1 • / 2 vacío} relativo al origen del bloque actual."""
    nd = izq(d) if c == 0 else der(d)
    p = est["A"][c][d]
    L_ = {B.pos(k): (1 if p >> k & 1 else 2) for k in range(B.n)}
    vx, vy = B.vec[nd]
    sx, sy = B.pos(est["slots"][nd]); L_[(vx + sx, vy + sy)] = 2
    if marca is not None:
        mx, my = B.pos(marca); L_[(vx + mx, vy + my)] = 1
    return L_


def lhs_crecer(B, est, v, marca):
    """Crecimiento hacia v: marca del bloque origen • y bloque destino entero vacío."""
    mx, my = B.pos(marca)
    L_ = {(mx, my): 1}
    vx, vy = B.vec[v]
    for k in range(B.n):
        x, y = B.pos(k); L_[(vx + x, vy + y)] = 2
    return L_


def encaja_en_falso(B, L_, estados, es_hormiga):
    """¿Hay un desplazamiento no alineado y un mundo legal (≤ 1 hormiga) que reproduzcan L_?"""
    for tx in range(B.w):
        for ty in range(B.h):
            if tx == 0 and ty == 0:
                continue
            bloques = {}
            for (x, y), val in L_.items():
                blk, k = B.celda(x + tx, y + ty)
                bloques.setdefault(blk, []).append((k, val))
            ok = True; nec = 0
            for blk, req in bloques.items():
                compat = [s for s, p in estados.items() if all(((p >> k) & 1) == (val == 1) for k, val in req)]
                if not compat:
                    ok = False; break
                if all(es_hormiga[s] for s in compat):
                    nec += 1
                    if nec > 1:
                        ok = False; break
            if ok:
                return (tx, ty)
    return None


def codificacion(B, slots, pw, pb, marca):
    est = {"slots": slots, "A": [[0] * 4 for _ in range(2)], "N": [0, 0]}
    base = (1 << marca) if marca is not None else 0
    for c, P in ((0, pw), (1, pb)):
        est["N"][c] = base | P
        for d in range(4):
            est["A"][c][d] = base | P | (1 << slots[d])
    estados = {("N", c): est["N"][c] for c in (0, 1)}
    estados.update({("A", c, d): est["A"][c][d] for c in (0, 1) for d in range(4)})
    if marca is not None:
        estados[("vacio",)] = 0
    if len(set(estados.values())) != len(estados):
        return None, None
    return est, estados


def valida(B, est, estados, marca):
    es_h = {s: s[0] == "A" for s in estados}
    for d in range(4):
        for c in (0, 1):
            if encaja_en_falso(B, lhs_hormiga(B, est, d, c, marca), estados, es_h):
                return False
    if marca is not None:
        for v in range(4):
            if encaja_en_falso(B, lhs_crecer(B, est, v, marca), estados, es_h):
                return False
    return True


def buscar(variante, n, limite=None):
    sols = []
    for w in range(1, n + 1):
        if n % w:
            continue
        B = Bloque(w, n // w)
        for slots in itertools.permutations(range(n), 4):
            resto = [i for i in range(n) if i not in slots]
            marcas = [None] if variante == "a" else resto
            for marca in marcas:
                libres = [i for i in resto if i != marca]
                subs = [sum(1 << libres[j] for j in range(len(libres)) if m >> j & 1) for m in range(1 << len(libres))]
                pares = [(0, pb) for pb in subs if pb] if variante == "a" else [(a, b) for a in subs for b in subs if a != b]
                for pw, pb in pares:
                    est, estados = codificacion(B, slots, pw, pb, marca)
                    if est and valida(B, est, estados, marca):
                        sols.append((w, n // w, slots, pw, pb, marca))
                        if limite and len(sols) >= limite:
                            return sols
    return sols


def dibujo(w, h, slots, pw, pb, marca):
    B = Bloque(w, h)
    est, _ = codificacion(B, slots, pw, pb, marca)
    filas = []
    for c in (0, 1):
        pats = [est["N"][c]] + est["A"][c]
        for y in range(h):
            filas.append(("blanco " if c == 0 else "negro  ") * (y == 0) + ("       " if y else "") +
                         "   ".join("".join("•" if p >> (y * w + x) & 1 else "·" for x in range(w)) for p in pats))
    return "        " + "   ".join(s.ljust(w) for s in ["-", "↑", "←", "↓", "→"]) + "\n" + "\n".join(filas)


if __name__ == "__main__":
    variante = sys.argv[1]
    for n in range(4, 9):
        t = time.time()
        s = buscar(variante, n, limite=2000)
        print(f"({variante}) n={n}: {len(s)} soluciones{' (o más)' if len(s) >= 2000 else ''}, {time.time() - t:.0f}s", flush=True)
        if s:
            # la de menos • en total
            def peso(x):
                w, h, slots, pw, pb, m = x
                return bin(pw).count("1") + bin(pb).count("1") + (2 if m is not None else 0)
            for x in sorted(s, key=peso)[:3]:
                print(x); print(dibujo(*x))
            break
