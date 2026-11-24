"""Elige los ganadores del cribado y escribe ../ganadores.js (datos que examples.js convierte en reglas)."""
import json
from codigos import *
from cribar import cargar, tabla, geo_de

# Rango de la hormiga de Carlos (izquierda sobre blanco) en 12.000 pasos desde (0, 0): x ∈ [-29, 57], y ∈ [-22, 34]
NA, NB, A0, B0 = 92, 60, 32, 24   # rejilla de bloques y bloque inicial

def disposicion(geo):
    """Tamaño del mundo y origen para que quepan los bloques (a, b) ∈ [0, NA) × [0, NB)."""
    pts = [(a * geo.vR[0] + b * geo.vD[0] + x, a * geo.vR[1] + b * geo.vD[1] + y)
           for a in (0, NA - 1) for b in (0, NB - 1) for (x, y) in geo.cells]
    x0, y0 = min(p[0] for p in pts), min(p[1] for p in pts)
    x1, y1 = max(p[0] for p in pts), max(p[1] for p in pts)
    return dict(w=x1 - x0 + 1, h=y1 - y0 + 1, ox=-x0, oy=-y0)

def red_editor(geo, lay):
    if geo.es_rect():
        return dict(type="rect", px=geo.vR[0], py=geo.vD[1], ox=lay["ox"] % geo.vR[0], oy=lay["oy"] % geo.vD[1], m=2, n=5, k=0)
    # cruz: centros en (x + 2y) mod 5 = k
    k = (lay["ox"] + 2 * lay["oy"]) % 5
    return dict(type="diag", px=3, py=2, ox=0, oy=0, m=2, n=5, k=k)

def entrada(id_, nombre, desc, m, p, g):
    lay = disposicion(g)
    return dict(id=id_, nombre=nombre, desc=desc, forma=g.nombre, cells=[list(c) for c in g.cells],
                R=list(g.vR), D=list(g.vD), pats=list(p), na=NA, nb=NB, a0=A0, b0=B0,
                world=dict(w=lay["w"], h=lay["h"]), origen=[lay["ox"], lay["oy"]], lattice=red_editor(g, lay),
                metricas={k: m[k] for k in ("n", "conserva", "marcas", "densidad", "celdas_lhs", "celdas_cambian", "simetrias")})

if __name__ == "__main__":
    lotes = cargar()
    elegidos = [
        ("auto4", "Hormiga autolocalizable mínima (4 celdas)",
         "Bloque 1×4: la celda de arriba es el píxel (• negro) y las 3 de abajo codifican la hormiga (5 códigos de 3 bits). "
         "4 celdas es el mínimo absoluto: 10 estados distintos necesitan 4 bits. Las 16 reglas NO están ancladas y aun así solo "
         "encajan en la posición real: el LHS incluye el bloque destino y ningún desplazamiento de un mundo legal lo reproduce. "
         "No conserva los •.",
         lambda m: m["n"] == 4),
        ("auto5c", "Hormiga autolocalizable que conserva los • (5 celdas)",
         "La mínima que además conserva el número de • (con 4 celdas es imposible: harían falta 8 patrones con el mismo número de •). "
         "Cada bloque tiene exactamente 2 •: los 10 estados son los 10 pares de celdas posibles. 16 reglas sin anclaje; solo encajan en la posición real.",
         lambda m: m["n"] == 5 and m["conserva"] and m["forma"] == "1x5"),
        ("auto6f1", "Hormiga autolocalizable estilo • único (6 celdas)",
         "Familia F1: la hormiga es un único • en una de 4 casillas y el píxel es un patrón del resto, con un • fijo de marca. "
         "Con esta restricción el mínimo sin anclaje es 6 (con anclaje bastaban 5).",
         lambda m: m["familia"] == "F1" and m["n"] == 6),
        ("auto7f1c", "Hormiga autolocalizable estilo • único que conserva (7 celdas)",
         "Familia F1 y además conserva los •. Mínimo 7 (con anclaje bastaban 6): en F1 la autolocalización y la conservación cuestan 1 celda cada una.",
         lambda m: m["familia"] == "F1" and m["conserva"]),
    ]
    out = []
    for id_, nombre, desc, filt in elegidos:
        m, p, g = tabla(lotes, filt, 1)[0]
        print(id_, g.nombre, p, m)
        out.append(entrada(id_, nombre, desc, m, p, g))
    js = ("/* Generado por busqueda/exportar.py: codificaciones autolocalizables de la hormiga. No editar a mano. */\n"
          "(function (global) {\n  const GANADORES = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n"
          "  if (typeof module !== \"undefined\" && module.exports) module.exports = GANADORES;\n"
          "  else global.PuntoGanadores = GANADORES;\n})(typeof window !== \"undefined\" ? window : globalThis);\n")
    open("../ganadores.js", "w", encoding="utf-8").write(js)
