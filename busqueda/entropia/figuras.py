"""Figuras del informe de entropía (PNG en figs/)."""
import json, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from analizar import cargar, INITS, BAJA, ALTA
from galeria import representantes, busy_beaver, tira

os.makedirs("figs", exist_ok=True)
AZUL, NARANJA, AQUA = "#2a78d6", "#eb6834", "#1baf7a"
TXT, TXT2, REJ = "#0b0b0b", "#52514e", "#e4e2dc"
COLOR_FIN = {"baja": AZUL, "media": NARANJA, "alta": AQUA}
CHECK = [0, 1, 2, 4, 8, 16, 32, 64, 96, 128]
NOMBRE_INIT = {"sopa": "Sopa (ruido al 50 %)", "mancha": "Mancha 8×8 en el centro", "punto": "Un solo •"}
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 8.5, "axes.edgecolor": "#b9b6ad", "axes.labelcolor": TXT2,
                     "xtick.color": TXT2, "ytick.color": TXT2, "axes.spines.top": False, "axes.spines.right": False})


def ejes(ax):
    ax.grid(axis="y", color=REJ, lw=0.6); ax.set_axisbelow(True)


def curvas(S):
    """Mediana y rango intercuartílico de H(t) para cada grupo final, por condición inicial."""
    fig, axs = plt.subplots(1, 3, figsize=(9.2, 2.9), sharey=True)
    for ax, i in zip(axs, INITS):
        for fin in ["baja", "media", "alta"]:
            G = [json.loads(s[f"{i}_H"]) for s in S if s[f"{i}_grupo"].endswith(fin) and s[f"{i}_comp"] != "inerte"]
            if len(G) < 3:
                continue
            G = np.array(G); x = np.array(CHECK) + 1
            ax.fill_between(x, np.percentile(G, 25, 0), np.percentile(G, 75, 0), color=COLOR_FIN[fin], alpha=0.15, lw=0)
            ax.plot(x, np.median(G, 0), color=COLOR_FIN[fin], lw=2)
            ax.text(x[-1] * 1.08, np.median(G, 0)[-1], f"→ {fin}\n({len(G)})", color=TXT, fontsize=7.5, va="center")
        ax.set_xscale("log"); ax.set_xticks([1, 2, 5, 17, 65, 129]); ax.set_xticklabels(["0", "1", "4", "16", "64", "128"])
        ax.set_xlim(1, 400); ax.set_ylim(0, 1.02); ax.set_title(NOMBRE_INIT[i], fontsize=9, color=TXT)
        ax.set_xlabel("paso (escala log)"); ejes(ax)
    axs[0].set_ylabel("entropía H₃ (bits por celda)")
    fig.savefig("figs/curvas.png", dpi=220, bbox_inches="tight"); plt.close(fig)


def histogramas(S):
    fig, axs = plt.subplots(1, 3, figsize=(9.2, 2.4), sharey=False)
    for ax, i in zip(axs, INITS):
        v = np.array([s[f"{i}_Hf"] for s in S if s[f"{i}_comp"] != "inerte"])
        ax.hist(v, bins=25, range=(0, 1), color=AZUL, edgecolor="white", linewidth=1)
        ax.set_yscale("log"); ax.axvline(BAJA, color=TXT2, lw=0.8, ls=":"); ax.axvline(ALTA, color=TXT2, lw=0.8, ls=":")
        ax.set_title(NOMBRE_INIT[i], fontsize=9, color=TXT); ax.set_xlabel("H₃ final"); ejes(ax)
    axs[0].set_ylabel("sistemas (escala log)")
    fig.savefig("figs/histogramas.png", dpi=220, bbox_inches="tight"); plt.close(fig)


def curva_bb(S):
    fig, ax = plt.subplots(figsize=(5.2, 2.7))
    for init, col in (("punto", AZUL), ("mancha", NARANJA)):
        bb = busy_beaver(S, init)
        t = [b[0] for b in bb]; h = [b[2][f"{init}_Hf"] for b in bb]
        ax.plot(t, h, color=col, lw=2, marker="o", ms=4)
        ax.text(t[-1] + 0.15, h[-1], NOMBRE_INIT[init], color=TXT, fontsize=7.5, va="center")
    ax.set_xlabel("tamaño de la regla (celdas especificadas)"); ax.set_ylabel("máxima H₃ final"); ax.set_ylim(0, 1.02)
    ax.set_xlim(0.5, max(b[0] for b in busy_beaver(S, "punto")) + 3.5); ejes(ax)
    fig.savefig("figs/busy_beaver.png", dpi=220, bbox_inches="tight"); plt.close(fig)


def dibuja_regla(ax, s):
    for y in range(3):
        for x in range(3):
            for off, v, es_rhs in ((0, s["lhs"][y * 3 + x], False), (4.2, s["rhs"][y * 3 + x], True)):
                fondo = "#ffffff" if v == 0 else "#f3f1ec"
                ax.add_patch(plt.Rectangle((x + off, -y), 1, 1, facecolor=fondo, edgecolor="#c9c5bb", lw=0.6))
                if v == 1:
                    ax.add_patch(plt.Circle((x + off + .5, -y + .5), .3, color=TXT))
                elif v == 2:
                    ax.add_patch(plt.Circle((x + off + .5, -y + .5), .3, facecolor="white", edgecolor=TXT, lw=0.8))
    ax.text(3.6, -0.5, "~>", ha="center", va="center", fontsize=8)
    ax.text(3.6, -2.0, s["sym"], ha="center", va="center", fontsize=6.5, color=TXT2)
    ax.set_xlim(-0.1, 7.3); ax.set_ylim(-2.1, 1.1); ax.set_aspect("equal"); ax.axis("off")


def tiras(elegidos, fichero):
    """elegidos: lista de (titulo, sistema, init)."""
    tiempos = (0, 4, 16, 64, 128)
    fig, axs = plt.subplots(len(elegidos), 6, figsize=(9.2, 1.62 * len(elegidos)),
                            gridspec_kw=dict(width_ratios=[1.5, 1, 1, 1, 1, 1]))
    axs = np.atleast_2d(axs)
    for r, (tit, s, init) in enumerate(elegidos):
        dibuja_regla(axs[r, 0], s)
        axs[r, 0].set_title(tit, fontsize=7, color=TXT, loc="left")
        fr = tira(s, init, tiempos)
        H = json.loads(s[f"{init}_H"])
        for c, t in enumerate(tiempos):
            ax = axs[r, c + 1]
            ax.imshow(1 - fr[t], cmap="gray", vmin=0, vmax=1, interpolation="nearest")
            ax.set_xticks([]); ax.set_yticks([])
            for sp in ax.spines.values(): sp.set_visible(True); sp.set_color("#c9c5bb")
            ax.set_title(f"t={t} · H={abs(H[CHECK.index(t)]):.2f}", fontsize=6.5, color=TXT2)
    fig.tight_layout(pad=0.4)
    fig.savefig(fichero, dpi=200, bbox_inches="tight"); plt.close(fig)


if __name__ == "__main__":
    S = cargar()
    curvas(S); histogramas(S); curva_bb(S)
    rep = representantes(S, 1)
    for i in INITS:
        sel = [(f"{g} · {c} · {s['tamano']} celda{'s' if s['tamano'] != 1 else ''}", s, i) for g, c, s in rep[i]]
        orden = {"alta → baja": 0, "alta → media": 1, "baja → alta": 0, "baja → media": 1}
        sel.sort(key=lambda x: (orden.get(x[0].split(" · ")[0], 2), x[1]["tamano"]))
        tiras(sel[:8], f"figs/tiras_{i}.png")
    print("ok")
