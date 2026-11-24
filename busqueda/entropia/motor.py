"""Simulador por lotes en modo par-skip (el mismo que el editor), con el mundo empaquetado en bits.

Mundo: toro de 64×64; cada fila es un uint64 y el bit x es la celda x. Un lote es un array (B, 64)
y cada mundo del lote puede tener su propia regla.

par-skip: se buscan todas las coincidencias en el estado anterior; si dos coincidencias escriben la misma celda,
se descartan todas las que escriben en ella; las demás se aplican a la vez.
"""
import zlib
import numpy as np

N = 64
U = np.uint64
TODO = U(0xFFFFFFFFFFFFFFFF)
K = [(kx, ky) for ky in range(3) for kx in range(3)]  # desplazamientos de la ventana normalizada


def sh(A, dx, dy):
    """R[y] bit x = A[y+dy] bit x+dx (en el toro)."""
    if dy:
        A = np.roll(A, -dy, axis=1)
    dx %= N
    if dx:
        A = (A >> U(dx)) | (A << U(N - dx))
    return A


class Lote:
    """Reglas compiladas para un lote: máscaras por (variante, desplazamiento, mundo).
    Por celda comprobada: Q = 1 si se comprueba, P = valor esperado. Fallo = (S xor P) and Q."""

    def __init__(self, listas_variantes):
        B = len(listas_variantes)
        V = max(1, max(len(v) for v in listas_variantes))
        shape = (V, 9, B, 1)
        self.P = np.zeros(shape, U); self.Q = np.zeros(shape, U)
        self.Wset = np.zeros(shape, U); self.Wclr = np.zeros(shape, U); self.Wany = np.zeros(shape, U)
        self.inactiva = np.full((V, B, 1), TODO, U)
        self.usa = np.zeros((V, 9), bool); self.escribe = np.zeros((V, 9), bool)
        for b, vs in enumerate(listas_variantes):
            for v, cs in enumerate(vs):
                self.inactiva[v, b] = 0
                for (x, y, l, r) in cs:
                    k = y * 3 + x
                    if l: self.Q[v, k, b] = TODO; self.usa[v, k] = True
                    if l == 1: self.P[v, k, b] = TODO
                    if r == 1: self.Wset[v, k, b] = TODO
                    if r == 2: self.Wclr[v, k, b] = TODO
                    if r: self.Wany[v, k, b] = TODO; self.escribe[v, k] = True
        self.V = V
        self.vk_usa = [[k for k in range(9) if self.usa[v, k]] for v in range(V)]
        self.vk_esc = [[k for k in range(9) if self.escribe[v, k]] for v in range(V)]
        self.ks = sorted({k for v in range(V) for k in self.vk_usa[v] + self.vk_esc[v]} | {0})

    def paso(self, W):
        S = {k: sh(W, *K[k]) for k in self.ks}
        tmp = np.empty_like(W)
        M = []
        for v in range(self.V):
            fallo = self.inactiva[v] | np.zeros_like(W)
            for k in self.vk_usa[v]:
                np.bitwise_xor(S[k], self.P[v, k], out=tmp)
                np.bitwise_and(tmp, self.Q[v, k], out=tmp)
                np.bitwise_or(fallo, tmp, out=fallo)
            np.invert(fallo, out=fallo)
            M.append(fallo)
        uno = np.zeros_like(W); dos = np.zeros_like(W)
        for v in range(self.V):
            for k in self.vk_esc[v]:
                kx, ky = K[k]
                X = sh(M[v], -kx, -ky) & self.Wany[v, k]
                dos |= uno & X; uno |= X
        E = uno & ~dos
        SE = {k: sh(E, *K[k]) for k in self.ks}
        poner = np.zeros_like(W); quitar = np.zeros_like(W)
        for v in range(self.V):
            acc = M[v]
            for k in self.vk_esc[v]:
                acc &= SE[k] | ~self.Wany[v, k]
            for k in self.vk_esc[v]:
                kx, ky = K[k]
                a = sh(acc, -kx, -ky)
                poner |= a & self.Wset[v, k]; quitar |= a & self.Wclr[v, k]
        W = W & ~quitar
        W |= poner
        return W


# ---------------- conversión y medidas ----------------
BITS = np.arange(N, dtype=U)


def desempaquetar(W):
    return ((W[..., None] >> BITS) & U(1)).astype(np.uint8)  # (B, 64 filas, 64 columnas)


def empaquetar(A):
    A = A.astype(U)
    return (A << BITS).sum(axis=-1).astype(U)


def entropia_bloques(A):
    """Entropía de Shannon de los patrones 3×3 (en el toro), en bits por celda: 0 = orden total, 1 = ruido."""
    B = A.shape[0]
    idx = np.zeros(A.shape, np.int64)
    for k, (kx, ky) in enumerate(K):
        idx |= np.roll(A, (-ky, -kx), axis=(1, 2)).astype(np.int64) << k
    idx = idx.reshape(B, -1) + (np.arange(B) * 512)[:, None]
    c = np.bincount(idx.ravel(), minlength=B * 512).reshape(B, 512).astype(float)
    p = c / c.sum(1, keepdims=True)
    with np.errstate(divide="ignore", invalid="ignore"):
        h = -(np.where(p > 0, p * np.log2(p), 0)).sum(1)
    return h / 9


def compresion(W):
    """Tamaño comprimido con zlib / tamaño sin comprimir (512 bytes). Ruido ≈ 1, orden ≈ 0."""
    return np.array([len(zlib.compress(w.tobytes(), 9)) / 512 for w in W])


def iniciales(B, rng_seed=12345):
    """Tres condiciones iniciales, idénticas para todas las reglas:
       sopa  : ruido al 50 % en todo el toro (alta entropía);
       mancha: ruido al 50 % en un cuadrado de 8×8 en el centro (baja);
       punto : un único • en el centro (mínima)."""
    rng = np.random.default_rng(rng_seed)
    sopa = rng.integers(0, 2, (N, N), dtype=np.uint8)
    mancha = np.zeros((N, N), np.uint8); mancha[28:36, 28:36] = rng.integers(0, 2, (8, 8), dtype=np.uint8)
    punto = np.zeros((N, N), np.uint8); punto[32, 32] = 1
    return {k: np.repeat(empaquetar(v)[None], B, axis=0) for k, v in
            (("sopa", sopa), ("mancha", mancha), ("punto", punto))}
