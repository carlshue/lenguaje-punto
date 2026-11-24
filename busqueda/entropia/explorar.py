"""Fuerza bruta de sistemas de una regla (hasta 3×3 con simetría) y medida de su entropía.

Uso:
  python explorar.py exhaustivo            # todas las reglas de 1×1, 1×2, 1×3, 2×2 y 2×3
  python explorar.py muestreo MINUTOS      # reglas 3×3 al azar hasta agotar el tiempo
Todo queda en sistemas.sqlite; un sistema ya visitado (módulo simetrías) no se vuelve a simular.
"""
import json, os, sys, time, random, sqlite3, subprocess
import numpy as np
from multiprocessing import Pool
from reglas import variantes, clave, tamano, todas, aleatoria, normalizada

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sistemas.sqlite")
T = 128
CHECK = [0, 1, 2, 4, 8, 16, 32, 64, 96, 128]
INITS = ["sopa", "mancha", "punto"]
LOTE = 256


def abrir():
    con = sqlite3.connect(DB, timeout=120)
    con.execute("PRAGMA journal_mode=WAL")  # lectores (análisis, galería) y escritor a la vez sin bloquearse
    cols = ", ".join(f"{i}_{m} {t}" for i in INITS for m, t in
                     (("H", "TEXT"), ("C", "TEXT"), ("dens", "TEXT"), ("Hf", "REAL"), ("Cf", "REAL"), ("densf", "REAL"),
                      ("act", "REAL"), ("periodo", "INTEGER"), ("dx", "INTEGER"), ("dy", "INTEGER"), ("conserva", "INTEGER")))
    con.execute(f"CREATE TABLE IF NOT EXISTS sistemas (clave TEXT PRIMARY KEY, lhs TEXT, rhs TEXT, sym TEXT, "
                f"tamano INTEGER, nvar INTEGER, origen TEXT, {cols})")
    return con


def medir(listas_variantes):
    """Simula cada sistema (lista de variantes) desde las tres condiciones iniciales y devuelve, por sistema,
    una lista con las 11 medidas de cada condición inicial (en el orden de las columnas de la base de datos)."""
    from motor import Lote, iniciales, desempaquetar, entropia_bloques, compresion, sh
    B = len(listas_variantes)
    L = Lote(list(listas_variantes) * len(INITS))
    I = iniciales(B)
    W = np.concatenate([I[i] for i in INITS])
    H, C, D = [], [], []
    ultimos = []
    conserva = np.ones(len(W), bool)

    def medir_estado(W):
        A = desempaquetar(W)
        H.append(entropia_bloques(A)); C.append(compresion(W)); D.append(A.reshape(len(W), -1).mean(1))
        return A.reshape(len(W), -1).sum(1)

    conteo0 = medir_estado(W)
    for t in range(1, T + 1):
        Wn = L.paso(W)
        if t == T:
            act = np.array([bin(int(x)).count("1") for x in (W ^ Wn).ravel()]).reshape(len(W), -1).sum(1) / 4096
        W = Wn
        if t > T - 8:
            ultimos.append(W.copy())
        if t in CHECK:
            conserva &= medir_estado(W) == conteo0
    periodo = np.zeros(len(W), int); ddx = np.zeros(len(W), int); ddy = np.zeros(len(W), int)
    for p in range(1, 8):
        prev = ultimos[-1 - p]
        for dy in range(-p, p + 1):
            for dx in range(-p, p + 1):
                igual = np.all(sh(prev, dx, dy) == W, axis=1) & (periodo == 0)
                periodo[igual] = p; ddx[igual] = dx; ddy[igual] = dy
    H, C, D = np.array(H), np.array(C), np.array(D)
    out = []
    for b in range(B):
        f = []
        for j in range(len(INITS)):
            w = j * B + b
            f += [json.dumps([round(x, 4) for x in H[:, w]]), json.dumps([round(x, 4) for x in C[:, w]]),
                  json.dumps([round(x, 4) for x in D[:, w]]), float(H[-1, w]), float(C[-1, w]), float(D[-1, w]),
                  float(act[w]), int(periodo[w]), int(ddx[w]), int(ddy[w]), int(conserva[w])]
        out.append(f)
    return out


def simular(lote):
    """lote: lista de (clave, lhs, rhs, sym, variantes). Devuelve filas para la base de datos."""
    medidas = medir([x[4] for x in lote])
    return [[k, json.dumps(lhs), json.dumps(rhs), sym, tamano(lhs, rhs), len(vs), None] + m
            for (k, lhs, rhs, sym, vs), m in zip(lote, medidas)]


def generador(modo, visitados):
    if modo == "exhaustivo":
        for vent in [(1, 1), (2, 1), (3, 1), (2, 2), (3, 2)]:
            for lhs, rhs, sym in todas(vent):
                yield (lhs, rhs, sym, f"exhaustivo {vent[0]}x{vent[1]}")
    else:
        rng = random.Random(time.time_ns())
        while True:
            lhs, rhs, sym = aleatoria(rng, (3, 3), p_vacia=rng.choice([0.1, 0.3, 0.5]))
            yield (lhs, rhs, sym, "muestreo 3x3")


def main():
    modo = sys.argv[1]
    limite = time.time() + 60 * float(sys.argv[2]) if len(sys.argv) > 2 else float("inf")
    con = abrir()
    visitados = {r[0] for r in con.execute("SELECT clave FROM sistemas")}
    print(f"{len(visitados)} sistemas ya visitados", flush=True)

    def lotes():
        lote = []; probados = 0; repetidos = 0
        for lhs, rhs, sym, origen in generador(modo, visitados):
            probados += 1
            vs = variantes(lhs, rhs, sym)
            if not vs:
                continue
            k = clave(vs)
            if k in visitados:
                repetidos += 1
                if modo == "muestreo" and repetidos % 100000 == 0:
                    print(f"  ({repetidos} candidatos repetidos)", flush=True)
                continue
            visitados.add(k)
            l, r = normalizada(lhs, rhs)
            lote.append((k, l, r, sym, vs, origen))
            if len(lote) == LOTE:
                yield lote; lote = []
            if time.time() > limite:
                break
        if lote:
            yield lote

    t0 = time.time(); n = 0
    ultima_export = 0
    nproc = int(os.environ.get("PROCESOS", 8))  # 8 núcleos físicos: con más, el ancho de banda de memoria frena
    origenes = {}
    with Pool(nproc) as pool:
        pendientes = []
        gen = lotes()
        agotado = False
        while True:
            while not agotado and len(pendientes) < 2 * nproc:
                try:
                    l = next(gen)
                except StopIteration:
                    agotado = True; break
                for x in l:
                    origenes[x[0]] = x[5]
                pendientes.append(pool.apply_async(simular, ([x[:5] for x in l],)))
            if not pendientes:
                break
            filas = pendientes.pop(0).get()
            for f in filas:
                f[6] = origenes.pop(f[0])
            con.executemany(f"INSERT OR IGNORE INTO sistemas VALUES ({','.join('?' * len(filas[0]))})", filas)
            con.commit()
            n += len(filas)
            print(f"{n} sistemas nuevos, {n / (time.time() - t0):.0f}/s", flush=True)
            if time.time() - ultima_export > 600:  # cada 10 minutos, los más interesantes al editor
                ultima_export = time.time()
                subprocess.Popen([sys.executable, "galeria.py", "exportar"], cwd=os.path.dirname(DB),
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    total = con.execute("SELECT COUNT(*) FROM sistemas").fetchone()[0]
    print(f"Fin: {n} nuevos, {total} en total", flush=True)


if __name__ == "__main__":
    main()
