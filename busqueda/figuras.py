"""Figuras del informe (PNG en figs/)."""
import json, itertools
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle
from codigos import *

TINTA, VACIO, BORDE, NARANJA, AZUL = "#1d1d1f", "#f3f1ec", "#c9c5bb", "#e07a00", "#2f5bd3"
plt.rcParams["font.family"] = "DejaVu Sans"


def celda(ax, x, y, punto, borde=BORDE, lw=0.6, fondo=VACIO):
    ax.add_patch(Rectangle((x, -y - 1), 1, 1, facecolor=fondo, edgecolor=borde, lw=lw))
    if punto:
        ax.add_patch(Circle((x + .5, -y - .5), .32, color=TINTA))


def bloque(ax, geo, p, ox, oy, fondo=VACIO):
    for k, (x, y) in enumerate(geo.cells):
        celda(ax, ox + x, oy + y, p >> k & 1, fondo=fondo)


def estados(geo, pats, nombre, fichero):
    xs = [x for x, _ in geo.cells]; ys = [y for _, y in geo.cells]
    x0, y0 = min(xs), min(ys); W, H = max(xs) - x0 + 1, max(ys) - y0 + 1
    gx, gy = W + 1.2, H + 1.6
    fig, ax = plt.subplots(figsize=(0.32 * (5 * gx + 2.5), 0.32 * (2 * gy + 1)))
    for c in (0, 1):
        for a in range(5):
            bloque(ax, geo, pats[5 * c + a], 2.5 + a * gx - x0, c * gy + 1.2 - y0)
            if c == 0:
                ax.text(2.5 + a * gx + W / 2, -0.4, ["sin", "↑", "←", "↓", "→"][a], ha="center", va="center", fontsize=10)
        ax.text(0, -(c * gy + 1.2 + H / 2), ["blanco", "negro"][c], ha="left", va="center", fontsize=9)
    ax.set_xlim(-0.2, 2.5 + 5 * gx); ax.set_ylim(-(2 * gy + 0.6), 0.2)
    ax.set_aspect("equal"); ax.axis("off")
    fig.savefig(fichero, dpi=220, bbox_inches="tight", pad_inches=0.05); plt.close(fig)


def testigo(geo, pats):
    """Primer falso encaje: (regla, t, {bloque: estado})."""
    for (d, c, c2, nd, sA, sB, _, _) in REGLAS:
        vx, vy = geo.vec[nd]
        for t in geo.desplaz:
            bl = {}
            for src, (bx, by) in ((0, (0, 0)), (1, (vx, vy))):
                for k, (x, y) in enumerate(geo.cells):
                    blk, kl = geo.loc[(bx + x + t[0], by + y + t[1])]
                    bl.setdefault(blk, []).append((src, k, kl))
            claves = list(bl)
            for cols in itertools.product((0, 1), repeat=len(claves)):
                for ant in [None] + [(i, dd) for i in range(len(claves)) for dd in range(4)]:
                    asg = [5 * cc for cc in cols]
                    if ant: asg[ant[0]] += 1 + ant[1]
                    if all(((pats[s] >> kl) & 1) == ((pats[sB if src else sA] >> k) & 1)
                           for s, b in zip(asg, claves) for (src, k, kl) in bl[b]):
                        return (d, c, c2, nd), t, dict(zip(claves, asg))
    return None


def figura_testigo(geo, pats, fichero, titulo):
    (d, c, c2, nd), t, asg = testigo(geo, pats)
    fig, axs = plt.subplots(1, 2, figsize=(8, 3.4), gridspec_kw=dict(width_ratios=[1, 1.6]))
    vx, vy = geo.vec[nd]
    sA, sB = 5 * c + 1 + d, 5 * c2
    # izquierda: el LHS de la regla
    ax = axs[0]
    bloque(ax, geo, pats[sA], 0, 0); bloque(ax, geo, pats[sB], vx, vy)
    ax.set_title(f"LHS: {FLECHA[d]} sobre {'negro' if c else 'blanco'}, destino {'negro' if c2 else 'blanco'}", fontsize=9)
    ax.set_aspect("equal"); ax.axis("off"); ax.autoscale_view()
    # derecha: mundo legal y ventana desplazada
    ax = axs[1]
    bs = list(asg)
    amin = min(b[0] for b in bs) - 1; amax = max(b[0] for b in bs) + 1
    bmin = min(b[1] for b in bs) - 1; bmax = max(b[1] for b in bs) + 1
    for a in range(amin, amax + 1):
        for b in range(bmin, bmax + 1):
            s = asg.get((a, b), 0)
            ox, oy = a * geo.vR[0] + b * geo.vD[0], a * geo.vR[1] + b * geo.vD[1]
            bloque(ax, geo, pats[s], ox, oy, fondo="#b9cbf7" if s % 5 else VACIO)
            # contorno del bloque
            for (x, y) in geo.cells:
                for (dx, dy, seg) in ((0, -1, ((0, 0), (1, 0))), (0, 1, ((0, 1), (1, 1))), (-1, 0, ((0, 0), (0, 1))), (1, 0, ((1, 0), (1, 1)))):
                    if (x + dx, y + dy) not in geo.cells:
                        (p0, p1) = seg
                        ax.plot([ox + x + p0[0], ox + x + p1[0]], [-(oy + y + p0[1]), -(oy + y + p1[1])], color=AZUL, lw=1.2)
    for (bx, by) in ((0, 0), (vx, vy)):
        for (x, y) in geo.cells:
            ax.add_patch(Rectangle((bx + x + t[0] + .06, -(by + y + t[1]) - 1 + .06), .88, .88, fill=False, edgecolor=NARANJA, lw=2))
    ax.set_title(titulo, fontsize=9)
    ax.set_aspect("equal"); ax.axis("off"); ax.autoscale_view()
    fig.savefig(fichero, dpi=220, bbox_inches="tight", pad_inches=0.05); plt.close(fig)


def figura_mundos(fichero):
    M = json.load(open("figs/mundos.json"))
    G = {g["id"]: g for g in cargar_ganadores()}
    fig, axs = plt.subplots(1, 4, figsize=(9, 5.2), gridspec_kw=dict(width_ratios=[1, 1, 1, 1]))
    for j, id_ in enumerate(["auto4", "auto5c"]):
        m, g = M[id_], G[id_]
        A = np.array(m["cells"]).reshape(m["h"], m["w"])
        ax = axs[2 * j]
        ax.imshow(1 - A, cmap="gray", interpolation="nearest", vmin=0, vmax=1, aspect="auto")
        ax.set_title(f"{id_}: los •\n({m['w']}×{m['h']} celdas)", fontsize=8); ax.axis("off")
        # decodificar colores por bloque
        C = np.zeros((g["nb"], g["na"]))
        for a in range(g["na"]):
            for b in range(g["nb"]):
                X, Y = g["origen"][0] + a * g["R"][0] + b * g["D"][0], g["origen"][1] + a * g["R"][1] + b * g["D"][1]
                p = 0
                for k, (x, y) in enumerate(g["cells"]):
                    p |= int(A[Y + y, X + x]) << k
                s = g["pats"].index(p)
                C[b, a] = 0.55 if s % 5 else (s // 5)
        ax = axs[2 * j + 1]
        ax.imshow(1 - C, cmap="gray", interpolation="nearest", vmin=0, vmax=1)
        ax.set_title(f"{id_}: decodificado\n({g['na']}×{g['nb']} bloques)", fontsize=8); ax.axis("off")
    fig.suptitle("Paso 11.000: la autopista ya ha empezado", fontsize=9)
    fig.savefig(fichero, dpi=220, bbox_inches="tight", pad_inches=0.05); plt.close(fig)


def cargar_ganadores():
    s = open("../ganadores.js", encoding="utf-8").read()
    return json.loads(s[s.index("["):s.rindex("]") + 1])


if __name__ == "__main__":
    def bit(*ks): return sum(1 << k for k in ks)
    g6 = rect(3, 2); slot = {L: 0, U: 1, D: 3, R: 4}
    p6 = [0] * 10
    for c, P_ in ((0, bit(2)), (1, bit(5))):
        p6[5 * c] = P_
        for d in range(4): p6[5 * c + 1 + d] = P_ | bit(slot[d])
    gc = cruz(); pc = [0] * 10
    for c, P_ in ((0, 0), (1, bit(0))):
        pc[5 * c] = P_
        for d in range(4): pc[5 * c + 1 + d] = P_ | bit(1 + d)
    estados(g6, p6, "6", "figs/est_6.png"); estados(gc, pc, "cruz", "figs/est_cruz.png")
    figura_testigo(g6, p6, "figs/testigo_6.png", "Mundo legal (bloques en azul; con hormiga, sombreado): la ventana naranja reproduce el LHS")
    figura_testigo(gc, pc, "figs/testigo_cruz.png", "Mundo legal (bloque con hormiga sombreado): la ventana naranja reproduce el LHS")
    for g in cargar_ganadores():
        geo = Geometria(g["forma"], g["cells"], g["R"], g["D"])
        estados(geo, g["pats"], g["id"], f"figs/est_{g['id']}.png")
    figura_mundos("figs/mundos.png")
    print("ok")
