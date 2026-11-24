"""Cribado: métricas, orden (n -> conserva -> simplicidad) y dibujo ASCII de los mejores."""
import json, sys
from codigos import *

def geo_de(f):
    return cruz() if f == "cruz" else rect(*map(int, f.split("x")))

def estabilizador(geo, p):
    return sum(1 for o in simetrias(geo) if transforma(p, *o) == tuple(p))

def clave(m):
    return (m["n"], not m["conserva"], m["celdas_cambian"], m["densidad"], -m["simetrias"])

def cargar():
    lotes = []  # (familia, forma, pats)
    for f, n, p in json.load(open("res_F1_5-6-7.json")):
        lotes.append(("F1", f, p))
    for fn, fam in [("res_F2_4_p1.json", "F2")]:
        try:
            for f, n, p in json.load(open(fn)): lotes.append((fam, f, p))
        except FileNotFoundError: pass
    for fn in ["cons5_22.json"]:
        try:
            for f, L in json.load(open(fn)).items():
                for p in L: lotes.append(("general", f, p))
        except FileNotFoundError: pass
    return lotes

def tabla(lotes, filtro, k):
    G = {}
    filas = []
    for fam, f, p in lotes:
        g = G.setdefault(f, geo_de(f))
        m = metricas(g, p); m["simetrias"] = estabilizador(g, p); m["familia"] = fam
        if filtro(m): filas.append((clave(m), m, p))
    filas.sort(key=lambda r: r[0])
    return [(m, p, G[m["forma"]]) for _, m, p in filas[:k]]

if __name__ == "__main__":
    lotes = cargar()
    print(len(lotes), "codificaciones válidas cargadas")
    for titulo, filt in [
        ("n=4, general (F2)", lambda m: m["n"] == 4),
        ("n=5, conserva", lambda m: m["n"] == 5 and m["conserva"]),
        ("F1 (hormiga = un •), mínimo", lambda m: m["familia"] == "F1" and m["n"] == 6),
        ("F1 conservativa", lambda m: m["familia"] == "F1" and m["conserva"]),
    ]:
        print("\n=====", titulo)
        for m, p, g in tabla(lotes, filt, int(sys.argv[1]) if len(sys.argv) > 1 else 3):
            print({k: m[k] for k in ("familia", "forma", "conserva", "marcas", "densidad", "celdas_cambian", "simetrias", "dots_blanco", "dots_negro")}, p)
            print(dibujo(g, p))
