"""
Búsqueda de codificaciones autolocalizables de la hormiga de Langton en el lenguaje •.

Modelo (ver CLAUDE.md):
  - Un bloque (prototesela) de n celdas tesela el plano con una red generada por R y D.
  - 10 estados por bloque: píxel c ∈ {0 blanco, 1 negro} × hormiga ∈ {ninguna, ↑, ←, ↓, →}.
    Índice de estado: s = 5·c + 0 (sin hormiga) o 5·c + 1 + d, con d: 0 ↑, 1 ←, 2 ↓, 3 → (giro a la izquierda = +1).
  - 16 reglas: hormiga d sobre color c, destino de color c2 en la dirección nd (izquierda si c = blanco).
    LHS = bloque actual + bloque destino completos.
  - Mundo legal: cualquier asignación de estados con como mucho una hormiga.

Comprobación de ambigüedad (exacta): para cada regla y cada desplazamiento t no perteneciente a la red,
la ventana desplazada cae sobre varios bloques del mundo. Cada celda de la ventana pertenece a un único
bloque del mundo, así que la restricción se separa por bloques: un bloque es «compatible» con un estado si
el patrón del estado coincide con el LHS en la parte que se solapa. Existe un mundo legal que reproduce el
LHS si y solo si todos los bloques tienen algún estado compatible y como mucho uno de ellos necesita una
hormiga (no tiene ningún estado sin hormiga compatible). Equivale a enumerar las 1600 asignaciones, pero
cuesta 10 comparaciones por bloque.
"""
import itertools
import numpy as np

U, L, D, R = 0, 1, 2, 3
FLECHA = "↑←↓→"


def izq(d): return (d + 1) % 4
def der(d): return (d + 3) % 4


class Geometria:
    """Prototesela `cells` (lista de (x, y)) con red de vectores R y D."""

    def __init__(self, nombre, cells, vR, vD):
        self.nombre = nombre
        self.cells = [tuple(c) for c in cells]
        self.n = len(cells)
        self.vR, self.vD = tuple(vR), tuple(vD)
        self.vec = {U: (-vD[0], -vD[1]), D: self.vD, L: (-vR[0], -vR[1]), R: self.vR}
        # mapa píxel -> (bloque (a, b), índice local)
        self.loc = {}
        for a in range(-8, 9):
            for b in range(-8, 9):
                ox, oy = a * vR[0] + b * vD[0], a * vR[1] + b * vD[1]
                for k, (x, y) in enumerate(self.cells):
                    p = (ox + x, oy + y)
                    assert p not in self.loc, "la prototesela no tesela con esa red"
                    self.loc[p] = ((a, b), k)
        c0 = self.cells[0]
        self.desplaz = [(x - c0[0], y - c0[1]) for (x, y) in self.cells[1:]]
        self._prep()

    def _prep(self):
        """Para cada dirección nd del destino y cada desplazamiento t: lista de bloques del mundo cubiertos,
        cada uno con su máscara y las correspondencias (origen 0=A/1=B, bit origen, bit destino)."""
        self.geo = {}
        for nd in range(4):
            vx, vy = self.vec[nd]
            por_t = []
            for t in self.desplaz:
                bloques = {}
                for src, (bx, by) in ((0, (0, 0)), (1, (vx, vy))):
                    for k, (x, y) in enumerate(self.cells):
                        blk, kl = self.loc[(bx + x + t[0], by + y + t[1])]
                        bloques.setdefault(blk, []).append((src, k, kl))
                lst = []
                for blk, maps in bloques.items():
                    m = 0
                    for (_, _, kl) in maps:
                        m |= 1 << kl
                    lst.append((m, maps))
                por_t.append(lst)
            self.geo[nd] = por_t

    def es_rect(self):
        return self.vR[1] == 0 and self.vD[0] == 0


def rect(w, h):
    return Geometria(f"{w}x{h}", [(x, y) for y in range(h) for x in range(w)], (w, 0), (0, h))


def cruz():
    return Geometria("cruz", [(0, 0), (0, -1), (-1, 0), (0, 1), (1, 0)], (2, -1), (1, 2))


def reglas():
    """(d, c, c2, nd, estado_A, estado_B, nuevo_A, nuevo_B) para las 16 reglas."""
    out = []
    for d in range(4):
        for c in (0, 1):
            nd = izq(d) if c == 0 else der(d)
            for c2 in (0, 1):
                out.append((d, c, c2, nd, 5 * c + 1 + d, 5 * c2, 5 * (1 - c), 5 * c2 + 1 + nd))
    return out


REGLAS = reglas()


def ambiguos(geo, pats, detalle=False):
    """pats: array int64 [N, 10]. Devuelve máscara booleana [N] de codificaciones ambiguas.
    Las que tienen patrones repetidos también cuentan como inválidas."""
    pats = np.asarray(pats, dtype=np.int64)
    N = pats.shape[0]
    amb = np.zeros(N, dtype=bool)
    # patrones distintos
    for i in range(10):
        for j in range(i + 1, 10):
            amb |= pats[:, i] == pats[:, j]
    vivos = np.nonzero(~amb)[0]
    testigo = {}
    for (d, c, c2, nd, sA, sB, _, _) in REGLAS:
        for ti, lst in enumerate(geo.geo[nd]):
            if len(vivos) == 0:
                break
            P = pats[vivos]
            A, B = P[:, sA], P[:, sB]
            todos = np.ones(len(vivos), dtype=bool)
            necesitan = np.zeros(len(vivos), dtype=np.int64)
            for (m, maps) in lst:
                V = np.zeros(len(vivos), dtype=np.int64)
                for (src, k, kl) in maps:
                    V |= (((B if src else A) >> k) & 1) << kl
                sin = ((P[:, 0] & m) == V) | ((P[:, 5] & m) == V)
                con = np.zeros(len(vivos), dtype=bool)
                for s in (1, 2, 3, 4, 6, 7, 8, 9):
                    con |= (P[:, s] & m) == V
                todos &= sin | con
                necesitan += ~sin
            hit = todos & (necesitan <= 1)
            if hit.any():
                if detalle:
                    for i in vivos[hit]:
                        testigo.setdefault(int(i), ((d, c, c2), geo.desplaz[ti]))
                amb[vivos[hit]] = True
                vivos = vivos[~hit]
    if detalle:
        return amb, testigo
    return amb


def prefiltro(geo, pats):
    """Filtro suficiente: ningún patrón con hormiga aparece desplazado en un mundo legal.
    Devuelve máscara de las que lo pasan (= no ambiguas seguro)."""
    pats = np.asarray(pats, dtype=np.int64)
    ok = np.ones(pats.shape[0], dtype=bool)
    for t in geo.desplaz:
        bloques = {}
        for k, (x, y) in enumerate(geo.cells):
            blk, kl = geo.loc[(x + t[0], y + t[1])]
            bloques.setdefault(blk, []).append((k, kl))
        for sA in (1, 2, 3, 4, 6, 7, 8, 9):
            A = pats[:, sA]
            todos = np.ones(len(A), dtype=bool)
            nec = np.zeros(len(A), dtype=np.int64)
            for blk, maps in bloques.items():
                m, V = 0, np.zeros(len(A), dtype=np.int64)
                for (k, kl) in maps:
                    m |= 1 << kl
                    V |= ((A >> k) & 1) << kl
                sin = ((pats[:, 0] & m) == V) | ((pats[:, 5] & m) == V)
                con = np.zeros(len(A), dtype=bool)
                for s in (1, 2, 3, 4, 6, 7, 8, 9):
                    con |= (pats[:, s] & m) == V
                todos &= sin | con
                nec += ~sin
            ok &= ~(todos & (nec <= 1))
    return ok


# ---------------- Familias ----------------

def familia_F1(geo):
    """Hormiga = un único • en una de 4 casillas; píxel = dos subconjuntos distintos del resto.
    Genera por lotes (una tupla de casillas de hormiga a la vez)."""
    n = geo.n
    for slots in itertools.permutations(range(n), 4):
        resto = [i for i in range(n) if i not in slots]
        k = len(resto)
        subs = np.zeros(1 << k, dtype=np.int64)
        for msk in range(1 << k):
            v = 0
            for j in range(k):
                if msk >> j & 1:
                    v |= 1 << resto[j]
            subs[msk] = v
        pw, pb = np.meshgrid(subs, subs, indexing="ij")
        sel = pw != pb
        pw, pb = pw[sel], pb[sel]
        pats = np.zeros((len(pw), 10), dtype=np.int64)
        for c, P in ((0, pw), (1, pb)):
            pats[:, 5 * c] = P
            for d in range(4):
                pats[:, 5 * c + 1 + d] = P | (1 << slots[d])
        yield pats


def familia_F2(geo, p):
    """Separable: p celdas de píxel (2 patrones distintos), n-p de hormiga (5 patrones distintos)."""
    n = geo.n
    q = n - p
    for zona in itertools.combinations(range(n), p):
        hz = [i for i in range(n) if i not in zona]

        def expand(msk, celdas):
            v = 0
            for j, ce in enumerate(celdas):
                if msk >> j & 1:
                    v |= 1 << ce
            return v
        pp = [expand(m, zona) for m in range(1 << p)]
        hh = [expand(m, hz) for m in range(1 << q)]
        pares = [(a, b) for a in pp for b in pp if a != b]
        for hn in hh:
            ants = list(itertools.permutations([x for x in hh if x != hn], 4))
            if not ants:
                continue
            ants = np.array(ants, dtype=np.int64)
            for (a, b) in pares:
                pats = np.zeros((len(ants), 10), dtype=np.int64)
                for c, P in ((0, a), (1, b)):
                    pats[:, 5 * c] = P | hn
                    for d in range(4):
                        pats[:, 5 * c + 1 + d] = P | ants[:, d]
                yield pats


# ---------------- Métricas y simetrías ----------------

def popcount(x):
    return bin(int(x)).count("1")


def simetrias(geo):
    """Transformaciones del bloque que preservan la red: (perm de celdas, perm de direcciones, invierte_orientación)."""
    if not geo.es_rect():
        return [(list(range(geo.n)), [0, 1, 2, 3], False)]
    w, h = geo.vR[0], geo.vD[1]
    idx = {c: i for i, c in enumerate(geo.cells)}
    ops = []
    # (f celda, f dirección, invierte)
    cand = [
        (lambda x, y: (x, y), [U, L, D, R], False),
        (lambda x, y: (w - 1 - x, h - 1 - y), [D, R, U, L], False),       # rot 180
        (lambda x, y: (w - 1 - x, y), [U, R, D, L], True),                # espejo horizontal
        (lambda x, y: (x, h - 1 - y), [D, L, U, R], True),                # espejo vertical
    ]
    if w == h:
        cand += [
            (lambda x, y: (y, w - 1 - x), [L, D, R, U], False),            # rot 90 (antihorario en pantalla)
            (lambda x, y: (w - 1 - y, x), [R, U, L, D], False),
            (lambda x, y: (y, x), [L, U, R, D], True),                    # transpuesta
            (lambda x, y: (w - 1 - y, w - 1 - x), [R, D, L, U], True),
        ]
    for f, fd, inv in cand:
        perm = [idx[f(x, y)] for (x, y) in geo.cells]
        ops.append((perm, fd, inv))
    return ops


def transforma(pats, perm, fd, inv):
    """Aplica una simetría a los 10 patrones. Si invierte la orientación, intercambia blanco y negro
    (izquierda <-> derecha), lo que da una hormiga equivalente."""
    def mp(x):
        v = 0
        for k in range(len(perm)):
            if x >> k & 1:
                v |= 1 << perm[k]
        return v
    out = [0] * 10
    for c in (0, 1):
        c_ = 1 - c if inv else c
        out[5 * c_] = mp(pats[5 * c])
        for d in range(4):
            out[5 * c_ + 1 + fd[d]] = mp(pats[5 * c + 1 + d])
    return tuple(out)


def canonica(geo, pats, ops):
    return min(transforma(pats, *o) for o in ops)


def conserva(pats):
    return all(popcount(pats[sA]) + popcount(pats[sB]) == popcount(pats[nA]) + popcount(pats[nB])
               for (_, _, _, _, sA, sB, nA, nB) in REGLAS)


def metricas(geo, pats):
    n = geo.n
    todas = pats[0] & pats[5]
    for d in range(4):
        todas &= pats[1 + d] & pats[6 + d]
    marcas = popcount(todas)  # • presentes en los 10 estados
    dens = np.mean([popcount(p) for p in pats]) / n
    cambios = sum(popcount(pats[sA] ^ pats[nA]) + popcount(pats[sB] ^ pats[nB])
                  for (_, _, _, _, sA, sB, nA, nB) in REGLAS)
    return dict(n=n, forma=geo.nombre, conserva=conserva(pats), marcas=marcas,
                densidad=round(float(dens), 3), celdas_lhs=16 * 2 * n, celdas_cambian=cambios,
                dots_blanco=popcount(pats[0]), dots_negro=popcount(pats[5]))


def dibujo(geo, pats):
    """ASCII de los 10 estados: dos filas (blanco, negro), columnas: sin, ↑, ←, ↓, →."""
    xs = [x for x, _ in geo.cells]
    ys = [y for _, y in geo.cells]
    x0, y0 = min(xs), min(ys)
    W, H = max(xs) - x0 + 1, max(ys) - y0 + 1
    lineas = []
    for c in (0, 1):
        filas = [[] for _ in range(H)]
        for a in range(5):
            p = pats[5 * c + a]
            g = [[" "] * W for _ in range(H)]
            for k, (x, y) in enumerate(geo.cells):
                g[y - y0][x - x0] = "•" if p >> k & 1 else "·"
            for r in range(H):
                filas[r].append("".join(g[r]))
        cab = ("blanco" if c == 0 else "negro ").ljust(7)
        enc = " " * 7 + "   ".join(s.ljust(W) for s in ["-", "↑", "←", "↓", "→"])
        if c == 0:
            lineas.append(enc)
        for r in range(H):
            lineas.append((cab if r == 0 else " " * 7) + "   ".join(filas[r]))
    return "\n".join(lineas)
