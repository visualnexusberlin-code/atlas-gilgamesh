# Instrucciones del proyecto

Experiencia interactiva sobre la Epopeya de Gilgamesh dentro de Atlas Humanitas.
Lee `LEEME.md` antes de tocar nada: contiene la arquitectura, los sistemas y las
trampas ya pisadas, cada una de las cuales costó varias iteraciones.

## Fuente y build

- La fuente editable vive en `fuente/`: motor en `fuente/src/` (tex, mat, mundo,
  atmosfera, sonido, main), plantilla `fuente/template.html`, contenidos ES/EN en
  `fuente/contenido/`, metodología en `fuente/metodologia/`.
- `index.html`, `en/index.html`, `metodologia.html` y `en/metodologia.html` son
  builds generados por `fuente/build.py` y **no deben editarse manualmente**.
- Tras cualquier cambio en `fuente/`, ejecuta `python3 build.py` (desde `fuente/`)
  antes de publicar o de hacer commit.
- El trazado del recorrido sale de una sola tabla (`SALAS` en `fuente/src/mundo.js`).
  Después de tocar geometría, `window.__gil.chequeo()` en la consola debe
  devolver solo el falso positivo del arco de la puerta vidriada.
- `firebase.json` publica la raíz del repositorio e ignora las fuentes.
- El proyecto Firebase de producción es `epic-gilgamesh`.

## Contenido

- Las citas de la obra se reproducen verbatim: no parafrasear, modernizar ni
  abreviar. Verifica por búsqueda de cadena, no por inspección visual.
- Hay **una sola capa de citas** por idioma (`.cita p`, generada desde
  `fuente/contenido/content*.json`): el motor 3D lee de ahí el panel. Cualquier cambio en las citas afecta a las tres vistas a
  la vez, y comprobar una no basta para dar las otras por buenas.
- Las traducciones empleadas deben ser de dominio público. Comprueba la licencia
  en cada capa de texto, incluida la capa de lectura accesible.
- Las piezas arqueológicas reales requieren revisar su licencia en origen antes
  de publicar.
- El modo *Tablilla* solo usa signos cuneiformes reales, verificados por su
  nombre Unicode; no se escribe texto moderno en cuneiforme.
- Español e inglés se mantienen sincronizados: un cambio de contenido se hace en
  los dos `content*.json` a la vez.
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
  contraste, reducción de movimiento y rendimiento.
- Nada se carga desde fuera (ni CDN ni Google Fonts): conformidad RGPD sin
  banner. No añadas recursos de terceros.
- Los enlaces entre páginas son absolutos (`/`, `/en`, `/metodologia`) porque
  Firebase sirve con `cleanUrls` y `trailingSlash: false`.
- No añadas credenciales, tokens ni archivos de caché de Firebase al repositorio.
