# Tareas

Detalles del modelo y de la comprobación en `CLAUDE.md`, sección «Tarea en curso».

## 1. Búsqueda de codificaciones autolocalizables de la hormiga

- [ ] Crear `busqueda/` con un script Python (numpy) independiente del editor.
- [ ] Representación: bloque `w×h`, 10 patrones de estado como enteros de n bits, generador de las 16 reglas (actual + destino).
- [ ] Comprobador completo de ambigüedad: desplazamientos no alineados × asignaciones legales de 3×2 / 2×3 bloques (como mucho una hormiga).
- [ ] Filtro previo suficiente: patrón con hormiga desplazado en ventanas legales de 2×2 bloques.
- [ ] Validar el comprobador: la codificación de 6 celdas y la cruz deben salir ambiguas, y una codificación inventada claramente segura debe salir válida.
- [ ] Familia F1 (hormiga = un •, píxel = 2 subconjuntos del resto): recorrer n = 5, 6, 7, 8 con todas las formas `w×h`.
- [ ] Familia F2 (separable) para n pequeño.
- [ ] Familia general (10 patrones arbitrarios) para n = 4–5, si es abarcable.
- [ ] Eliminar duplicados por simetría.
- [ ] Medir el rendimiento; usar numba o vectorizar más solo si hace falta.

## 2. Cribado

- [ ] Por candidato: n, forma, conserva •, • de marca, densidad, tamaño de reglas, simetrías.
- [ ] Ordenar: n → conservación → simplicidad.
- [ ] Informe en el chat con los mejores dibujados en ASCII y el n mínimo encontrado, con y sin conservación.
- [ ] Tabla final: 5 (red), 6 (red, conserva), N (autolocalizable), N' (autolocalizable y conserva).

## 3. Integración con el editor

- [ ] Exportar los mejores como ejemplos de `examples.js` sin anclaje (o como JSON importable).
- [ ] Prueba en `test/`: cada ganador sin anclaje da 1 coincidencia por paso y la trayectoria clásica (autopista al ~10.000).
- [ ] Opcional: en el editor, un aviso cuando una regla encaja en más de un sitio en modo secuencial.

## 4. Después

- [ ] ¿Comparten celdas la autolocalización y la conservación, o sus costes se suman?
- [ ] Repetir el análisis con una máquina de Turing pequeña, la regla 110 y el Juego de la Vida.
- [ ] Probar teselados no rectangulares (cruces, hexágonos).
- [ ] Buscar bibliografía sobre códigos sin coma en 2D y sincronización de bloques en autómatas celulares.
