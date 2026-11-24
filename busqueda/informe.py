"""Genera ../informe_autolocalizacion.pdf a partir de las figuras de figs/ (ejecutar antes figuras.py)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak,
                                KeepTogether, ListFlowable, ListItem)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

F = "C:/Windows/Fonts/"
pdfmetrics.registerFont(TTFont("DV", F + "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DVB", F + "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("DVI", F + "DejaVuSans-Oblique.ttf"))
pdfmetrics.registerFont(TTFont("DVM", F + "DejaVuSansMono.ttf"))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("DV", normal="DV", bold="DVB", italic="DVI", boldItalic="DVB")

TINTA = colors.HexColor("#1d1d1f"); GRIS = colors.HexColor("#6b6b70"); AZUL = colors.HexColor("#2f5bd3")
FONDO = colors.HexColor("#f3f1ec"); NARANJA = colors.HexColor("#e07a00")

base = ParagraphStyle("base", fontName="DV", fontSize=9.6, leading=14, textColor=TINTA, alignment=TA_JUSTIFY, spaceAfter=5)
S = {
    "titulo": ParagraphStyle("t", parent=base, fontName="DVB", fontSize=19, leading=24, alignment=0, spaceAfter=4),
    "sub": ParagraphStyle("s", parent=base, fontSize=10.5, leading=15, textColor=GRIS, alignment=0, spaceAfter=14),
    "h1": ParagraphStyle("h1", parent=base, fontName="DVB", fontSize=13.5, leading=18, spaceBefore=12, spaceAfter=6, alignment=0),
    "h2": ParagraphStyle("h2", parent=base, fontName="DVB", fontSize=10.8, leading=15, spaceBefore=8, spaceAfter=4, alignment=0),
    "p": base,
    "pie": ParagraphStyle("pie", parent=base, fontSize=8.2, leading=11, textColor=GRIS, alignment=TA_CENTER, spaceAfter=10),
    "celda": ParagraphStyle("c", parent=base, fontSize=8.6, leading=11, alignment=0, spaceAfter=0),
    "celdab": ParagraphStyle("cb", parent=base, fontName="DVB", fontSize=8.6, leading=11, alignment=0, spaceAfter=0),
    "caja": ParagraphStyle("caja", parent=base, fontSize=9.6, leading=14),
    "mono": ParagraphStyle("m", parent=base, fontName="DVM", fontSize=8.4, leading=11.5, alignment=0),
}
ANCHO = A4[0] - 4.4 * cm


def P(t, s="p"): return Paragraph(t, S[s])


def lista(items):
    return ListFlowable([ListItem(P(i), leftIndent=12, value="•") for i in items], bulletType="bullet",
                        start="•", leftIndent=12, bulletFontName="DV", bulletFontSize=9)


def figura(ruta, ancho, pie):
    w, h = PILImage.open(ruta).size
    img = Image(ruta, width=ancho, height=ancho * h / w)
    return KeepTogether([img, Spacer(1, 3), P(pie, "pie")])


def tabla(filas, anchos, cab=True, resaltar=()):
    data = [[Paragraph(str(c), S["celdab" if (cab and i == 0) else "celda"]) for c in f] for i, f in enumerate(filas)]
    t = Table(data, colWidths=anchos, hAlign="LEFT")
    st = [("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d6d2c8")),
          ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
          ("TOPPADDING", (0, 0), (-1, -1), 3.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5)]
    if cab: st.append(("BACKGROUND", (0, 0), (-1, 0), FONDO))
    for (c, r) in resaltar: st.append(("BACKGROUND", (c, r), (c, r), colors.HexColor("#e6ecfb")))
    t.setStyle(TableStyle(st))
    return t


def caja(texto):
    t = Table([[P(texto, "caja")]], colWidths=[ANCHO])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), FONDO), ("LINEBEFORE", (0, 0), (0, -1), 3, AZUL),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    return t


def pagina(c, doc):
    c.saveState(); c.setFont("DV", 7.5); c.setFillColor(GRIS)
    c.drawString(2.2 * cm, 1.2 * cm, "Lenguaje • · Hormiga de Langton autolocalizable")
    c.drawRightString(A4[0] - 2.2 * cm, 1.2 * cm, str(doc.page)); c.restoreState()


H = []
H += [P("¿Cuánto cuesta que las reglas sepan dónde están?", "titulo"),
      P("Búsqueda de codificaciones autolocalizables de la hormiga de Langton en el lenguaje • · informe de hallazgos · 23 de noviembre de 2026", "sub")]

H += [caja("<b>En una frase.</b> Con reglas que miran el bloque actual y el bloque destino completos, la hormiga se puede codificar "
           "<b>sin anclaje</b> con el mismo número de celdas que anclada: <b>4</b> sin conservar los • y <b>5</b> conservándolos. "
           "La autolocalización no cuesta nada en la familia general; solo cuesta (+1 celda) si se exige que la hormiga sea un único •. "
           "Lo inesperado es lo <i>fácil</i> que resulta: eso dice más sobre lo generosas que son estas reglas que sobre la hormiga."),
      Spacer(1, 8)]

# ------------------------------------------------------------------
H += [P("1. Qué estamos haciendo", "h1"),
      P("El lenguaje • describe un mundo como una grilla de celdas con • o vacías, y todo lo demás como reglas "
        "<i>disposición de celdas ~&gt; disposición de celdas</i>. La idea es definir sistemas distintos (la hormiga de Langton, "
        "máquinas de Turing, autómatas) en un mismo marco y medir su <b>mínima expresión</b> sin esconder información en las reglas."),
      P("Con la hormiga ya teníamos dos codificaciones: un bloque 3×2 que conserva los • y una cruz de 5 celdas. Las dos funcionan "
        "solo si las reglas están <b>ancladas a una red</b>: hay que decirle al motor dónde empieza cada bloque. Sin anclaje, el • de "
        "píxel de un bloque se lee como la hormiga de un bloque «falso» desplazado y la regla encaja en varios sitios. Esa red es "
        "información que no está en los •, así que contradice el espíritu del lenguaje."),
      P("La pregunta de esta sesión: <b>¿cuál es el bloque más pequeño que codifica la hormiga de modo que las reglas solo puedan "
        "encajar en la posición real, sin anclaje?</b> Es el análogo en 2D de los <i>códigos sin coma</i> de Crick y Golomb: "
        "palabras que se pueden leer sin saber dónde empiezan.")]

# ------------------------------------------------------------------
H += [P("2. El modelo", "h1"),
      lista([
          "<b>Bloque.</b> Una prototesela de n celdas que tesela el plano con una red (rectángulos w×h y la cruz de 5).",
          "<b>Estados.</b> 10 por bloque: píxel blanco o negro × hormiga ninguna, ↑, ←, ↓ o →. Cada estado es un patrón de n bits y "
          "los 10 tienen que ser distintos. Convención de Carlos: sobre blanco gira a la izquierda.",
          "<b>Reglas.</b> 16, generadas automáticamente: 4 direcciones × color actual × color del destino. El LHS es el bloque actual y "
          "el bloque destino completos (sin celdas «cualquiera»); el RHS, sus nuevos estados.",
          "<b>Mundo legal.</b> Cualquier asignación de estados a los bloques con <b>como mucho una hormiga</b>. Es más exigente que mirar "
          "solo los mundos alcanzables: si no hay falso encaje en ningún mundo legal, no lo hay nunca.",
      ]),
      P("Se exploraron tres familias, de más a menos restringida:"),
      tabla([["Familia", "Definición", "Alcance de la búsqueda"],
             ["F1 (estilo Carlos)", "La hormiga es un único • en una de 4 casillas; el píxel, dos subconjuntos distintos del resto.",
              "Exhaustiva para n = 5, 6, 7 y todas las formas w×h."],
             ["F2 (separable)", "Una zona de píxel (2 patrones) y una zona de hormiga (5 patrones), independientes.",
              "Exhaustiva para n = 4 y 5."],
             ["General", "10 patrones cualesquiera.",
              "Muestreo masivo para n = 4 y 5; exhaustiva en las clases conservativas de 5 celdas con 2•/2• y 2•/1•."]],
            [3.2 * cm, 7.4 * cm, ANCHO - 10.6 * cm])]

# ------------------------------------------------------------------
H += [P("3. Cómo se demuestra que no hay ambigüedad", "h1"),
      P("Para cada regla y cada desplazamiento no alineado de su ventana, hay que decidir si existe un mundo legal que reproduzca "
        "exactamente el LHS. La ventana desplazada cae sobre como mucho 6 bloques del mundo (3×2 o 2×3), lo que da "
        "2<super>6</super> × (1 + 6·4) = 1600 combinaciones."),
      P("El comprobador no las enumera: aprovecha que cada celda de la ventana pertenece a un único bloque del mundo, así que la "
        "restricción se separa por bloques. Para cada bloque basta mirar qué estados coinciden con el LHS en la parte que se solapa. "
        "Hay un falso encaje si y solo si todos los bloques tienen algún estado compatible y como mucho uno de ellos necesita una "
        "hormiga. Son unas 10 comparaciones por bloque en vez de 1600 mundos, y se puede vectorizar con numpy sobre millones de "
        "candidatos."),
      P("<b>En las posiciones alineadas</b> solo puede encajar la hormiga real: los 10 patrones son distintos y hay una sola hormiga. "
        "Por eso basta con mirar los desplazamientos no alineados."),
      P("Validación", "h2"),
      lista([
          "Las dos codificaciones conocidas (6 celdas y cruz) salen <b>ambiguas</b>, como debían. Las figuras 1 y 2 muestran los testigos.",
          "El comprobador rápido coincide con la enumeración literal de las 1600 combinaciones en <b>4.580 casos</b> de 7 formas distintas.",
          "Una codificación inventada «claramente segura» salió ambigua en el primer intento: una fila de 5 • se reproduce al desplazarla "
          "en horizontal. Con 4 • y un hueco, válida. El comprobador pilló el error de intuición.",
          "Los 4 ganadores corren en el motor real sin anclaje: 1 coincidencia por paso en 2.000 pasos con búsqueda completa, y "
          "trayectoria y colores idénticos a la hormiga clásica durante 12.000 pasos, autopista incluida (<font name='DVM'>node test/autolocalizables.js</font>).",
          "Control negativo: la de 6 celdas, metida por la misma tubería de generación de reglas, da 2 coincidencias en el motor.",
      ])]

H += [figura("figs/testigo_6.png", ANCHO * 0.8,
             "Figura 1. Por qué falla la codificación de 6 celdas sin anclaje. A la izquierda, el LHS de una regla (destino a la izquierda, "
             "hormiga ↑ en el bloque actual). A la derecha, un mundo legal en el que la ventana desplazada una fila hacia abajo (naranja) "
             "reproduce exactamente ese LHS. El bloque sombreado es la única hormiga del mundo."),
      figura("figs/testigo_cruz.png", ANCHO * 0.8,
             "Figura 2. La cruz falla incluso con el LHS completo: un • aislado en un mundo casi vacío se lee igual si está en el brazo "
             "↑ de una cruz o en el brazo → de la cruz vecina.")]

# ------------------------------------------------------------------
H += [PageBreak(), P("4. Resultados", "h1"),
      P("Mínimo de celdas por bloque. «Anclada» son los mínimos combinatorios conocidos: con la red dada, basta con que los estados sean distintos."),
      tabla([["Familia", "Anclada", "Sin anclaje", "Anclada y conserva •", "Sin anclaje y conserva •"],
             ["General (10 patrones cualesquiera)", "4", "<b>4</b> (1×4, 4×1, 2×2)", "5", "<b>5</b> (1×5, 5×1, cruz)"],
             ["F1 (hormiga = un único •)", "5 (cruz)", "<b>6</b> (1×6, 2×3, 3×2, 6×1)", "6 (3×2)", "<b>7</b> (solo 1×7 y 7×1)"]],
            [4.6 * cm, 1.9 * cm, 3.6 * cm, 2.9 * cm, ANCHO - 13.0 * cm], resaltar=[(2, 1), (4, 1), (2, 2), (4, 2)]),
      Spacer(1, 8),
      P("Recuento de soluciones distintas (sin contar rotaciones, espejos ni la equivalencia espejo + intercambio de colores):"),
      tabla([["Búsqueda", "Candidatos", "Válidas"],
             ["F1, n = 5 (1×5, 5×1)", "240 por forma", "0"],
             ["F1, n = 6 (cada una de 1×6, 2×3, 3×2, 6×1)", "4.320 por forma", "288 por forma; ninguna conserva"],
             ["F1, n = 7 (1×7, 7×1)", "47.040 por forma", "6.720 por forma; 1.008 conservan"],
             ["F2, n = 4 (1×4, 4×1 / 2×2)", "53.760 por forma", "1.008 / <b>0</b>"],
             ["F2, n = 5, 1 celda de píxel (1×5, 5×1)", "5,2 millones por forma", "563.778 por forma"],
             ["F2, n = 5, 2 celdas de píxel (1×5, 5×1)", "806.400 por forma", "88.720 por forma"],
             ["Conservativas n = 5, 2 • en cada bloque (1×5 / cruz)", "3,6 millones por forma", "40.320 / 1.536"],
             ["Conservativas n = 5, hormiga 2 • y sin hormiga 1 • (1×5, 5×1, cruz)", "36 millones por forma", "<b>0</b>"]],
            [8.4 * cm, 3.6 * cm, ANCHO - 12.0 * cm]),
      Spacer(1, 6),
      P("Los cuatro ganadores", "h2"),
      P("Dentro de cada categoría se ordenó por conservación, después por número total de celdas que cambian en las 16 reglas y "
        "después por densidad de •. Los cuatro están en el editor como ejemplos y se pueden ver correr con «Ver coincidencias»."),
      tabla([["Ejemplo", "Forma", "Celdas", "Conserva", "Densidad de •", "Celdas que cambian (16 reglas)"],
             ["auto4", "1×4", "4", "no", "0,43", "64"],
             ["auto5c", "1×5", "5", "sí", "0,40", "88"],
             ["auto6f1", "1×6", "6", "no", "0,38", "48"],
             ["auto7f1c", "1×7", "7", "sí", "0,40", "64"]],
            [2.2 * cm, 1.6 * cm, 1.6 * cm, 2.2 * cm, 2.8 * cm, ANCHO - 10.4 * cm])]

anchos = {"auto4": 0.46, "auto5c": 0.46, "auto6f1": 0.46, "auto7f1c": 0.46}
pies = {
    "auto4": "Figura 3. auto4 (1×4, 4 celdas). La celda superior es el píxel (• = negro) y las 3 de abajo llevan un código de 3 bits "
             "para «sin hormiga» y las 4 direcciones. Es la cota mínima posible.",
    "auto5c": "Figura 4. auto5c (1×5, 5 celdas, conserva). Todos los bloques tienen exactamente 2 •: los 10 estados son los 10 pares de "
              "celdas posibles.",
    "auto6f1": "Figura 5. auto6f1 (1×6, F1). La segunda celda es un • fijo de marca y la primera el píxel; la hormiga es un único • "
               "en las 4 de abajo.",
    "auto7f1c": "Figura 6. auto7f1c (1×7, F1, conserva). La marca es la tercera celda; el • de píxel cambia de sitio (primera celda = blanco, segunda = negro) en vez de aparecer o desaparecer, y la hormiga es un único • en las 4 de abajo.",
}
fila = []
for k in ["auto4", "auto5c"]:
    w, h = PILImage.open(f"figs/est_{k}.png").size
    a = ANCHO * 0.42
    fila.append([Image(f"figs/est_{k}.png", width=a, height=a * h / w), P(pies[k], "pie")])
t = Table([[fila[0], fila[1]]], colWidths=[ANCHO / 2, ANCHO / 2]); t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
H += [Spacer(1, 8), t]
fila = []
for k in ["auto6f1", "auto7f1c"]:
    w, h = PILImage.open(f"figs/est_{k}.png").size
    a = ANCHO * 0.40
    fila.append([Image(f"figs/est_{k}.png", width=a, height=a * h / w), P(pies[k], "pie")])
t = Table([[fila[0], fila[1]]], colWidths=[ANCHO / 2, ANCHO / 2]); t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
H += [t]
H += [figura("figs/mundos.png", ANCHO,
             "Figura 7. auto4 y auto5c tras 11.000 pasos en el motor, sin anclaje. A la izquierda de cada par, los • tal cual: casi todo "
             "es el mosaico de bloques blancos. A la derecha, el mismo mundo decodificado bloque a bloque (negro = píxel negro, gris = "
             "hormiga): es la hormiga clásica con su autopista.")]

# ------------------------------------------------------------------
H += [P("5. Hallazgos interesantes", "h1")]

H += [P("5.1 La autolocalización sale gratis… en la familia general", "h2"),
      P("Esperábamos que no anclar costara celdas, como en los códigos sin coma unidimensionales, donde hay que renunciar a muchas "
        "palabras. No es así: con 4 celdas, el mínimo de información para 10 estados, ya es autolocalizable una de cada 50 asignaciones al azar "
        "(en 1×4), y con 5 celdas casi una de cada 5. La red que antes aportaba el anclaje se puede deducir de los propios •.")]

H += [P("5.2 En la familia F1 los costes se suman", "h2"),
      P("Si se exige que la hormiga sea un único • (la forma de pensar inicial de Carlos), los números cambian: anclada bastan 5 (cruz), "
        "sin anclaje hacen falta 6; conservando, 6 anclada y 7 sin anclaje. Autolocalizarse cuesta +1 y conservar otro +1, y "
        "<b>no comparten celdas</b>. En los ganadores F1, la celda extra de la autolocalización es un <b>• fijo de marca</b> presente en "
        "todos los estados: la versión más literal de una «coma»."),
      P("La restricción de que la hormiga sea un solo • es la que encarece. Un • aislado se parece demasiado a otros • aislados; "
        "un código de varios bits para la hormiga no tiene ese problema.")]

H += [P("5.3 El bloque destino hace casi todo el trabajo", "h2"),
      P("La proporción de asignaciones <i>aleatorias</i> de 10 patrones que resultan autolocalizables es sorprendentemente alta:"),
      tabla([["Forma", "n", "Autolocalizables entre asignaciones aleatorias"],
             ["1×4 y 4×1", "4", "2,1 %"], ["2×2", "4", "0,28 %"],
             ["1×5 y 5×1", "5", "18 %"], ["cruz", "5", "7 %"]],
            [3.5 * cm, 1.2 * cm, ANCHO - 4.7 * cm]),
      Spacer(1, 5),
      P("Un falso encaje tiene que reproducir 2n celdas a la vez (bloque actual y destino) en un mundo con una sola hormiga. Es una "
        "condición muy fuerte y casi cualquier código la cumple. En la mayoría de los ganadores <b>ni el bloque con hormiga ni el bloque "
        "destino se localizan solos</b>: los dos aparecen desplazados en algún mundo legal, y solo la pareja es inequívoca. Ejemplo: en "
        "la de 6 celdas con marca, el bloque de la hormiga sí aparece desplazado, pero entonces el bloque destino choca con la marca.")]

H += [P("5.4 Con 4 celdas es imposible conservar", "h2"),
      P("Para que las 16 reglas conserven el número de •, hace falta y basta que los dos bloques sin hormiga tengan el mismo número de "
        "• y que las 8 hormigas tengan todas el mismo (se deduce sumando las condiciones de las reglas alrededor de un giro completo). "
        "Con 4 celdas, el mayor grupo de patrones con el mismo número de • tiene C(4,2) = 6 miembros, y hacen falta 8. Así que "
        "conservar cuesta exactamente 1 celda, anclada o no.")]

H += [P("5.5 Una estructura limpia: los bloques vacíos como «comas»", "h2"),
      P("Entre las conservativas de 5 celdas, las de menor densidad tienen 2 • en todos los bloques, así que los 10 estados son justo "
        "los 10 pares de celdas. En 1×5 hay 40.320 = 8! soluciones y todas usan los mismos bloques sin hormiga: "
        "<font name='DVM'>••···</font> (blanco) y <font name='DVM'>•·•··</font> (negro), en vertical. <b>Cualquier</b> reparto de los "
        "otros 8 pares entre las hormigas funciona."),
      P("La explicación, comprobada por enumeración: esos dos patrones no pueden aparecer desplazados en ninguna columna legal, sean "
        "cuales sean los bloques de alrededor. El bloque destino de una regla siempre es un bloque sin hormiga, así que <b>él solo fija "
        "la posición</b>, y las hormigas quedan libres para codificar la dirección como quieran. De las 45 parejas posibles de patrones "
        "de 2 •, solo esa y su imagen especular tienen la propiedad. Es una separación de funciones bonita: los bloques vacíos hacen de comas y "
        "los bloques con hormiga solo distinguen. auto5c es de este tipo; los otros tres ganadores no."),
      P("Además, no hay ninguna conservativa de 5 celdas con hormigas de 2 • y bloques vacíos de 1 •: con densidad menor que 0,4 no "
        "se puede.")]

H += [P("5.6 La forma importa", "h2"),
      P("Con 4 celdas, la familia separable F2 funciona en 1×4 pero en 2×2 no tiene ninguna solución, aunque la familia general sí "
        "(y siete veces menos frecuentes que en 1×4). En 5 celdas, la cruz tiene muchas menos soluciones que 1×5. Las tiras de una "
        "celda de ancho ganan porque solo tienen desplazamientos en una dirección: menos sitios donde equivocarse.")]

# ------------------------------------------------------------------
H += [P("6. Crítica honesta", "h1"),
      lista([
          "<b>La pregunta resultó poco exigente.</b> Con el LHS formado por dos bloques completos, autolocalizarse es casi automático. "
          "Que salga gratis no demuestra que la información de dónde empiezan los bloques sea irrelevante: está repartida en los 2n "
          "celdas que mira cada regla.",
          "<b>Celdas por bloque no es la mínima expresión.</b> Hemos minimizado el tamaño del bloque, no el de las reglas. Los ganadores "
          "usan 16 reglas de 2n celdas sin «cualquiera»; la cruz anclada usaba 2 reglas y simetría de rotación. Si contamos todo lo "
          "que hay que escribir, la versión anclada sigue siendo mucho más corta. Quien compare tiene que comparar reglas + red, no solo celdas.",
          "<b>No es exhaustivo en la familia general.</b> El espacio de 5 celdas tiene del orden de 10<super>14</super> asignaciones y "
          "solo en 1×5 calculo unos 36 millones de conservativas válidas. Los mínimos sí están demostrados (4 es la cota de "
          "información y hay ejemplos; 5 para conservar es la cota por conteo y hay ejemplos), pero los «mejores» lo son dentro de lo explorado.",
          "<b>Una sola hormiga.</b> «Mundo legal» admite como mucho una hormiga. Con varias hormigas, o con estados arbitrarios "
          "(mundos «basura»), aparecerían más falsos encajes.",
          "<b>Bordes del mundo.</b> Fuera de la grilla no hay encaje, así que los bordes solo pueden quitar coincidencias, no añadirlas. "
          "Los mundos de los ejemplos se construyen con bloques enteros.",
          "<b>Lo visual está sin revisar.</b> Las pruebas automáticas pasan, pero Carlos todavía no ha visto los ejemplos en el editor.",
      ])]

H += [P("7. Siguientes pasos", "h1"),
      lista([
          "<b>Reglas mínimas.</b> Permitir celdas «cualquiera» en el LHS y minimizar el número total de celdas especificadas manteniendo "
          "la no ambigüedad. Esta es la versión honesta de «mínima expresión» y probablemente donde aparece un coste real de no anclar.",
          "<b>LHS de un solo bloque.</b> Si la regla solo pudiera mirar el bloque actual (y escribir en el destino sin comprobarlo), "
          "¿cuánto cuesta autolocalizarse? Es el análogo directo de los códigos sin coma.",
          "<b>Comparar con la teoría.</b> Golomb, Gordon y Welch acotan el tamaño de los códigos sin coma; buscar el análogo 2D y la "
          "bibliografía de sincronización de bloques en autómatas celulares.",
          "<b>Otros sistemas.</b> Repetir con una máquina de Turing pequeña, la regla 110 y el Juego de la Vida.",
          "<b>Teselados no rectangulares.</b> El comprobador ya acepta cualquier prototesela con red (se usó con la cruz).",
      ])]

H += [P("8. Cómo reproducirlo", "h1"),
      P("Todo está en <font name='DVM'>busqueda/</font> (Python + numpy). Los JSON de resultados no se versionan; se regeneran así:"),
      P("python validar.py&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# conocidas ambiguas, inventada segura<br/>"
        "python fuerza_bruta.py&nbsp;&nbsp;&nbsp;# contraste con la enumeración literal<br/>"
        "python buscar.py F1 5,6,7&nbsp;# familia F1<br/>"
        "python buscar.py F2 4 1&nbsp;&nbsp;&nbsp;# familia separable (n, celdas de píxel)<br/>"
        "python conservativas5.py 2 2&nbsp;# clase conservativa 2•/2•<br/>"
        "python cribar.py; python exportar.py&nbsp;&nbsp;# cribado y ../ganadores.js<br/>"
        "node ../test/autolocalizables.js&nbsp;&nbsp;# los ganadores en el motor real<br/>"
        "python figuras.py; python informe.py&nbsp;&nbsp;# este informe", "mono")]

doc = SimpleDocTemplate("../informe_autolocalizacion.pdf", pagesize=A4, leftMargin=2.2 * cm, rightMargin=2.2 * cm,
                        topMargin=2 * cm, bottomMargin=2 * cm, title="Hormiga de Langton autolocalizable",
                        author="Lenguaje •", subject="Informe de hallazgos")
doc.build(H, onFirstPage=pagina, onLaterPages=pagina)
print("ok")
