# Gilgamesh · La Memoria de Uruk

Experiencia web interactiva sobre la Epopeya de Gilgamesh: doce estaciones
recorridas en primera persona por un corredor mesopotámico. Parte de
**Atlas Humanitas — Biblioteca Visual de la Antigüedad**.

- Proyecto Firebase: `epic-gilgamesh`
- Atrio del ecosistema: https://atlas-humanitas.web.app
- Tipo de proyecto: web estática, sin proceso de compilación

## Los dos archivos

| Archivo | Para qué |
|---|---|
| `index-dev.html` | **El que se edita.** Referencia `./assets/`. Necesita servidor local. |
| `index.html` | **El que se publica.** Todo incrustado; funciona a doble clic, sin servidor. |

```bash
# editar
python3 -m http.server 8000      # y abrir localhost:8000/index-dev.html

# reconstruir antes de publicar
python3 construir.py             # index-dev.html + assets → index.html
```

`construir.py` incrusta las 28 imágenes en base64. **Nunca edites `index.html`
a mano**: se regenera y perderías los cambios.

El detalle de arquitectura, sistemas y trampas ya pisadas está en `LEEME.md`.

## Publicación

`firebase.json` publica la raíz del repositorio e ignora las fuentes
(`index-dev.html`, `construir.py`, `assets/`, `referencias/`, documentación).
Lo que llega a producción son los HTML, `robots.txt` y `sitemap.xml`.

```bash
python3 construir.py
firebase deploy --only hosting
```

Confirma la cuenta activa de Firebase antes de cualquier despliegue de
producción: este ordenador conserva más de una cuenta autenticada.

## Contenido y licencias

Doce estaciones con las citas de la obra, seis piezas arqueológicas reales y
cinco tablillas cuneiformes generadas por código y rotuladas como recreación.

Antes de publicar, revisa la licencia de cada fotografía arqueológica en su
origen y la de la traducción empleada en las citas.
