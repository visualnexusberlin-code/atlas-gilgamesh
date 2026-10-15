# Gilgamesh — recorrido en 3D

Experiencia web de una sola pieza sobre la *Epopeya de Gilgamesh*: doce
estaciones recorridas en primera persona por un corredor mesopotámico,
con relieves, tablillas, tormenta y las murallas de Uruk al final.

---

## Los dos archivos

| Archivo | Peso | Para qué |
|---|---|---|
| `index-dev.html` | 228 KB | **El que se edita.** Referencia `./assets/`. Necesita servidor local. |
| `index.html` | 3 MB | **El que se publica.** Todo incrustado; funciona a doble clic, sin servidor. |

```bash
# editar
python3 -m http.server 8000      # y abrir localhost:8000/index-dev.html

# publicar
python3 construir.py             # index-dev.html + assets → index.html
```

`construir.py` incrusta las 28 imágenes en base64. **Nunca edites
`index.html` a mano**: se regenera y perderías los cambios.

---

## Arquitectura

Todo vive en un único `<script>` dentro de un cierre. Sin dependencias
salvo three.js (r128, por CDN). El HTML de las doce `<section id="eNN">`
es a la vez el contenido accesible y **la fuente de datos**: el
constructor lee de ahí títulos, textos, citas e imágenes. Añadir una
estación es añadir una sección.

```
ESTACIONES[]        derivadas del DOM
  ├─ cfg            entrada de CAMARAS (dimensiones, luz, niebla, prop)
  ├─ imagen         mapa y relieve de la pieza
  ├─ paradaZ        dónde se detiene la cámara (calculado)
  ├─ ancla          dónde se proyecta el marcador clicable
  └─ panel3d        malla y material del relieve

CAMARAS{}           receta de cada sala: ancho, alto, techo, prop,
                    colores de luz/niebla/fondo, densidad de niebla
```

### Orden de construcción — **importante**

```
prepararMateriales()
construirCamara() × 12        ← aquí NO existe todavía la ruta
NODOS                          ← la ruta de la cámara
construirTormenta()
construirPasarela()
despejarCorredor()
despejarVista()                ← retira lo que tape los relieves
colocarTestimonios()
despejarTestimonios()          ← retira lo que tape las tablillas
resolverSolapes()              ← barrido final genérico
```

Si necesitas la altura del recorrido durante la construcción de salas,
usa `alturaEnZ()`: tiene un respaldo que interpola con las estaciones
cuando `NODOS` aún está vacío.

---

## Sistemas

**Navegación.** La cámara persigue un índice de estación con
amortiguación (no animaciones de duración fija), así que cualquier
pulsación cuenta al instante y se encadenan. Independiente de la tasa de
refresco. Rueda, flechas, W/S, espacio, Inicio/Fin, táctil y botones.

**Puntos de parada.** Cada estación calcula `paradaZ` para que su pieza
caiga a 26° del eje de visión, con el borde del cuadro en 44°. No se
para en el centro geométrico de la sala.

**Encaje en el muro.** `encajarEnMuro()` deriva inclinación, tamaño y
posición de la franja libre entre el paso y la cara interna del muro,
contando el grosor del marco y el hundimiento de sus capas.

**Iluminación.** Ocho luces **constantes**: hemisférica, foco de
estación (única con sombra), cuatro faroles y una direccional. El número
no cambia nunca — ver «Trampas».

**Texturas.** Generadas por código sobre lienzo, a partir de campos de
altura. La fábrica usa `UNIDAD_TEXTURA = 3.2` unidades por mosaico. El
pavimento usa un atlas más amplio (`UNIDAD_TEXTURA_SUELO = 12.8`) con cuatro
veces más losas internas: conserva el tamaño de cada pieza, pero retrasa cuatro
veces la repetición visible. `ajustarTiling()` lee la escala del material y la
aplica según las medidas de cada malla.

**Sistema museográfico.** Zócalos, marcos, traseras de panel y soportes de
cartela usan una caliza procedural no direccional, separada de la piedra
arquitectónica. Los mapas se comparten entre estaciones para evitar duplicar
memoria gráfica. Las cartelas tienen soporte físico y baja emisividad; no deben
volver a convertirse en planos autoiluminados.

**Cuneiforme.** Las inscripciones murales calculan su altura desde el zócalo y
dejan una junta constante de 0,35 unidades. Las tablillas recreadas se dibujan
sobre fondo transparente y recortan su UV a la silueta de arcilla; el marco
rectangular pertenece a la vitrina, no a la imagen. Conserva esa separación si
cambias sus proporciones.

**Bosque de los Cedros.** La estación V tiene un cerramiento mineral verdoso
propio para evitar el ladrillo repetido a gran altura. Dos hileras de nueve
cedros texturizados forman una columnata ligeramente irregular y dejan libre el
eje central; no deben volver a repartirse al azar porque desde la parada se
ocultarían unos a otros.

**Tormenta y llegada a Ishtar.** La lluvia usa segmentos con cola, deriva
individual y una ráfaga común: la inclinación es su *motion blur* geométrico, no
un posprocesado. El trueno mezcla chasquido, dos oleadas graves y subgrave con
posición, duración e intervalo variables. Los faldones de la pasarela tienen UV
de mundo y ladrillo vidriado azul para anunciar la transición a Ishtar; antes,
al carecer de UV, aparecían como dos bandas marrones planas.

**Envejecido.** `romperTileado()` inyecta en el shader variación ligada a
la posición en el **mundo** (no a la UV, que se repite): manchas de
cocción, escurriduras verticales, salitre al pie, hollín en lo alto,
oclusión de contacto, y en los suelos arena arrimada a los muros, senda
de paso y tono por losa.

---

## Trampas ya pisadas

Cada una costó varias iteraciones. Si tocas estas zonas, tenlas presentes.

**1. Doble escala de textura.** El material traía su propio `repeat` y
`ajustarTiling` escalaba además las UV: se multiplicaban y un muro
repetía el ladrillo 162 veces. `tex()` fija ahora `repeat(1,1)` y la
escala la pone solo la geometría. **No devuelvas el `repeat` al
material.**

**2. `vertexColors` en material compartido.** Si lo activas en
`superficie()`, toda malla que no pase por `hornearAO()` —que es la que
añade el atributo de color— se pinta de **negro**. Lo activa el horneado
sobre su propia copia.

**3. Esferas envolventes en el barrido.** `despejarVista()` descarta
mallas con radio > 40: sin eso, el agua, la llanura y el telón (radios de
170 a 570) se ocultaban siempre.

**4. Consola capada.** Un `console.info` inexistente lanzaba y mataba el
bucle de animación. Hay un relleno de métodos al arrancar; no lo quites.

**5. Reasignación de luces.** Los faroles sirven cada uno a un
subconjunto fijo de antorchas (por resto módulo cuatro). Si los repartes
por cercanía, saltan de sitio y se leen como luces apareciendo de la
nada. Y **si varía el número de luces visibles, three.js recompila todos
los shaders** — con un material clonado por malla son cientos de
compilaciones y un parón de segundos.

**6. FOV constante.** Variarlo mientras la cámara se mueve es un *dolly
zoom* y marea. Está fijo en 60.

**7. Niebla.** Su color debe ser **más claro** que el fondo o se lee como
oscuridad en vez de bruma. Y su densidad está calculada para dejar cada
pieza al 8%: si la subes, la niebla se come el relieve.

**8. Capas del marco.** Se colocan desplazándose sobre la **normal**, no
sobre el eje X: con la pieza inclinada, esos ejes no coinciden y el marco
acaba delante de la imagen o dentro del muro.

**9. UV de cajas segmentadas.** Las seis caras de `BoxGeometry` no tienen el
mismo número de vértices cuando `widthSegments`, `heightSegments` o
`depthSegments` son distintos. `ajustarTiling()` calcula el bloque de cada cara
por separado. Dividir `uv.count` entre seis convierte parte del muro derecho en
bandas horizontales, porque acaba recibiendo la escala UV del techo.

---

## Contenido

**Diez imágenes de estación** generadas y **dos aportadas** (X y XII).
**Seis piezas arqueológicas reales** en el corredor —tablillas de
Gilgameš y Aga, sello de Mesannepada, Ninurta y Anzu, hombre-escorpión,
Tablilla del Diluvio— y **cinco tablillas cuneiformes generadas por
código**, rotuladas como recreación en el visor.

Los textos usan traducciones de dominio público (W. Muss-Arnolt, 1901;
M. Jastrow y A. T. Clay, 1920). La atribución está en el pie.

Antes de publicar conviene revisar la licencia de cada fotografía
arqueológica en su origen.

---

## Pendiente

- La puerta de Ishtar admite más refinamiento contra la referencia del
  Pergamon: registros verticales de animales en los machones, rosetas del
  archivolto con más detalle.
- Los relieves de estación son imágenes planas con mapa de
  desplazamiento; ganarían con geometría real.
- Sin pruebas en móvil de gama baja: las sombras y el shader de
  envejecido son lo primero que conviene degradar.
- El visor no tiene navegación entre piezas (solo abrir y cerrar).
