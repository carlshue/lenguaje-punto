/* Generado por busqueda/exportar.py: codificaciones autolocalizables de la hormiga. No editar a mano. */
(function (global) {
  const GANADORES = [
 {
  "id": "auto4",
  "nombre": "Hormiga autolocalizable mínima (4 celdas)",
  "desc": "Bloque 1×4: la celda de arriba es el píxel (• negro) y las 3 de abajo codifican la hormiga (5 códigos de 3 bits). 4 celdas es el mínimo absoluto: 10 estados distintos necesitan 4 bits. Las 16 reglas NO están ancladas y aun así solo encajan en la posición real: el LHS incluye el bloque destino y ningún desplazamiento de un mundo legal lo reproduce. No conserva los •.",
  "forma": "1x4",
  "cells": [
   [
    0,
    0
   ],
   [
    0,
    1
   ],
   [
    0,
    2
   ],
   [
    0,
    3
   ]
  ],
  "R": [
   1,
   0
  ],
  "D": [
   0,
   4
  ],
  "pats": [
   6,
   0,
   2,
   4,
   10,
   7,
   1,
   3,
   5,
   11
  ],
  "na": 92,
  "nb": 60,
  "a0": 32,
  "b0": 24,
  "world": {
   "w": 92,
   "h": 240
  },
  "origen": [
   0,
   0
  ],
  "lattice": {
   "type": "rect",
   "px": 1,
   "py": 4,
   "ox": 0,
   "oy": 0,
   "m": 2,
   "n": 5,
   "k": 0
  },
  "metricas": {
   "n": 4,
   "conserva": false,
   "marcas": 0,
   "densidad": 0.425,
   "celdas_lhs": 128,
   "celdas_cambian": 64,
   "simetrias": 1
  }
 },
 {
  "id": "auto5c",
  "nombre": "Hormiga autolocalizable que conserva los • (5 celdas)",
  "desc": "La mínima que además conserva el número de • (con 4 celdas es imposible: harían falta 8 patrones con el mismo número de •). Cada bloque tiene exactamente 2 •: los 10 estados son los 10 pares de celdas posibles. 16 reglas sin anclaje; solo encajan en la posición real.",
  "forma": "1x5",
  "cells": [
   [
    0,
    0
   ],
   [
    0,
    1
   ],
   [
    0,
    2
   ],
   [
    0,
    3
   ],
   [
    0,
    4
   ]
  ],
  "R": [
   1,
   0
  ],
  "D": [
   0,
   5
  ],
  "pats": [
   3,
   6,
   9,
   10,
   12,
   5,
   17,
   18,
   20,
   24
  ],
  "na": 92,
  "nb": 60,
  "a0": 32,
  "b0": 24,
  "world": {
   "w": 92,
   "h": 300
  },
  "origen": [
   0,
   0
  ],
  "lattice": {
   "type": "rect",
   "px": 1,
   "py": 5,
   "ox": 0,
   "oy": 0,
   "m": 2,
   "n": 5,
   "k": 0
  },
  "metricas": {
   "n": 5,
   "conserva": true,
   "marcas": 0,
   "densidad": 0.4,
   "celdas_lhs": 160,
   "celdas_cambian": 88,
   "simetrias": 1
  }
 },
 {
  "id": "auto6f1",
  "nombre": "Hormiga autolocalizable estilo • único (6 celdas)",
  "desc": "Familia F1: la hormiga es un único • en una de 4 casillas y el píxel es un patrón del resto, con un • fijo de marca. Con esta restricción el mínimo sin anclaje es 6 (con anclaje bastaban 5).",
  "forma": "1x6",
  "cells": [
   [
    0,
    0
   ],
   [
    0,
    1
   ],
   [
    0,
    2
   ],
   [
    0,
    3
   ],
   [
    0,
    4
   ],
   [
    0,
    5
   ]
  ],
  "R": [
   1,
   0
  ],
  "D": [
   0,
   6
  ],
  "pats": [
   2,
   10,
   6,
   34,
   18,
   3,
   11,
   7,
   35,
   19
  ],
  "na": 92,
  "nb": 60,
  "a0": 32,
  "b0": 24,
  "world": {
   "w": 92,
   "h": 360
  },
  "origen": [
   0,
   0
  ],
  "lattice": {
   "type": "rect",
   "px": 1,
   "py": 6,
   "ox": 0,
   "oy": 0,
   "m": 2,
   "n": 5,
   "k": 0
  },
  "metricas": {
   "n": 6,
   "conserva": false,
   "marcas": 1,
   "densidad": 0.383,
   "celdas_lhs": 192,
   "celdas_cambian": 48,
   "simetrias": 1
  }
 },
 {
  "id": "auto7f1c",
  "nombre": "Hormiga autolocalizable estilo • único que conserva (7 celdas)",
  "desc": "Familia F1 y además conserva los •. Mínimo 7 (con anclaje bastaban 6): en F1 la autolocalización y la conservación cuestan 1 celda cada una.",
  "forma": "1x7",
  "cells": [
   [
    0,
    0
   ],
   [
    0,
    1
   ],
   [
    0,
    2
   ],
   [
    0,
    3
   ],
   [
    0,
    4
   ],
   [
    0,
    5
   ],
   [
    0,
    6
   ]
  ],
  "R": [
   1,
   0
  ],
  "D": [
   0,
   7
  ],
  "pats": [
   5,
   21,
   37,
   69,
   13,
   6,
   22,
   38,
   70,
   14
  ],
  "na": 92,
  "nb": 60,
  "a0": 32,
  "b0": 24,
  "world": {
   "w": 92,
   "h": 420
  },
  "origen": [
   0,
   0
  ],
  "lattice": {
   "type": "rect",
   "px": 1,
   "py": 7,
   "ox": 0,
   "oy": 0,
   "m": 2,
   "n": 5,
   "k": 0
  },
  "metricas": {
   "n": 7,
   "conserva": true,
   "marcas": 1,
   "densidad": 0.4,
   "celdas_lhs": 224,
   "celdas_cambian": 64,
   "simetrias": 1
  }
 }
];
  if (typeof module !== "undefined" && module.exports) module.exports = GANADORES;
  else global.PuntoGanadores = GANADORES;
})(typeof window !== "undefined" ? window : globalThis);
