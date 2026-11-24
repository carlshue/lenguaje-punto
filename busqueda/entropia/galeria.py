"""Selección de representantes por grupo, tiras de evolución (figuras) y exportación al editor (../../sistemas.js)."""
import json, os
from collections import defaultdict
import numpy as np
from analizar import cargar, INITS
from motor import Lote, iniciales, desempaquetar, N
from reglas import variantes

AQUI = os.path.dirname(os.path.abspath(__file__))


def representantes(S, por_celda=2):
    """Para cada condición inicial, grupo entrópico y comportamiento (salvo inerte): las reglas más cortas,
    desempatando por el cambio de entropía más grande. Es el espíritu busy beaver: la regla mínima que hace X."""
    rep = defaultdict(list)
    for i in INITS:
        celdas = defaultdict(list)
        for s in S:
            if s[f"{i}_comp"] == "inerte":
                continue
            celdas[(s[f"{i}_grupo"], s[f"{i}_comp"])].append(s)
        for (g, c), L in celdas.items():
            dh = lambda s: abs(s[f"{i}_Hf"] - json.loads(s[f"{i}_H"])[0])
            L.sort(key=lambda s: (s["tamano"], -dh(s)))
            rep[i] += [(g, c, s) for s in L[:por_celda]]
    return rep


def busy_beaver(S, init):
    """Para cada tamaño de regla, la que más entropía deja (y la que alcanza el máximo en algún momento)."""
    por = defaultdict(list)
    for s in S:
        por[s["tamano"]].append(s)
    out = []
    for t in sorted(por):
        a = max(por[t], key=lambda s: s[f"{init}_Hf"])
        b = max(por[t], key=lambda s: s[f"{init}_Hmax"])
        out.append((t, len(por[t]), a, b))
    return out


def tira(s, init, tiempos=(0, 4, 16, 64, 128)):
    """Estados del mundo en los tiempos pedidos."""
    vs = variantes(s["lhs"], s["rhs"], s["sym"])
    L = Lote([vs]); W = iniciales(1)[init]
    out = {}
    for t in range(max(tiempos) + 1):
        if t in tiempos:
            out[t] = desempaquetar(W)[0]
        W = L.paso(W)
    return out


def exportar(elegidos, ruta=os.path.join(AQUI, "..", "..", "sistemas.js")):
    """elegidos: lista de (id, nombre, desc, sistema, init)."""
    I = iniciales(1)
    iniciales_bits = {k: "".join(map(str, desempaquetar(v)[0].ravel().tolist())) for k, v in I.items()}
    datos = [dict(id=i, nombre=n, desc=d, lhs=list(s["lhs"]), rhs=list(s["rhs"]), sym=s["sym"], init=ini)
             for (i, n, d, s, ini) in elegidos]
    js = ("/* Generado por busqueda/entropia/galeria.py: sistemas de una regla clasificados por entropía. No editar a mano. */\n"
          "(function (global) {\n  const SISTEMAS = " + json.dumps(dict(n=N, iniciales=iniciales_bits, sistemas=datos), ensure_ascii=False) + ";\n"
          "  if (typeof module !== \"undefined\" && module.exports) module.exports = SISTEMAS;\n"
          "  else global.PuntoSistemas = SISTEMAS;\n})(typeof window !== \"undefined\" ? window : globalThis);\n")
    open(ruta, "w", encoding="utf-8").write(js)


def dibuja_regla(s):
    """ASCII de la regla base: LHS ~> RHS (· vacío, • punto, _ cualquiera / no tocar)."""
    L = {0: "_", 1: "•", 2: "·"}; R = {0: "_", 1: "•", 2: "·"}
    filas = []
    for y in range(3):
        a = "".join(L[s["lhs"][y * 3 + x]] for x in range(3))
        b = "".join(R[s["rhs"][y * 3 + x]] for x in range(3))
        filas.append(f"{a}  {'~>' if y == 1 else '  '}  {b}")
    return "\n".join(filas) + f"   [{s['sym']}]"


def seleccion(S):
    """Los más interesantes: el representante mínimo de cada (condición inicial, grupo, comportamiento),
    sin los triviales (muere / se llena), y el «busy beaver» de cada tamaño desde la mancha y desde el punto."""
    elegidos = []; vistos = set()
    NOM = {"sopa": "sopa", "mancha": "mancha", "punto": "un •"}

    def desc(s, init):
        H = json.loads(s[f"{init}_H"])
        return (f"Una regla de {s['tamano']} celdas con simetría «{s['sym']}», modo par-skip, toro de 64×64, empezando desde {NOM[init]}. "
                f"Entropía H3 (bits por celda, 0 = orden, 1 = ruido): {H[0]:.2f} al principio, {H[4]:.2f} en el paso 8, "
                f"{H[6]:.2f} en el 32 y {H[-1]:.2f} en el 128. Comportamiento final: {s[init + '_comp']}. "
                f"Sobre las otras condiciones iniciales: sopa {s['sopa_grupo']}, mancha {s['mancha_grupo']}, punto {s['punto_grupo']}.")
    rep = representantes(S, 1)
    for init in INITS:
        for g, c, s in rep[init]:
            if c in ("muere", "se llena") or (init, s["clave"]) in vistos:
                continue
            vistos.add((init, s["clave"]))
            elegidos.append((f"ent-{init}-{len(elegidos)}", f"Entropía · {NOM[init]} · {g} · {c} ({s['tamano']} celdas)", desc(s, init), s, init))
    for init in ["mancha", "punto"]:
        for t, n, a, b in busy_beaver(S, init):
            if t < 2 or (init, a["clave"]) in vistos or a[f"{init}_Hf"] < 0.2:
                continue
            vistos.add((init, a["clave"]))
            elegidos.append((f"bb-{init}-{t}", f"Busy beaver · {NOM[init]} · {t} celdas: H final {a[init + '_Hf']:.2f}",
                             "La regla de este tamaño que más entropía deja tras 128 pasos. " + desc(a, init), a, init))
    return elegidos


if __name__ == "__main__":
    import sys
    S = cargar()
    if len(sys.argv) > 1 and sys.argv[1] == "exportar":
        el = seleccion(S); exportar(el)
        print(f"{len(el)} sistemas exportados de {len(S)} explorados")
        sys.exit(0)
    rep = representantes(S, 1)
    for i in INITS:
        print(f"\n######## {i}")
        for g, c, s in rep[i]:
            print(f"\n{g} · {c} · tamaño {s['tamano']} · H {json.loads(s[i + '_H'])[0]:.2f} -> {s[i + '_Hf']:.2f}")
            print(dibuja_regla(s))
    for init in ["punto", "mancha"]:
        print(f"\n######## busy beaver ({init}): por tamaño, la regla que más entropía deja")
        for t, n, a, b in busy_beaver(S, init):
            print(f"tamaño {t} ({n} sistemas): H final máx {a[init + '_Hf']:.3f} · H máx en el camino {b[init + '_Hmax']:.3f}")
