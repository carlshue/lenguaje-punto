"""Reglas de una sola ventana (hasta 3×3) con simetrías, y su forma canónica.

Convenciones del editor:
  LHS por celda: 0 cualquiera, 1 •, 2 vacío.   RHS por celda: 0 no tocar, 1 poner •, 2 vaciar.
Una regla se guarda como dos tuplas de 9 valores (3×3, fila a fila) más la simetría.

Forma canónica (para no visitar dos veces el mismo sistema):
  1. Las escrituras que no cambian nada (LHS • y RHS •, o LHS vacío y RHS vaciar) se quitan.
  2. Se generan las variantes de la simetría y se normalizan por traslación: como la regla puede encajar en
     cualquier sitio, dos variantes iguales salvo desplazamiento son la misma.
  3. El sistema entero girado o reflejado es el mismo sistema visto de lado: se toma el mínimo sobre las 8
     transformaciones del cuadrado.
"""
import random

SIMS = {
    "none": ["id"],
    "rot": ["id", "r90", "r180", "r270"],
    "mirror": ["id", "mx"],
    "mirrorv": ["id", "my"],
    "all": ["id", "r90", "r180", "r270", "mx", "my", "d1", "d2"],
}
T = {
    "id": lambda x, y: (x, y), "r90": lambda x, y: (-y, x), "r180": lambda x, y: (-x, -y),
    "r270": lambda x, y: (y, -x), "mx": lambda x, y: (-x, y), "my": lambda x, y: (x, -y),
    "d1": lambda x, y: (y, x), "d2": lambda x, y: (-y, -x),
}
D8 = list(T.values())


def celdas(lhs, rhs):
    """Celdas relevantes (dx, dy, l, r) con coordenadas relativas al centro de la ventana 3×3."""
    out = []
    for i in range(9):
        l, r = lhs[i], rhs[i]
        if (l == 1 and r == 1) or (l == 2 and r == 2):
            r = 0
        if l == 0 and r == 0:
            continue
        out.append((i % 3 - 1, i // 3 - 1, l, r))
    return out


def norm(cs):
    mx = min(c[0] for c in cs); my = min(c[1] for c in cs)
    return tuple(sorted((x - mx, y - my, l, r) for (x, y, l, r) in cs))


def variantes(lhs, rhs, sym):
    """Lista de variantes normalizadas y sin duplicados. Vacía si la regla no escribe nada."""
    cs = celdas(lhs, rhs)
    if not any(c[3] for c in cs):
        return []
    vs = set()
    for tn in SIMS[sym]:
        t = T[tn]
        vs.add(norm([(*t(x, y), l, r) for (x, y, l, r) in cs]))
    return sorted(vs)


def clave(vs):
    """Clave canónica del sistema (conjunto de variantes) módulo giros y espejos globales."""
    mejores = []
    for t in D8:
        g = sorted(norm([(*t(x, y), l, r) for (x, y, l, r) in v]) for v in vs)
        mejores.append(tuple(g))
    m = min(mejores)
    return ";".join(".".join(f"{x}{y}{l}{r}" for (x, y, l, r) in v) for v in m)


def tamano(lhs, rhs):
    """Celdas especificadas de la regla (las que no son «cualquiera / no tocar»)."""
    return len(celdas(lhs, rhs))


def aleatoria(rng, ventana=(3, 3), p_vacia=0.35):
    """Regla aleatoria dentro de una ventana w×h (alineada arriba a la izquierda del 3×3).
    p_vacia: probabilidad de que una celda sea cualquiera/no tocar, para no sesgar hacia reglas enormes."""
    w, h = ventana
    lhs = [0] * 9; rhs = [0] * 9
    for y in range(h):
        for x in range(w):
            i = y * 3 + x
            if rng.random() < p_vacia:
                continue
            lhs[i] = rng.randrange(3); rhs[i] = rng.randrange(3)
    sym = rng.choice(list(SIMS))
    return tuple(lhs), tuple(rhs), sym


def todas(ventana):
    """Todas las reglas de una ventana w×h (9^(w·h) × 5 simetrías)."""
    import itertools
    w, h = ventana
    idx = [y * 3 + x for y in range(h) for x in range(w)]
    for combo in itertools.product(range(9), repeat=len(idx)):
        lhs = [0] * 9; rhs = [0] * 9
        for i, c in zip(idx, combo):
            lhs[i], rhs[i] = divmod(c, 3)
        for sym in SIMS:
            yield tuple(lhs), tuple(rhs), sym


def normalizada(lhs, rhs):
    """LHS/RHS sin escrituras que no cambian nada (lo que se exporta al editor)."""
    r = list(rhs)
    for i in range(9):
        if (lhs[i] == 1 and r[i] == 1) or (lhs[i] == 2 and r[i] == 2):
            r[i] = 0
    return tuple(lhs), tuple(r)
