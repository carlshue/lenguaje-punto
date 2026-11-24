"""Clasificación y selección de sistemas de varias reglas; exportación a ../../sistemas_multi.js."""
import json, os, sqlite3, sys
from collections import Counter, defaultdict
from analizar import nivel, comportamiento, forma_curva, INITS
from motor import iniciales, desempaquetar, N

AQUI = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(AQUI, "multi.sqlite")
NOM = {"sopa": "sopa", "mancha": "mancha", "punto": "un •"}
NOMBRE_COMBO = {"P+C": "productivas + consumidoras", "P+M": "productivas + movedoras",
                "C+M": "consumidoras + movedoras", "P+C+M": "los tres órdenes"}


def cargar():
    con = sqlite3.connect(DB, timeout=120); con.row_factory = sqlite3.Row
    S = []
    for r in con.execute("SELECT * FROM sistemas"):
        d = dict(r); d["reglas"] = json.loads(d["reglas"])
        for i in INITS:
            H = json.loads(d[f"{i}_H"]); D = json.loads(d[f"{i}_dens"])
            d[f"{i}_comp"] = comportamiento(H, D, d[f"{i}_act"], d[f"{i}_periodo"], d[f"{i}_dx"], d[f"{i}_dy"], d[f"{i}_densf"])
            d[f"{i}_grupo"] = f"{nivel(H[0])} → {nivel(H[-1])}"
            d[f"{i}_curva"] = forma_curva(H)
        S.append(d)
    return S


def interes(s, i):
    """Cambia de grupo entrópico o queda activo en entropía intermedia; nunca trivial."""
    c = s[f"{i}_comp"]
    if c in ("inerte", "muere", "se llena"):
        return 0
    ini, fin = s[f"{i}_grupo"].split(" → ")
    H = json.loads(s[f"{i}_H"])
    salto = abs(H[-1] - H[0])
    activo = 1 if c == "sigue activo" else 0
    return (ini != fin) * 1 + activo * 0.5 + salto


def desc(s, i):
    H = json.loads(s[f"{i}_H"])
    return (f"{s['k']} reglas 3×3 ({s['nP']} productivas, {s['nC']} consumidoras, {s['nM']} movedoras), "
            f"{'con' if s['simetria'] else 'sin'} simetría; módulo total {s['mod_total']}, carga total {s['carga_total']}, "
            f"balance literal {s['balance_literal']:+d} y real {s['balance_real']:+d}. Modo par-skip, toro 64×64, empezando desde {NOM[i]}. "
            f"Entropía H3: {H[0]:.2f} → {H[4]:.2f} (paso 8) → {H[6]:.2f} (32) → {H[-1]:.2f} (128). Final: {s[i + '_comp']}. "
            f"Otras condiciones: sopa {s['sopa_grupo']}, mancha {s['mancha_grupo']}, punto {s['punto_grupo']}.")


def seleccion(S, por_celda=2):
    el = []; vistos = set()
    celdas = defaultdict(list)
    for s in S:
        for i in INITS:
            sc = interes(s, i)
            if sc > 0.3:
                celdas[(s["combo"], s["simetria"], i, s[f"{i}_grupo"])].append((sc, s))
    for key in sorted(celdas):
        combo, sim, i, g = key
        L = sorted(celdas[key], key=lambda x: (-x[0], x[1]["k"]))
        for sc, s in L[:por_celda]:
            if (s["clave"], i) in vistos:
                continue
            vistos.add((s["clave"], i))
            el.append(dict(id=f"multi-{len(el)}", init=i, reglas=s["reglas"], desc=desc(s, i),
                           nombre=f"Órdenes · {combo} · {'sim' if sim else 'sin sim'} · {NOM[i]} · {g} · {s[i + '_comp']} ({s['k']} reglas)"))
    return el


def exportar(el):
    I = iniciales(1)
    bits = {k: "".join(map(str, desempaquetar(v)[0].ravel().tolist())) for k, v in I.items()}
    js = ("/* Generado por busqueda/entropia/galeria_multi.py: sistemas de varias reglas por orden. No editar a mano. */\n"
          "(function (global) {\n  const SISTEMAS_MULTI = " + json.dumps(dict(n=N, iniciales=bits, sistemas=el), ensure_ascii=False) + ";\n"
          "  if (typeof module !== \"undefined\" && module.exports) module.exports = SISTEMAS_MULTI;\n"
          "  else global.PuntoSistemasMulti = SISTEMAS_MULTI;\n})(typeof window !== \"undefined\" ? window : globalThis);\n")
    open(os.path.join(AQUI, "..", "..", "sistemas_multi.js"), "w", encoding="utf-8").write(js)


if __name__ == "__main__":
    S = cargar()
    if len(sys.argv) > 1 and sys.argv[1] == "exportar":
        el = seleccion(S); exportar(el)
        print(f"{len(el)} sistemas exportados de {len(S)}")
