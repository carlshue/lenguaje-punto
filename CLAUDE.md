# CLAUDE.md — lenguaje •

## Contexto

Carlos (ingeniero de datos e IA, no matemático de formación) explora una idea propia: el **lenguaje •**. El mundo es una grilla donde cada celda tiene un • o está vacía, y todo lo demás son reglas *disposición de celdas ~> disposición de celdas*. Su motivación es definir sistemas (hormiga de Langton, máquinas de Turing...) bajo un mismo marco, medir su **mínima expresión** y no esconder información en las reglas.

Ya se ha hablado de los antecedentes (Leibniz, Spencer-Brown *Laws of Form*, Lincos, autómatas celulares, complejidad de Kolmogorov, Busy Beaver, MarkovJunior). La conclusión honesta es que el marco general no es nuevo: es reescritura de patrones en 2D. El valor está en preguntas concretas y medibles dentro de él. Sé crítico y sincero; Carlos lo pide explícitamente.

## Convenciones

- Responde siempre en español.
- No crees archivos .md para documentar cambios; explícalos en el chat.
- Deja que Carlos compruebe por sí mismo que los cambios funcionan. Ejecuta las pruebas automáticas, pero no des por validado lo visual o de uso.
- Sin dependencias en la web: HTML + JS plano que funcione abriendo `index.html` (también por `file://`, así que nada de módulos ES).
- Para herramientas de búsqueda, Python con numpy; numba o GPU solo si hacen falta de verdad.

## Estructura

- `index.html`, `style.css`, `app.js`: interfaz del editor (lienzo, editor de reglas, red, mosaico, exportar/importar, estado en localStorage).
- `engine.js`: motor, también usable desde Node (`module.exports`).
  - Regla: `w, h`, `lhs[]` (0 cualquiera, 1 •, 2 vacío), `rhs[]` (0 no tocar, 1 poner •, 2 vaciar), `sym` (`none|rot|mirror|mirrorv|all`), `anchored`, `anchor` (celda de referencia: centro de las simetrías y punto que debe caer en la red si la regla está anclada).
  - Mundo: `w, h, wrap, cells (Uint8Array), lattice` (`none`, `rect` con px/py/ox/oy, `diag` con (x + m·y) mod n = k).
  - `step(world, variants, mode)`: lee del estado anterior y escribe después. Modos: `seq`, `seq-rand`, `par-prio`, `par-skip`, `par-rand`.
  - `findMatches` busca candidatos partiendo de los • (la primera celda • de cada variante).
- `examples.js`: ejemplos y el helper `ruleFromCells(name, [[x,y,lhs,rhs],...], {anchor, sym, anchored})`.
- `ganadores.js`: datos generados por `busqueda/exportar.py`; `examples.js` los convierte en reglas (`reglasBloques`).
- `busqueda/`: Python + numpy. `codigos.py` (modelo, comprobador exacto, familias, simetrías), `validar.py`, `fuerza_bruta.py` (contraste), `buscar.py` (F1/F2), `general.py` (backtracking), `conservativas5.py`, `cribar.py`, `exportar.py`.
- `test/autolocalizables.js`: ganadores sin anclaje, 1 coincidencia por paso y trayectoria clásica.
- `test/test.js`: `node test/test.js`. Comprueba las hormigas contra la clásica paso a paso (autopista al ~10.000), que Sierpinski coincide con la regla 90 y la conservación en gas y arena.

## Resultados obtenidos hasta ahora

Hormiga de Langton. Convención de Carlos: sobre blanco gira a la izquierda, invierte el píxel y avanza; es el espejo de la clásica.

| Codificación | Celdas/bloque | Conserva • | Autolocalizable |
|---|---|---|---|
| Bloque 3×2: ←↑ arriba, ↓→ abajo, columna derecha = píxel (• arriba blanco, abajo negro) | 6 | sí | **no** |
| Cruz: centro = píxel (• negro), brazos = hormiga; teselado (x+2y) mod 5 = 0 | 5 | no | **no** |

- Con la hormiga como un único • y un • de píxel, 5 posiciones es el mínimo, y 6 si además se conservan los •: conservar cuesta 1 celda por bloque.
- **Ambigüedad sin anclaje**: en la de 6 celdas, el • de píxel del bloque vecino se lee como la hormiga de un bloque "falso" desplazado. Las reglas encajan en varios sitios desde el paso 0. La cruz falla igual (un • aislado encaja en las 4 rotaciones). Las dos solo funcionan ancladas a la red: dónde empieza cada bloque es información externa a los •.
- La hormiga de Langton es reversible; la versión de 6 celdas es además conservativa.

### Autolocalización (búsqueda en `busqueda/`, hecha)

Con el LHS = bloque actual + bloque destino completos, mínimo de celdas por bloque:

| Familia | Anclada | Sin anclaje | Anclada, conserva | Sin anclaje, conserva |
|---|---|---|---|---|
| General (10 patrones cualesquiera) | 4 | **4** (1×4, 2×2) | 5 | **5** (1×5, 5×1, cruz) |
| F1 (hormiga = un •) | 5 (cruz) | **6** (1×6, 2×3...) | 6 | **7** (solo 1×7/7×1) |

- 4 es la cota de información (10 estados) y conservar en 4 es imposible por conteo. En general la autolocalización sale gratis; en F1 cuesta +1 y la conservación otro +1, y se suman.
- Hay muchísimas soluciones (~2 % de las asignaciones aleatorias de 4 celdas, ~18 % de las de 5). El contexto del bloque destino hace casi todo el trabajo: con un LHS de un solo bloque saldría peor.
- Conservativas de 5 de mínima densidad: 2 • por bloque (los 10 estados = los 10 pares). En 1×5 todas usan los mismos bloques sin hormiga y valen las 8! formas de repartir los demás pares.
- Ganadores exportados a `ganadores.js` (lo genera `busqueda/exportar.py`) como ejemplos `auto4`, `auto5c`, `auto6f1`, `auto7f1c`; prueba en `test/autolocalizables.js`.

## Tarea anterior (hecha): búsqueda de codificaciones autolocalizables

**Pregunta**: ¿cuál es el bloque más pequeño que codifica la hormiga sin anclaje, de modo que las reglas solo puedan encajar en la posición real? Es el análogo 2D de los **códigos sin coma** de Crick (1957) y Golomb: leer palabras sin saber dónde empiezan. Carlos pidió una búsqueda exhaustiva y un cribado de los mejores candidatos.

### Modelo

- Bloque rectangular `w×h` (n = w·h celdas) teselando el plano. Se pueden explorar teselados no rectangulares más adelante.
- 10 estados por bloque: píxel ∈ {blanco, negro} × hormiga ∈ {ninguna, ↑, ←, ↓, →}. Cada estado es un patrón binario de n bits, y los 10 deben ser distintos.
- Reglas generadas automáticamente: 16 (4 direcciones × color actual × color del destino). LHS = bloque actual completo + bloque destino completo (sin "cualquiera"). RHS = nuevos estados de ambos.
- Legal = cualquier asignación de estados a los bloques con **como mucho una hormiga** en todo el mundo.

### Familias de candidatos (de más restringida a más general)

1. **F1, estilo Carlos**: hormiga = un único • en una de 4 casillas; sin hormiga = sin • en esas casillas. Píxel = dos subconjuntos distintos (P_blanco, P_negro) del resto de celdas, que pueden incluir • fijos de "marca". Tamaño: P(n,4)·2^k·(2^k−1) con k = n−4. Abarcable hasta n≈8–9.
2. **F2, separable**: celdas divididas en zona de píxel y zona de hormiga; 2 patrones de píxel y 5 de hormiga arbitrarios. Abarcable para n pequeño.
3. **General**: 10 patrones arbitrarios. Solo para n mínimo (4–5).

Recorre n creciente (4, 5, 6...) y todas las formas `w×h` con w·h = n (1×n, n×1, 2×2, 2×3, 3×2...). Detente en el primer n con soluciones y explora también n+1 para tener comparativa.

### Comprobación de no ambigüedad (es una demostración, no una simulación)

Para cada regla y cada desplazamiento no alineado (ox, oy) ∈ [0,w)×[0,h) \ {(0,0)}:

- La ventana de la regla, desplazada, cubre como mucho 3×2 o 2×3 bloques.
- Enumera todas las asignaciones legales de esos bloques: 2^6 × (1 + 6·4) = 1600 combinaciones.
- Si alguna reproduce exactamente el LHS, la codificación es ambigua.
- En posiciones alineadas solo puede encajar la hormiga real, porque los patrones son distintos y hay una sola hormiga.

Filtro previo barato y suficiente: si ningún patrón "bloque con hormiga" aparece desplazado en ninguna ventana legal de 2×2 bloques (2^4 × 17 combinaciones), la codificación ya es no ambigua. Los que no pasen este filtro pueden pasar la prueba completa gracias al contexto del bloque destino.

Valida a mano el comprobador con las dos codificaciones conocidas (6 celdas y cruz): ambas deben salir **ambiguas**.

### Cribado y salida

Para cada candidato válido, calcula:
- n y forma;
- si conserva • (|P_blanco| = |P_negro| y todas las hormigas con el mismo número de •);
- número de • fijos de marca;
- densidad media de •;
- tamaño total de las reglas;
- simetrías.

Ordena por n, después conservación y después simplicidad. Elimina duplicados por simetría (rotaciones/espejos del bloque y permutaciones equivalentes) y muestra los mejores dibujados en ASCII.

Exporta los mejores como ejemplos cargables en el editor: añádelos a `examples.js` o genera un JSON importable. Así Carlos puede verlos correr sin anclaje y con «Ver coincidencias».

Añade una prueba en `test/` que simule cada ganador sin anclaje y confirme 1 coincidencia por paso y la trayectoria de la hormiga clásica.

## Ideas abiertas para después

- Coste de la autolocalización frente al de la conservación: ¿son independientes o se pueden compartir celdas?
- Repetir con otros sistemas: una máquina de Turing pequeña, la regla 110 o el Juego de la Vida (no conservativo: ¿cuánto cuesta hacerlo conservativo?).
- Teselados no rectangulares (cruces, hexágonos).
