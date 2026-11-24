"""Simulador par-skip en GPU (PyTorch) con convoluciones agrupadas: cada mundo del lote tiene sus propias reglas.

Para una variante con celdas en la ventana 3×3 normalizada (desplazamientos 0..2):
  encaje en p  <=>  Σ_k w_k · x[p+k] == nº de • del LHS,  con w = +1 (•), -1 (vacío), 0 (cualquiera).
  conflictos:   cuenta[q] = Σ_variantes Σ_k escribe_k · encaje[q-k]   (convolución con el núcleo girado)
  aceptada en p <=> todas sus celdas escritas tienen cuenta == 1
  poner/quitar: igual que la cuenta, con las máscaras de escritura de • y de vacío.
Los mundos son toros de 64×64 (relleno circular).
"""
import zlib
import numpy as np
import torch
import torch.nn.functional as F

DEV = torch.device("cuda" if torch.cuda.is_available() else "cpu")
N = 64
CHECK = [0, 1, 2, 4, 8, 16, 32, 64, 96, 128]


K9 = [(kx, ky) for ky in range(3) for kx in range(3)]


def desplazados(X):
    """(B, 9, H·W): X_k[p] = X[p + k] para los 9 desplazamientos de la ventana."""
    B = X.shape[0]
    return torch.stack([torch.roll(X, shifts=(-ky, -kx), dims=(1, 2)) for (kx, ky) in K9], 1).reshape(B, 9, -1)


def repartir(G, B):
    """G: (B, 9, H·W) con lo que cada coincidencia escribe en su desplazamiento k; devuelve Σ_k G_k[q - k]."""
    G = G.reshape(B, 9, N, N)
    return sum(torch.roll(G[:, j], shifts=(ky, kx), dims=(1, 2)) for j, (kx, ky) in enumerate(K9))


class LoteGPU:
    """Encajes, conflictos y escrituras como productos de matrices por lotes (bmm), un mundo por lote."""

    def __init__(self, listas_variantes, dtype=torch.float16):
        B = len(listas_variantes)
        V = max(1, max(len(v) for v in listas_variantes))
        w = np.zeros((B, V, 9), np.float32); ndot = np.full((B, V, 1), 1000.0, np.float32)
        wany = np.zeros((B, V, 9), np.float32); wset = np.zeros((B, V, 9), np.float32)
        wclr = np.zeros((B, V, 9), np.float32); nw = np.zeros((B, V, 1), np.float32)
        for b, vs in enumerate(listas_variantes):
            for v, cs in enumerate(vs):
                ndot[b, v] = 0
                for (x, y, l, r) in cs:
                    k = y * 3 + x
                    if l == 1: w[b, v, k] = 1; ndot[b, v] += 1
                    if l == 2: w[b, v, k] = -1
                    if r: wany[b, v, k] = 1; nw[b, v] += 1
                    if r == 1: wset[b, v, k] = 1
                    if r == 2: wclr[b, v, k] = 1
        t = lambda a: torch.tensor(a, device=DEV, dtype=dtype)
        self.B, self.V, self.dt = B, V, dtype
        self.w, self.ndot, self.wany, self.nw = t(w), t(ndot), t(wany), t(nw)
        self.wanyT, self.wsetT, self.wclrT = t(wany).transpose(1, 2), t(wset).transpose(1, 2), t(wclr).transpose(1, 2)

    def paso(self, X):
        """X: (B, 64, 64) bool en la GPU."""
        B = self.B
        X9 = desplazados(X).to(self.dt)                                   # (B, 9, HW)
        M = (torch.bmm(self.w, X9) == self.ndot).to(self.dt)              # (B, V, HW) encajes
        cuenta = repartir(torch.bmm(self.wanyT, M), B)                    # (B, H, W) escrituras por celda
        E9 = desplazados(cuenta == 1).to(self.dt)                         # (B, 9, HW)
        acc = (M.bool() & (torch.bmm(self.wany, E9) == self.nw)).to(self.dt)
        poner = repartir(torch.bmm(self.wsetT, acc), B) > 0
        quitar = repartir(torch.bmm(self.wclrT, acc), B) > 0
        return (X & ~quitar) | poner


POT = None


def entropia_bloques(X):
    """Entropía de Shannon de los patrones 3×3 en bits por celda (como motor.entropia_bloques)."""
    global POT
    if POT is None:
        POT = torch.tensor([[1, 2, 4], [8, 16, 32], [64, 128, 256]], device=DEV, dtype=torch.float32).reshape(1, 1, 3, 3)
    B = X.shape[0]
    idx = F.conv2d(F.pad(X.float().unsqueeze(1), (0, 2, 0, 2), mode="circular"), POT).long().reshape(B, -1)
    c = torch.zeros(B, 512, device=DEV).scatter_add_(1, idx, torch.ones_like(idx, dtype=torch.float32))
    p = c / c.sum(1, keepdim=True)
    h = -(torch.where(p > 0, p * torch.log2(p.clamp_min(1e-30)), torch.zeros_like(p))).sum(1)
    return (h / 9).cpu().numpy()


def compresion(X):
    """zlib sobre el mundo empaquetado fila a fila como en el simulador de CPU (bit x = celda x)."""
    A = X.cpu().numpy().astype(np.uint8)                         # (B, 64, 64)
    bytes_ = np.packbits(A, axis=-1, bitorder="little")          # (B, 64, 8): mismo orden que uint64 little-endian
    return np.array([len(zlib.compress(b.tobytes(), 9)) / 512 for b in bytes_])


def iniciales_gpu(B):
    from motor import iniciales, desempaquetar
    I = iniciales(1)
    return {k: torch.tensor(desempaquetar(v)[0], device=DEV, dtype=torch.bool).unsqueeze(0).repeat(B, 1, 1) for k, v in I.items()}


def medir(listas_variantes, INITS=("sopa", "mancha", "punto"), T=128):
    """Mismo formato que explorar.medir: por sistema, 11 medidas por condición inicial."""
    import json
    B = len(listas_variantes)
    L = LoteGPU(list(listas_variantes) * len(INITS))
    I = iniciales_gpu(B)
    X = torch.cat([I[i] for i in INITS])
    H, C, D = [], [], []
    ultimos = []
    n0 = X.reshape(len(X), -1).sum(1)
    conserva = torch.ones(len(X), dtype=torch.bool, device=DEV)

    def medir_estado(X):
        H.append(entropia_bloques(X)); C.append(compresion(X)); D.append(X.float().reshape(len(X), -1).mean(1).cpu().numpy())

    medir_estado(X)
    with torch.no_grad():
        for t in range(1, T + 1):
            Xn = L.paso(X)
            if t == T:
                act = (X ^ Xn).reshape(len(X), -1).float().mean(1).cpu().numpy()
            X = Xn
            if t > T - 8:
                ultimos.append(X.clone())
            if t in CHECK:
                medir_estado(X)
                conserva &= X.reshape(len(X), -1).sum(1) == n0
        periodo = torch.zeros(len(X), dtype=torch.long, device=DEV)
        ddx = torch.zeros_like(periodo); ddy = torch.zeros_like(periodo)
        for p in range(1, 8):
            prev = ultimos[-1 - p]
            for dy in range(-p, p + 1):
                for dx in range(-p, p + 1):
                    # mismo convenio que motor.sh: R[y][x] = prev[y+dy][x+dx]
                    s = torch.roll(prev, shifts=(-dy, -dx), dims=(1, 2))
                    igual = (s == X).reshape(len(X), -1).all(1) & (periodo == 0)
                    periodo[igual] = p; ddx[igual] = dx; ddy[igual] = dy
    H, C, D = np.array(H), np.array(C), np.array(D)
    periodo, ddx, ddy, conserva = periodo.cpu().numpy(), ddx.cpu().numpy(), ddy.cpu().numpy(), conserva.cpu().numpy()
    out = []
    for b in range(B):
        f = []
        for j in range(len(INITS)):
            w = j * B + b
            f += [json.dumps([round(float(x), 4) for x in H[:, w]]), json.dumps([round(float(x), 4) for x in C[:, w]]),
                  json.dumps([round(float(x), 4) for x in D[:, w]]), float(H[-1, w]), float(C[-1, w]), float(D[-1, w]),
                  float(act[w]), int(periodo[w]), int(ddx[w]), int(ddy[w]), int(conserva[w])]
        out.append(f)
    return out
