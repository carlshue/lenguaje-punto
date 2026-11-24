"""Muestreo de sistemas de 2 a 16 reglas 3×3 de órdenes distintos. Uso: python explorar_multi.py MINUTOS
Todo queda en multi.sqlite (con registro de visitados); cada 10 minutos se reexportan los más interesantes."""
import json, os, sys, time, random, sqlite3, subprocess
from multiprocessing import Pool
from explorar import medir, INITS
from multi import sistema_aleatorio, variantes_literal, clave_sistema, descriptores

AQUI = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(AQUI, "multi.sqlite")
LOTE = 128
DESC = ["k", "simetria", "nP", "nC", "nM", "combo", "mod_total", "carga_total", "balance_literal", "balance_real", "ciegas"]
MED = [("H", "TEXT"), ("C", "TEXT"), ("dens", "TEXT"), ("Hf", "REAL"), ("Cf", "REAL"), ("densf", "REAL"),
       ("act", "REAL"), ("periodo", "INTEGER"), ("dx", "INTEGER"), ("dy", "INTEGER"), ("conserva", "INTEGER")]


def abrir():
    con = sqlite3.connect(DB, timeout=120)
    con.execute("PRAGMA journal_mode=WAL")
    cols = ", ".join([f"{d} {'TEXT' if d == 'combo' else 'INTEGER'}" for d in DESC] +
                     [f"{i}_{m} {t}" for i in INITS for m, t in MED])
    con.execute(f"CREATE TABLE IF NOT EXISTS sistemas (clave TEXT PRIMARY KEY, reglas TEXT, {cols})")
    return con


def simular(lote, gpu=False):
    """lote: lista de (clave, reglas, con_sim)."""
    listas = [[v for (l, r, s) in reglas for v in variantes_literal(l, r, s)] for (_, reglas, _) in lote]
    if gpu:
        import motor_gpu
        medidas = motor_gpu.medir(listas)
    else:
        medidas = medir(listas)
    filas = []
    for (k, reglas, cs), m in zip(lote, medidas):
        d = descriptores(reglas, cs)
        filas.append([k, json.dumps([dict(lhs=l, rhs=r, sym=s) for (l, r, s) in reglas])] + [d[x] for x in DESC] + m)
    return filas


def lotes_gpu(rng, visitados, limite, lote=768, reserva=4):
    """Genera reserva·lote sistemas nuevos, los ordena por número de variantes y los parte en lotes:
    así cada lote se dimensiona por sistemas parecidos y no se calcula relleno."""
    while time.time() < limite:
        pool = []
        while len(pool) < lote * reserva:
            reglas, cs = sistema_aleatorio(rng)
            k = clave_sistema(reglas)
            if k in visitados:
                continue
            visitados.add(k); pool.append((k, reglas, cs))
        nv = lambda x: sum(len(variantes_literal(*r)) for r in x[1])
        pool.sort(key=nv)
        # presupuesto de memoria: sistemas × variantes del mayor ≤ 768 × 12 (≈ 6 GB en la GPU)
        actual = []
        for x in pool:
            if actual and (len(actual) + 1) * nv(x) > 768 * 12:
                yield actual; actual = []
                if time.time() > limite:
                    return
            actual.append(x)
        if actual:
            yield actual


def main():
    limite = time.time() + 60 * float(sys.argv[1])
    con = abrir()
    visitados = {r[0] for r in con.execute("SELECT clave FROM sistemas")}
    print(f"{len(visitados)} sistemas ya visitados", flush=True)
    rng = random.Random(time.time_ns())

    def lotes():
        while time.time() < limite:
            lote = []
            while len(lote) < LOTE:
                reglas, cs = sistema_aleatorio(rng)
                k = clave_sistema(reglas)
                if k in visitados:
                    continue
                visitados.add(k); lote.append((k, reglas, cs))
            yield lote

    nproc = int(os.environ.get("PROCESOS", 8)); t0 = time.time(); n = 0; ultima = 0
    if os.environ.get("GPU", "1") == "1":
        import torch
        if torch.cuda.is_available():
            print("usando GPU:", torch.cuda.get_device_name(0), flush=True)
            for grande in lotes_gpu(rng, visitados, limite):
                filas = simular(grande, gpu=True)
                con.executemany(f"INSERT OR IGNORE INTO sistemas VALUES ({','.join('?' * len(filas[0]))})", filas)
                con.commit(); n += len(filas)
                print(f"{n} sistemas nuevos, {n / (time.time() - t0):.1f}/s", flush=True)
                if time.time() - ultima > 600:
                    ultima = time.time()
                    subprocess.Popen([sys.executable, "galeria_multi.py", "exportar"], cwd=AQUI,
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"Fin: {n} nuevos", flush=True)
            return
    with Pool(nproc) as pool:
        pend = []; gen = lotes(); agotado = False
        while True:
            while not agotado and len(pend) < 2 * nproc:
                try:
                    pend.append(pool.apply_async(simular, (next(gen),)))
                except StopIteration:
                    agotado = True
            if not pend:
                break
            filas = pend.pop(0).get()
            con.executemany(f"INSERT OR IGNORE INTO sistemas VALUES ({','.join('?' * len(filas[0]))})", filas)
            con.commit(); n += len(filas)
            print(f"{n} sistemas nuevos, {n / (time.time() - t0):.1f}/s", flush=True)
            if time.time() - ultima > 600:
                ultima = time.time()
                subprocess.Popen([sys.executable, "galeria_multi.py", "exportar"], cwd=AQUI,
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Fin: {n} nuevos", flush=True)


if __name__ == "__main__":
    main()
