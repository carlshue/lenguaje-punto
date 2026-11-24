"""Clasificación de los sistemas en grupos entrópicos y de comportamiento, y rasgos de las reglas que los explican."""
import json, sqlite3, os
from collections import Counter, defaultdict
import numpy as np

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sistemas.sqlite")
INITS = ["sopa", "mancha", "punto"]
BAJA, ALTA = 0.2, 0.7          # H3 en bits por celda: < 0,2 ordenado; ≥ 0,7 casi ruido


def nivel(h):
    return "baja" if h < BAJA else ("alta" if h >= ALTA else "media")


def comportamiento(H, D, act, periodo, dx, dy, densf):
    if max(H) - min(H) < 1e-4 and max(D) - min(D) < 1e-4 and act == 0:
        return "inerte"
    if densf == 0:
        return "muere"
    if densf == 1:
        return "se llena"
    if periodo == 1 and dx == 0 and dy == 0:
        return "se congela"
    if periodo and (dx or dy):
        return "se desplaza"
    if periodo:
        return "oscila"
    return "sigue activo"


def forma_curva(H):
    """Cómo evoluciona la entropía: sube, baja, sube y baja, baja y sube, estable."""
    H = np.array(H); d = H[-1] - H[0]; pico = H.max() - max(H[0], H[-1]); valle = min(H[0], H[-1]) - H.min()
    if pico > 0.1:
        return "sube y baja"
    if valle > 0.1:
        return "baja y sube"
    if d > 0.05:
        return "sube"
    if d < -0.05:
        return "baja"
    return "estable"


def rasgos(lhs, rhs):
    """Rasgos de la regla base (sin simetría) que pueden explicar su comportamiento."""
    pon = sum(1 for l, r in zip(lhs, rhs) if r == 1 and l != 1)
    qui = sum(1 for l, r in zip(lhs, rhs) if r == 2 and l != 2)
    seguro_pon = sum(1 for l, r in zip(lhs, rhs) if r == 1 and l == 2)
    seguro_qui = sum(1 for l, r in zip(lhs, rhs) if r == 2 and l == 1)
    ciegas = sum(1 for l, r in zip(lhs, rhs) if r and l == 0)
    return dict(
        pone=pon, quita=qui,
        tipo=("solo crea" if pon and not qui else "solo destruye" if qui and not pon else "crea y destruye"),
        conservativa=(ciegas == 0 and seguro_pon == seguro_qui and seguro_pon > 0),
        necesita_punto=any(l == 1 for l in lhs),
        necesita_vacio=any(l == 2 for l in lhs),
        escribe_a_ciegas=ciegas > 0,
    )


def cargar():
    con = sqlite3.connect(DB, timeout=120); con.row_factory = sqlite3.Row
    out = []
    for r in con.execute("SELECT * FROM sistemas"):
        d = dict(r)
        d["lhs"] = json.loads(d["lhs"]); d["rhs"] = json.loads(d["rhs"])
        d.update(rasgos(d["lhs"], d["rhs"]))
        for i in INITS:
            H = json.loads(d[f"{i}_H"]); D = json.loads(d[f"{i}_dens"])
            d[f"{i}_curva"] = forma_curva(H)
            d[f"{i}_comp"] = comportamiento(H, D, d[f"{i}_act"], d[f"{i}_periodo"], d[f"{i}_dx"], d[f"{i}_dy"], d[f"{i}_densf"])
            d[f"{i}_grupo"] = f"{nivel(H[0])} → {nivel(H[-1])}"
            d[f"{i}_Hmax"] = max(H)
        out.append(d)
    return out


def tabla_cruzada(S, fila, col):
    c = Counter((s[fila], s[col]) for s in S)
    filas = sorted({k[0] for k in c}); cols = sorted({k[1] for k in c})
    return filas, cols, c


if __name__ == "__main__":
    import sys
    S = cargar()
    print(len(S), "sistemas;", Counter(s["origen"] for s in S))
    for i in INITS:
        print(f"\n=== {i}: grupo entrópico × comportamiento")
        f, c, t = tabla_cruzada(S, f"{i}_grupo", f"{i}_comp")
        print(" " * 16 + "".join(f"{x[:12]:>13s}" for x in c))
        for a in f:
            print(f"{a:16s}" + "".join(f"{t[(a, b)]:13d}" for b in c))
    print("\n=== firma (sopa | mancha | punto): las 15 más frecuentes")
    firmas = Counter((s["sopa_grupo"].split(" → ")[1], s["mancha_grupo"].split(" → ")[1], s["punto_grupo"].split(" → ")[1]) for s in S)
    for k, v in firmas.most_common(15):
        print(f"  {k}: {v}")
    print("\n=== rasgos de la regla por grupo (sopa)")
    for g in sorted({s["sopa_grupo"] for s in S}):
        G = [s for s in S if s["sopa_grupo"] == g]
        print(f"  {g} ({len(G)}): ", dict(Counter(s["tipo"] for s in G)), "conservativas:", sum(s["conservativa"] for s in G))
    for i in ["mancha", "punto"]:
        print(f"\n=== rasgos de la regla por grupo ({i})")
        for g in sorted({s[f"{i}_grupo"] for s in S}):
            G = [s for s in S if s[f"{i}_grupo"] == g]
            print(f"  {g} ({len(G)}): ", dict(Counter(s["tipo"] for s in G)),
                  "LHS sin •:", sum(not s["necesita_punto"] for s in G), "a ciegas:", sum(s["escribe_a_ciegas"] for s in G))
