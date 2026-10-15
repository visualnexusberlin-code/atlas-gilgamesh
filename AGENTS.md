# Instrucciones del proyecto

Experiencia interactiva sobre la Epopeya de Gilgamesh dentro de Atlas Humanitas.
Lee `LEEME.md` antes de tocar nada: contiene la arquitectura, los sistemas y las
trampas ya pisadas, cada una de las cuales costó varias iteraciones.

## Fuente y build

- La fuente editable es `index-dev.html`; `index.html` es un build generado por
  `construir.py` y **no debe editarse manualmente**.
- Tras cualquier cambio en `index-dev.html` o en `assets/`, ejecuta
  `python3 construir.py` antes de publicar o de hacer commit.
- `firebase.json` publica la raíz del repositorio e ignora las fuentes.
- El proyecto Firebase de producción es `epic-gilgamesh`.

## Contenido

- Las citas de la obra se reproducen verbatim: no parafrasear, modernizar ni
  abreviar. Verifica por búsqueda de cadena, no por inspección visual.
- Hay **una sola capa de citas** (`.cita p`): el motor 3D lee de ahí tanto el
  panel como el visor. Cualquier cambio en las citas afecta a las tres vistas a
  la vez, y comprobar una no basta para dar las otras por buenas.
- Las traducciones empleadas deben ser de dominio público. Comprueba la licencia
  en cada capa de texto, incluida la capa de lectura accesible.
- Las piezas arqueológicas reales requieren revisar su licencia en origen antes
  de publicar. Las tablillas generadas por código van rotuladas como recreación.
- Avisos EU AI Act en tres niveles: general en el pie, por recurso junto a cada
  imagen generada, y página `metodologia.html` completa y enlazada.
- La obra entera debe poder leerse sin JavaScript: la capa semántica es a la vez
  el respaldo accesible, la capa indexable y la fuente de datos del motor.

## Dirección de arte

- Conserva la progresión atmosférica entre cámaras y el hilo de lapislázuli como
  único elemento constante del recorrido.
- La rima espacial entre la cámara de Enkidu (estaciones II–III) y la misma
  cámara vaciada (estación VIII) es intencional y no se altera.

## Forma de trabajo

- Las decisiones editoriales sobre el contenido se señalan explícitamente para
  revisión del autor; nunca se aplican en silencio.
- El código es la verdad, no el relato de lo que hace: verifica con búsqueda de
  cadena después de cada cambio.
- No ejecutes un despliegue de producción sin petición explícita y sin confirmar
  primero la cuenta activa de Firebase.
- Antes de publicar, comprueba escritorio y móvil, navegación por teclado,
  contraste, reducción de movimiento, rendimiento y comportamiento si fallan los
  recursos CDN (three.js y Google Fonts se cargan desde fuera).
- No añadas credenciales, tokens ni archivos de caché de Firebase al repositorio.
