"""Sistemas de varias reglas 3×3 clasificadas por orden, módulo y carga.

Definiciones (de Carlos), con conteo LITERAL de •:
  n_lhs = • escritos en el LHS (celdas «•»);  n_rhs = • escritos en el RHS (celdas «poner •»).
  m = n_rhs - n_lhs
  orden: productiva (m > 0), consumidora (m < 0), movedora (m = 0)
  módulo = |m|
  carga = 2·min(n_lhs, n_rhs) + |m| = n_lhs + n_rhs   (todos los • escritos en la regla)

Como el conteo es literal, las reglas se simulan tal cual se escriben (sin quitar escrituras que no cambian nada),
igual que el editor. Aparte se calcula el balance REAL de cada regla:
  real_pon = celdas vacío -> •,  real_qui = celdas • -> vaciar,  ciegas = escrituras sobre «cualquiera».
"""
import random
from reglas import SIMS, T, D8

ORDENES = ("P", "C", "M")  # productiva, consumidora, movedora
NOMBRE = {"P": "productiva", "C": "consumidora", "M": "movedora"}


def clasificar(lhs, rhs):
    nl = sum(1 for x in lhs if x == 1); nr = sum(1 for x in rhs if x == 1)
    m = nr - nl
    return dict(orden="P" if m > 0 else "C" if m < 0 else "M", modulo=abs(m), carga=nl + nr, n_lhs=nl, n_rhs=nr,
                real_pon=sum(1 for l, r in zip(lhs, rhs) if l == 2 and r == 1),
                real_qui=sum(1 for l, r in zip(lhs, rhs) if l == 1 and r == 2),
                ciegas=sum(1 for l, r in zip(lhs, rhs) if l == 0 and r != 0))


def efectiva(lhs, rhs):
    """Escribe algo que puede cambiar el mundo."""
    return any((r == 1 and l != 1) or (r == 2 and l != 2) for l, r in zip(lhs, rhs))


def _norm(cs):
    mx = min(c[0] for c in cs); my = min(c[1] for c in cs)
    return tuple(sorted((x - mx, y - my, l, r) for (x, y, l, r) in cs))


def variantes_literal(lhs, rhs, sym):
    """Variantes como las compila el editor: todas las celdas con algo (también escrituras sin efecto),
    sin duplicados salvo traslación."""
    cs = [(i % 3 - 1, i // 3 - 1, lhs[i], rhs[i]) for i in range(9) if lhs[i] or rhs[i]]
    vs = set()
    for tn in SIMS[sym]:
        t = T[tn]
        vs.add(_norm([(*t(x, y), l, r) for (x, y, l, r) in cs]))
    return sorted(vs)


def clave_sistema(reglas):
    """Clave canónica: conjunto de reglas (cada una, su conjunto de variantes) módulo giros/espejos globales.
    El orden de las reglas no importa en par-skip."""
    vss = [variantes_literal(*r) for r in reglas]
    mejor = None
    for t in D8:
        g = sorted(tuple(sorted(_norm([(*t(x, y), l, r) for (x, y, l, r) in v]) for v in vs)) for vs in vss)
        if mejor is None or g < mejor:
            mejor = g
    return "|".join(";".join(".".join(f"{x}{y}{l}{r}" for (x, y, l, r) in v) for v in vs) for vs in mejor)


def regla_de_orden(rng, orden, sym):
    """Regla 3×3 aleatoria del orden pedido (por rechazo), que escribe algo efectivo."""
    while True:
        p = rng.choice([0.2, 0.4, 0.6])  # probabilidad de que una celda quede «cualquiera / no tocar»
        lhs = [0] * 9; rhs = [0] * 9
        for i in range(9):
            if rng.random() < p:
                continue
            lhs[i] = rng.randrange(3); rhs[i] = rng.randrange(3)
        if efectiva(lhs, rhs) and clasificar(lhs, rhs)["orden"] == orden:
            return tuple(lhs), tuple(rhs), sym


def sistema_aleatorio(rng, p_simetria=0.2):
    """Entre 2 y 16 reglas con al menos dos órdenes distintos. El 20 % de los sistemas (1 de cada 5, es decir,
    1/4 respecto a los que no la tienen) usa simetría en todas sus reglas."""
    k = rng.randint(2, 16)
    con_sim = rng.random() < p_simetria
    while True:
        ords = [rng.choice(ORDENES) for _ in range(k)]
        if len(set(ords)) >= 2:
            break
    sims = ["rot", "mirror", "mirrorv", "all"]
    return [regla_de_orden(rng, o, rng.choice(sims) if con_sim else "none") for o in ords], con_sim


def descriptores(reglas, con_sim):
    cs = [clasificar(l, r) for (l, r, s) in reglas]
    cuenta = {o: sum(c["orden"] == o for c in cs) for o in ORDENES}
    return dict(
        k=len(reglas), simetria=int(con_sim),
        nP=cuenta["P"], nC=cuenta["C"], nM=cuenta["M"],
        combo="+".join(o for o in ORDENES if cuenta[o]),
        mod_total=sum(c["modulo"] for c in cs), carga_total=sum(c["carga"] for c in cs),
        balance_literal=sum(c["n_rhs"] - c["n_lhs"] for c in cs),
        balance_real=sum(c["real_pon"] - c["real_qui"] for c in cs),
        ciegas=sum(c["ciegas"] for c in cs),
    )
