# CLAUDE.md — lenguaje •

## Contexto

Carlos (ingeniero de datos e IA, no matemático de formación) explora una idea propia: el **lenguaje •**. El mundo es una grilla donde cada celda tiene un • o está vacía, y todo lo demás son reglas *disposición de celdas ~> disposición de celdas*. Quiere definir sistemas (hormiga de Langton, máquinas de Turing, autómatas) en un mismo marco, medir su **mínima expresión** y no esconder información en las reglas.

Los antecedentes ya están hablados (Leibniz, Spencer-Brown *Laws of Form*, Lincos, autómatas celulares, complejidad de Kolmogorov, Busy Beaver, MarkovJunior). Conclusión honesta: el marco general no es nuevo, es reescritura de patrones en 2D. El valor está en preguntas concretas y medibles dentro de él. Sé crítico y sincero; Carlos lo pide.

## Convenciones

- Responde siempre en español.
- No crees archivos .md para documentar cambios; explícalos en el chat. (README.md y este archivo sí se mantienen.)
- Deja que Carlos compruebe por sí mismo que los cambios funcionan. Ejecuta las pruebas automáticas, pero no des por validado lo visual o de uso.
- Web sin dependencias: HTML + JS plano que funcione abriendo `index.html` también por `file://`, así que nada de módulos ES. Los datos generados se cargan como `<script>` que define un global (`PuntoGanadores`, `PuntoSistemas`...) y además exporta con `module.exports` para Node.
- Búsquedas en Python con numpy. numba, PyTorch o GPU solo si hacen falta de verdad (`motor_gpu.py` es opcional).
- Convención de la hormiga de Carlos: sobre blanco gira a la **izquierda**, invierte el píxel y avanza (espejo de la clásica).

## Cómo se ejecuta

- Editor: abrir `index.html`, o `python servidor.py 8765` → http://localhost:8765. El servidor no usa caché (para ver los ejemplos recién regenerados) y guarda los favoritos en `favoritos.json` vía `GET/POST /api/favoritos`. Sin servidor, los favoritos van a localStorage.
- `.claude/launch.json` lanza ese servidor (configuración `editor`).
- Pruebas (Node, sin dependencias):
  - `node test/test.js`: hormigas contra la clásica paso a paso (autopista al ~10.000), cruz sin anclaje ambigua, Sierpinski = regla 90, conservación en gas y arena. Unos segundos.
  - `node test/autolocalizables.js [pasos] [pasos_unicidad]`: los 4 ganadores sin anclaje, 1 coincidencia por paso y trayectoria clásica. ~2 minutos; lánzalo en segundo plano.
  - `node test/logica.js`: códigos sin coma; tablas de verdad, semisumador y sumador completo con todas las entradas; ninguna coincidencia fuera de un componente real.
  - `node test/turing.js`: cada máquina en el motor da 1 coincidencia por paso y la misma cinta, pasos y estado final que la simulación directa.

## Estructura

- `index.html`, `style.css`, `app.js`: editor. Lienzo, barra con ◀ ▶ y selector de autómata, ★ favoritos, «ejecutar al cargar», velocidad en pasos/s (escala logarítmica 0,5–20.000), pestañas Galería / Reglas / Mundo / Ayuda, exportar/importar JSON (`formato: "punto-1"`), estado en localStorage.
  - Galería: categorías por prefijo de id (`hormiga*`/`auto*` → Hormigas, `logica-` → Puertas lógicas, `turing-` → Máquinas de Turing, `ent-` → Entropía, `bb-` → Busy beaver, `multi-` → Órdenes, resto → Clásicos), filtro de texto y navegación con ← →.
  - Favoritos: instantánea completa (reglas + mundo inicial + modo) identificada por la clave de las reglas y el tamaño del mundo.
- `engine.js`: motor, también desde Node.
  - Regla: `w, h`, `lhs[]` (0 cualquiera, 1 •, 2 vacío), `rhs[]` (0 no tocar, 1 poner •, 2 vaciar), `sym` (`none|rot|mirror|mirrorv|all`), `anchored`, `anchor` (centro de las simetrías y punto que debe caer en la red si está anclada).
  - Mundo: `w, h, wrap, cells (Uint8Array), lattice` (`none`, `rect` con px/py/ox/oy, `diag` con (x + m·y) mod n = k).
  - `step(world, variants, mode)` lee del estado anterior y escribe después. Modos: `seq`, `seq-rand`, `par-prio`, `par-skip`, `par-rand`.
  - `findMatches` busca candidatos partiendo de los • (la primera celda • de cada variante).
- `examples.js`: ejemplos a mano, `ruleFromCells(name, [[x,y,lhs,rhs],...], {anchor, sym, anchored})`, `reglasHormigaMinima`, `reglasSeparables`, `reglasBloques` (ganadores), y la conversión de `sistemas.js` / `sistemas_multi.js` en ejemplos.
- `logica.js` (`PuntoLogica`): puertas lógicas. Tipos de componente, códigos, `reglasLogica`, circuitos (`CIRCUITOS`), `evaluar` (referencia abstracta), `pintar`/`leer`, `mundoTablas`.
- `turing.js` (`PuntoTuring`): máquinas de Turing. `reglasTuring(tabla)`, `pintarCinta`/`leerCinta`, `simular` (referencia) y `MAQUINAS`. Tabla: `{ A: { 0: "1RB", 1: "1LB" }, ... }`; `H` para.
- Datos generados (no editar a mano):
  - `ganadores.js` ← `busqueda/exportar.py`.
  - `sistemas.js` ← `busqueda/entropia/galeria.py` (45 sistemas de una regla, ids `ent-*` y `bb-*`).
  - `sistemas_multi.js` ← `busqueda/entropia/galeria_multi.py` (130 sistemas de varias reglas, ids `multi-*`).
  - `favoritos.json`: lo escribe el editor.
- `busqueda/` (autolocalización): `codigos.py` (modelo, comprobador exacto, familias, simetrías), `validar.py`, `fuerza_bruta.py`, `buscar.py` (F1/F2), `general.py`, `conservativas5.py`, `cribar.py`, `exportar.py`, `figuras.py` + `informe.py` → `informe_autolocalizacion.pdf`. Los JSON de resultados y `figs/` no se versionan.
- `busqueda/hormiga/`: hormiga con red y mínimo de reglas (`minima.js`) y hormiga sin red (`sin_red.py` F1, `sin_red2.py` F2, `separable.js` verificación en el motor).
- `busqueda/entropia/`: exploración de sistemas por entropía.
  - `reglas.py`: reglas de hasta 3×3, simetrías y forma canónica (quita escrituras nulas, normaliza por traslación, mínimo sobre las 8 transformaciones).
  - `motor.py`: simulador por lotes en `par-skip` sobre toros 64×64 empaquetados en bits (una fila = un uint64). `motor_gpu.py`: lo mismo con PyTorch.
  - `contraste.py`, `contraste_multi.py`: comparan el simulador con `engine.js` (deben coincidir celda a celda).
  - `explorar.py` (una regla: `exhaustivo` hasta 2×3, `muestreo MINUTOS` en 3×3) → `sistemas.sqlite`. `explorar_multi.py MINUTOS` (2–16 reglas 3×3) → `multi.sqlite`. Las bases no se versionan.
  - `analizar.py`, `cifras.py`: grupos y rasgos. `galeria.py`, `galeria_multi.py`: exportan al editor. `figuras.py`: figuras en `figs/`.

## Resultados

### Hormiga de Langton con red (anclada)

| Codificación | Celdas/bloque | Conserva • | Sin anclaje |
|---|---|---|---|
| Bloque 3×2 (`hormiga6`) | 6 | sí | ambigua |
| Cruz, red (x+2y) mod 5 = 0 (`hormigaCruz`) | 5 | no | ambigua |
| Cruz con 8 reglas de 3 celdas (`hormigaMinima`) | 5 | no | — |

- Con la hormiga como un único • y un • de píxel, 5 celdas es el mínimo, y 6 si además se conservan los •.
- Sin anclaje, el • de píxel de un bloque vecino se lee como la hormiga de un bloque falso desplazado. Dónde empieza cada bloque es información externa a los •.
- `hormigaMinima`: 8 reglas (4 direcciones × 2 colores) es el mínimo contando variantes; cada una mira solo 3 celdas porque hay una sola hormiga.

### Autolocalización (hecha; detalle en `informe_autolocalizacion.pdf`)

LHS = bloque actual + bloque destino completos, 16 reglas. Mínimo de celdas por bloque:

| Familia | Anclada | Sin anclaje | Anclada, conserva | Sin anclaje, conserva |
|---|---|---|---|---|
| General (10 patrones cualesquiera) | 4 | **4** (1×4, 4×1, 2×2) | 5 | **5** (1×5, 5×1, cruz) |
| F1 (hormiga = un •) | 5 (cruz) | **6** (1×6, 2×3, 3×2, 6×1) | 6 | **7** (solo 1×7/7×1) |

- 4 es la cota de información (10 estados); conservar con 4 es imposible por conteo (C(4,2) = 6 < 8 hormigas).
- En la familia general autolocalizarse sale gratis; en F1 cuesta +1 (un • fijo de marca, una «coma» literal) y conservar otro +1, y no comparten celdas.
- Muchas soluciones: ~2 % de las asignaciones al azar en 1×4, ~18 % en 1×5. El bloque destino hace casi todo el trabajo.
- Conservativas de 5 de mínima densidad: 2 • en cada bloque. En 1×5 hay 8! soluciones y todas usan los mismos bloques sin hormiga, que hacen de comas.
- Ganadores en el editor: `auto4`, `auto5c`, `auto6f1`, `auto7f1c`.
- **Crítica pendiente**: se minimizó el tamaño del bloque, no el de las reglas. 16 reglas de 2n celdas sin «cualquiera» son mucho más largas que la cruz anclada con 2 reglas y simetría. La versión honesta de «mínima expresión» es minimizar celdas especificadas en las reglas.

### Hormiga sin red (`busqueda/hormiga/`, ejemplo `hormigaSinRed`)

- El mundo empieza vacío y nada está anclado. (a) El vacío es la red: el bloque blanco sin hormiga es todo vacío, y la hormiga deja la estructura al pasar. (b) La red crece delante con un • de marca y 4 reglas de crecimiento.
- Con la hormiga como un único • es imposible: un • aislado en el vacío encaja igual en las 4 direcciones. Hace falta un código de varios • por dirección (familia separable, bloque 1×6 en el ejemplo).

### Entropía de sistemas de una y de varias reglas (`busqueda/entropia/`)

- Medida: H3 = entropía de Shannon de los patrones 3×3 en el toro, en bits por celda (0 orden, 1 ruido); también compresión con zlib. Puntos de control en los pasos 0, 1, 2, 4, 8, 16, 32, 64, 96 y 128. Tres condiciones iniciales: `sopa` (ruido al 50 %), `mancha` (8×8 en el centro) y `punto` (un solo •).
- Grupos: nivel inicial → final (`baja` < 0,2 ≤ `media` < 0,7 ≤ `alta`) y comportamiento (`inerte`, `muere`, `se llena`, `se congela`, `se desplaza`, `oscila`, `sigue activo`).
- Varias reglas: cada regla es productiva (P, pone más • de los que lee), consumidora (C) o movedora (M), con conteo **literal** de • (definición de Carlos). Módulo = |m|, carga = n_lhs + n_rhs. También se calcula el balance real y las escrituras «ciegas» sobre «cualquiera».
- En el editor: representantes por grupo (las reglas más cortas, desempatando por mayor cambio de entropía), busy beaver por tamaño (la regla que más entropía deja) y 130 sistemas multi. Carlos ha marcado 9 favoritos, casi todos C+M o P+C+M con simetría.
- **Aviso**: no hay informe versionado de esta parte (`cifras.py` menciona un `informe.py` que no está en el repo), y las bases `.sqlite` no se versionan. Las cifras globales solo se recuperan relanzando `explorar.py` / `explorar_multi.py`. Las descripciones de `sistemas*.js` sí guardan las curvas de cada ejemplo.

### Puertas lógicas (`logica.js`)

- Señales en doble raíl (• en la 1.ª celda = 0, en la 2.ª = 1) por carriles de W = 6 celdas. Con un solo raíl NOT es imposible, porque el 0 sería vacío y nada lo dispara.
- Circuito = pila de etapas: filas pares, señales; impares, códigos de componente (1 carril: PASO, NOT; 2 carriles: AND, OR, XOR, NAND, NOR, XNOR, COPIA, CRUCE, DER, IZQ). Una regla por combinación de entradas: borra las entradas y escribe las salidas. Modo `par-skip`.
- Autolocalización demostrada, sin anclaje. Todo código es «11» + carga sin «11» que empieza por 0 + «0»: en vertical solo encaja sobre filas de código (las de señales nunca tienen «11»), y en horizontal es un código sin coma. W = 6 es lo mínimo con este esquema para 2 tipos de 1 carril y 10 de 2: con W = 3 o 4 solo cabe un código de 1 carril, y con W = 5 solo 5 de 2 carriles. (Una búsqueda general de códigos sin coma tampoco encontró dos códigos de 1 carril con W = 3.)
- Circuitos: semisumador (3 etapas) y sumador completo (2 semisumadores + OR, 11 etapas).

### Máquinas de Turing (`turing.js`)

- Casilla = columna: marca, símbolo, estado en b bits, marca (alto b + 3). Una regla de 2 columnas por transición; el símbolo de la vecina es «cualquiera».
- Exactamente 1 coincidencia por paso, demostrado: las dos marcas impiden desplazamientos verticales (fuera de la cinta todo está vacío) y en horizontal las casillas miden 1. Requiere una sola cinta en el mundo.
- Máquinas: suma unaria 3+2 (8 pasos), BB(2) (4 unos, 6 pasos), BB(3) (6 unos, 14 pasos), BB(4) (13 unos, 107 pasos).

## Ideas abiertas

- Reglas mínimas: permitir «cualquiera» y minimizar celdas especificadas manteniendo la no ambigüedad. Probablemente ahí sí cuesta no anclar.
- LHS de un solo bloque (análogo directo de los códigos sin coma).
- Teoría: Golomb, Gordon y Welch; sincronización de bloques en autómatas celulares.
- Otros sistemas: regla 110, Juego de la Vida (¿cuánto cuesta hacerlo conservativo?).
- Lógica: medir el coste por puerta (celdas por regla, reglas por puerta), y cablear sin etapas de PASO (hoy cada señal necesita un componente en cada etapa).
- Turing: máquina universal pequeña, o un mismo juego de reglas para cualquier tabla escrita en la cinta.
- Teselados no rectangulares (el comprobador ya acepta cualquier prototesela con red).
- Estudiar los favoritos de entropía: qué rasgos comparten.
- Editor: aviso cuando una regla encaja en más de un sitio en modo secuencial.
