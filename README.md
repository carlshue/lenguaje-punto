# • — editor de reglas

Editor web para experimentar con el lenguaje •: una grilla donde cada celda tiene un • o está vacía, y reglas de la forma *disposición de celdas ~> disposición de celdas*.

Abre `index.html` en el navegador; no necesita instalar nada.

## Qué permite

- Dibujar • en la grilla con el ratón.
- Crear reglas con una condición («Si») y un resultado («Entonces»), de cualquier tamaño.
- Generar automáticamente rotaciones y espejos de una regla.
- Anclar reglas a una red (rectangular o diagonal) cuando la posición de los bloques no se puede deducir de los propios •.
- Ejecutar en modo secuencial o paralelo, con distintas políticas de conflicto.
- Ver las coincidencias de cada regla y comprobar si el sistema conserva el número de •.
- Rellenar la grilla con un mosaico, y exportar o importar el estado completo en JSON.

## Ejemplos incluidos

- Hormiga de Langton con bloques de 6 celdas, que conserva los •.
- Hormiga de Langton con cruces de 5 celdas, con 2 reglas y simetría de rotación.
- Gas de partículas (paseo aleatorio).
- Arena con gravedad.
- Triángulo de Sierpinski (regla 90).

## Pruebas

```
node test/test.js
```

Comprueban que las hormigas reproducen paso a paso la hormiga clásica (autopista incluida), que Sierpinski coincide con la regla 90 y que los ejemplos conservativos conservan los •.
