"""Cifras del análisis (las usa informe.py): parálisis, rasgos por grupo, paralelismos, curvas, busy beaver."""
import json
from collections import Counter, defaultdict
import numpy as np
from analizar import cargar, INITS, rasgos
from reglas import variantes, clave
from motor import Lote, iniciales, sh, K


def paralisis(S):
    """Separa los inertes con la sopa en: paralizados por conflicto / escriben lo que ya había."""
    inertes = [s for s in S if s["sopa_comp"] == "inerte"]
    par = 0
    for i in range(0, len(inertes), 2048):
        G = inertes[i:i + 2048]
        L = Lote([variantes(s["lhs"], s["rhs"], s["sym"]) for s in G]); W = iniciales(len(G))["sopa"]
        Sx = {k: sh(W, *K[k]) for k in range(9)}
        M = []
        for v in range(L.V):
            f = L.inactiva[v] | np.zeros_like(W)
            for k in L.vk_usa[v]: f |= (Sx[k] ^ L.P[v, k]) & L.Q[v, k]
            M.append(~f)
        uno = np.zeros_like(W); dos = np.zeros_like(W)
        for v in range(L.V):
            for k in L.vk_esc[v]:
                X = sh(M[v], -K[k][0], -K[k][1]) & L.Wany[v, k]; dos |= uno & X; uno |= X
        E = uno & ~dos
        acept = np.zeros(len(G), bool); hay = np.zeros(len(G), bool)
        for v in range(L.V):
            hay |= (M[v] != 0).any(1)
            acc = M[v].copy()
            for k in L.vk_esc[v]: acc &= sh(E, *K[k]) | ~L.Wany[v, k]
            acept |= (acc != 0).any(1)
        par += int((hay & ~acept).sum())
    return dict(inertes=len(inertes), paralizados=par, total=len(S))


def dual(lhs, rhs):
    sw = {0: 0, 1: 2, 2: 1}
    return [sw[x] for x in lhs], [sw[x] for x in rhs]


def paralelismos(S):
    """Dualidad •/vacío: la regla con • y vacío intercambiados hace lo mismo sobre el mundo complementario.
    Con la sopa (estadísticamente igual a su complemento) ambas deberían caer en el mismo grupo."""
    por_clave = {s["clave"]: s for s in S}
    pares = []
    for s in S:
        l, r = dual(s["lhs"], s["rhs"])
        vs = variantes(l, r, s["sym"])
        k = clave(vs) if vs else None
        if k and k in por_clave and k > s["clave"]:
            pares.append((s, por_clave[k]))
    mismo = sum(a["sopa_grupo"] == b["sopa_grupo"] for a, b in pares)
    dif = [abs(a["sopa_Hf"] - b["sopa_Hf"]) for a, b in pares]
    autoduales = sum(1 for s in S if (lambda lr: (vs := variantes(*lr, s["sym"])) and clave(vs) == s["clave"])(dual(s["lhs"], s["rhs"])))
    return dict(pares=len(pares), mismo_grupo=mismo, dif_mediana=float(np.median(dif)) if dif else 0,
                dif_p95=float(np.percentile(dif, 95)) if dif else 0, autoduales=autoduales)


def resumen(S):
    out = {"n": len(S), "origen": Counter(s["origen"].split(" ")[0] + " " + s["origen"].split(" ")[1] for s in S)}
    for i in INITS:
        out[i] = {
            "grupos": Counter(s[f"{i}_grupo"] for s in S),
            "grupo_comp": Counter(f"{s[f'{i}_grupo']}|{s[f'{i}_comp']}" for s in S),
            "tipo_por_grupo": {g: Counter(s["tipo"] for s in S if s[f"{i}_grupo"] == g) for g in {s[f"{i}_grupo"] for s in S}},
            "curva_por_grupo": {g: Counter(s[f"{i}_curva"] for s in S if s[f"{i}_grupo"] == g and s[f"{i}_comp"] != "inerte")
                                for g in {s[f"{i}_grupo"] for s in S}},
            "conservativas": Counter(s[f"{i}_grupo"] for s in S if s["conservativa"]),
            "sin_punto_lhs": Counter(s[f"{i}_grupo"] for s in S if not s["necesita_punto"]),
            "a_ciegas": Counter(s[f"{i}_grupo"] for s in S if s["escribe_a_ciegas"]),
        }
    out["firmas"] = Counter("|".join(s[f"{i}_grupo"].split(" → ")[1] for i in INITS) for s in S if s["sopa_comp"] != "inerte")
    out["tamano"] = Counter(s["tamano"] for s in S)
    return out


if __name__ == "__main__":
    S = cargar()
    R = resumen(S)
    R["paralisis"] = paralisis(S)
    R["paralelismos"] = paralelismos(S)
    json.dump(R, open("figs/cifras.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=dict)
    print(json.dumps({k: R[k] for k in ("n", "paralisis", "paralelismos")}, ensure_ascii=False))
    print("firmas:", R["firmas"].most_common(12))
    for i in INITS:
        print(i, "curvas:", {g: dict(c) for g, c in R[i]["curva_por_grupo"].items()})
        print(i, "conservativas:", dict(R[i]["conservativas"]))
