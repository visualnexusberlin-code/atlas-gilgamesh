# Gilgamesh — La Memoria de Uruk · versión 2.3 (noviembre 2026)

Motor reconstruido desde cero en noviembre de 2026. La versión de agosto
(`index-dev.html` + `construir.py`) sigue en el historial de git.

## Archivos

`index.html` (español) y `en/index.html` (inglés), 3,6 MB cada uno, sus
metodologías y `sitemap.xml` con las versiones enlazadas por `hreflang`. Cada página es autosuficiente: Three.js, fuentes, imágenes, piezas
arqueológicas y sonido van dentro. Se abre con doble clic, sin servidor y sin
conexión. No carga nada de terceros (ni Google Fonts ni CDN), no usa cookies y
no registra datos: conforme al RGPD sin banner.

## Qué cambia respecto a la versión de agosto

- **Escala humana**: ojos a 1,65 m y muros de 10 a 14 m. Antes, a 3,4 m.
- **Recorrido por paradas**: en cada estación la cámara se detiene y se gira
  hacia la estela del relieve, que mira siempre al visitante. El texto ocupa
  la otra mitad de la pantalla y se retira durante el tránsito.
- **Trazado desde una sola tabla** (`SALAS` en `src/mundo.js`): el paso libre
  se reserva al construir. `__gil.chequeo()` en la consola comprueba que
  ningún volumen invade el camino.
- **Luz**: sol con sombras que viaja con el visitante, cielo procedural con
  nubes y estrellas, reflejos del cielo en el vidriado, el oro y el agua,
  oclusión ambiental (GTAO), bloom, gradación de color por estación. La
  atmósfera se interpola de forma continua al caminar.
- **Materiales PBR procedurales** con UV en metros: sin repetición visible.
- **Salas**: umbrales de jambas escalonadas y almenas; bosque de cedros con
  pisos de ramaje y haces de luz; Humbaba con tormenta; Ishtar con ladrillo
  vidriado y friso de toros; cámara de Enkidu vacía, de noche; garganta de
  Mashu con los hombres-escorpión y la puerta del Sol; Diluvio con agua que
  sube, lluvia y truenos; puerta vidriada de frente; escalinata; murallas con
  bastión, mirador y la ciudad de Uruk con su zigurat.
- **v2.1**: estelas separadas del muro y de la roca; portales sin solapes ni
  costuras (texturas ancladas al mundo); hiladas horizontales en la puerta
  vidriada; el Diluvio inunda también la calzada y llueve con fuerza; final
  con muralla curva que abraza la ciudad, torreones con vigas de cedro,
  zigurat en talud con contrafuertes, casas variadas con vigas y toldos,
  templos, huertos, canales, árboles, antemuro con foso y colinas.
- **v2.2**: el terreno de la ciudad ya no tapa el agua del Diluvio (sólo
  aparece pasado el Ascenso); el agua llega crecida y sube hasta cubrir la
  calzada; Uruk intramuros con 46 jardines, árboles de patio, calles
  arboladas y cientos de palmeras instanciadas.
- **v2.3 · inglés**: versión completa en `/en/` (interfaz, doce estaciones,
  citas, piezas, metadatos, JSON-LD). Enlace de idioma en el umbral, en la
  barra del recorrido y en el pie.
- **v2.3 · modo tablilla**: interruptor «Tablilla / Tablet» que muestra signos
  cuneiformes reales, todos comprobados por su nombre Unicode: el íncipit
  *ša nag-ba i-mu-ru* en el umbral, numerales babilónicos en la espina, y
  nombres propios por estación (ᵈGIŠ, ᵈen-ki-dù, URU.UNUG, ḫu-wa-wa,
  ᵈINANNA, ᵈUTU, KUR ma-šu, UD.ZI) en el panel, en la lectura y grabados en el
  zócalo de cada estela. Tipografía Noto Sans Cuneiform (OFL), reducida a los
  33 signos usados (9 KB). La preferencia se recuerda en el navegador
  (localStorage, sin cookies). No es una traducción de los textos.
- **Testimonios**: las seis piezas arqueológicas en atriles; un clic las abre.
- **Sonido sintetizado**: bordón, viento, lluvia, fuego, trueno.
- **Citas**: traducción propia sobre Muss-Arnolt (1901) y Jastrow/Clay (1920).
  La versión de agosto aún tenía citas de Bartra en la capa de lectura.

## Decisiones editoriales para revisar

- Estación XII: texto del regreso a Uruk y las murallas (aprobado).
- La imagen de la estación XII se generó con el prompt del espíritu de
  Enkidu; se mantiene porque su descripción (figura alada ante una hendidura
  de luz) funciona como umbral final. El prompt original queda en `data-prompt`.
- Fotografías arqueológicas: revisar la licencia de cada una en su origen
  antes de publicar.

## Pendiente anotado

- Un verso acadio original por estación (requiere fuentes de dominio público
  verificadas o revisión de un asiriólogo).

- **Ampliar las estelas con un clic**, como en el build de agosto. Queda
  aparcado hasta decidir si aquel comportamiento era el deseado; el visor de
  piezas ya existe y puede reutilizarse.
- Casas de Uruk: hoy son volúmenes con azotea, vigas y toldos; el siguiente
  salto sería la casa de patio y algo de vida (humo, figuras).

## Navegación

Rueda, flechas, barra espaciadora, deslizar, o las cuñas de la derecha.
Esc sale. `?calidad=media` fuerza el modo ligero (automático en móvil).
Con `prefers-reduced-motion` los desplazamientos son cortes con fundido.

## Código fuente

Todo en `fuente/`: `src/` (tex, mat, mundo, atmosfera, sonido, main),
`template.html`, `metodologia/`, `contenido/` y `build.py`, que empaqueta con
esbuild y escribe los HTML de la raíz.

## Despliegue

Ver `README.md`. **No desplegar sin aprobación del autor** y sin confirmar la
cuenta activa de Firebase.
