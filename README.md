# Gilgamesh · La Memoria de Uruk

Experiencia web interactiva sobre la Epopeya de Gilgamesh: doce estaciones
recorridas a pie por un espacio tridimensional que va de los muros estrechos
de Uruk al cielo abierto sobre sus murallas. En español y en inglés. Parte de
**Atlas Humanitas — Biblioteca Visual de la Antigüedad**.

- Proyecto Firebase: `epic-gilgamesh` → https://epic-gilgamesh.web.app (y `/en`)
- Atrio del ecosistema: https://atlas-humanitas.web.app

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `en/index.html` | **Build publicado.** Todo incrustado (Three.js, fuentes, imágenes, sonido). Funciona a doble clic. |
| `metodologia.html`, `en/metodologia.html` | Metodología (EU AI Act, nivel 3). También generadas. |
| `fuente/` | **Lo que se edita.** Motor (`src/`), plantilla, contenidos ES/EN, imágenes, fuentes y `build.py`. |
| `robots.txt`, `sitemap.xml`, `og-gilgamesh.jpg` | Publicados tal cual. |

Ningún HTML de la raíz se edita a mano: se regeneran.

```bash
cd fuente
npm install          # three 0.170 + esbuild (solo para construir)
python3 build.py     # → ../index.html, ../en/index.html, ../metodologia.html, ../en/metodologia.html
```

Requiere Node y Python 3 con Pillow.

## Publicación

Automática: cada push a `main` publica en Firebase mediante
`.github/workflows/deploy.yml`, con el secreto `FIREBASE_SERVICE_ACCOUNT`
(clave de una cuenta de servicio del proyecto `epic-gilgamesh`).

A mano, si hiciera falta:

```bash
firebase login:list            # confirma la cuenta activa
firebase deploy --only hosting --project epic-gilgamesh
```

`firebase.json` publica la raíz e ignora `fuente/`, `assets/`, `referencias/`
y la documentación.

## Contenido y licencias

Doce estaciones con citas en traducción propia sobre versiones de dominio
público (Muss-Arnolt 1901; Jastrow y Clay 1920), seis piezas arqueológicas
reales y un modo *Tablilla* con signos cuneiformes reales. Tipografías bajo
SIL OFL, incrustadas. Sin cookies ni recursos de terceros.

Antes de publicar, revisa la licencia de cada fotografía arqueológica en su
origen. Detalle técnico en `LEEME.md`.
