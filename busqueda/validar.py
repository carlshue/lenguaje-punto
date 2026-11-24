import numpy as np
from codigos import *

def bit(*ks):
    v = 0
    for k in ks: v |= 1 << k
    return v

# 6 celdas 3x2: celdas en orden (0,0)(1,0)(2,0)(0,1)(1,1)(2,1)
g6 = rect(3, 2)
slot = {L: 0, U: 1, D: 3, R: 4}
PW, PB = bit(2), bit(5)
p6 = [0]*10
for c, P in ((0, PW), (1, PB)):
    p6[5*c] = P
    for d in range(4): p6[5*c+1+d] = P | bit(slot[d])
amb, tes = ambiguos(g6, np.array([p6]), detalle=True)
print("6 celdas ambigua:", amb[0], tes, "prefiltro pasa:", prefiltro(g6, np.array([p6]))[0])
print(dibujo(g6, p6))

# cruz: celdas (0,0) centro, (0,-1) U, (-1,0) L, (0,1) D, (1,0) R
gc = cruz()
pc = [0]*10
for c, P in ((0, 0), (1, bit(0))):
    pc[5*c] = P
    for d in range(4): pc[5*c+1+d] = P | bit(1+d)
amb, tes = ambiguos(gc, np.array([pc]), detalle=True)
print("cruz ambigua:", amb[0], tes)
print(dibujo(gc, pc))

# inventada claramente segura: 5x2... bloque con marca muy distintiva.
# fila 0: • • • • · (marca), fila 1: hormiga en una de 4 casillas de la fila 1? mejor: 4x3
# fila0: marca "• • • ·"? Probamos una de 3x4: columna izq toda • (marca) salvo filas...
# Construcción segura: bloque 5x3, fila superior = • • • • • salvo nada; filas inferiores vacías salvo
# hormiga y píxel; una fila llena de • de longitud 5 solo puede aparecer alineada si el resto nunca tiene 5 • seguidos.
g = rect(5, 3)
# celdas k = y*5+x
marca = bit(0,1,2,3)
slots = {U: 6, L: 7, D: 8, R: 9}
PWs, PBs = bit(11), bit(13)
ps = [0]*10
for c, P in ((0, PWs), (1, PBs)):
    ps[5*c] = marca | P
    for d in range(4): ps[5*c+1+d] = marca | P | bit(slots[d])
print("segura ambigua:", ambiguos(g, np.array([ps]), detalle=True), "prefiltro pasa:", prefiltro(g, np.array([ps]))[0])
print(dibujo(g, ps))
