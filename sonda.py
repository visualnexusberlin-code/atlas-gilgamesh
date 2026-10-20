#!/usr/bin/env python3
"""Genera prueba-render.html a partir de index.html.

El contenedor de desarrollo no tiene GPU: el motor corre a ~1 fps sobre
SwiftShader. Con los amortiguadores de atmósfera normales (lerp 0.03–0.04)
una captura llega siempre antes de que la luz, la niebla y el cielo hayan
alcanzado su objetivo, y la imagen miente. Esta sonda:

  1. sustituye el CDN de three.js por la copia local (.render/three.min.js),
  2. fija todos los amortiguadores atmosféricos en 1 para que cada estación
     alcance su estado final en el primer fotograma.

No es publicable y firebase.json no la sirve. Hay que regenerarla tras
cada `construir.py`, o la sonda mide un build viejo.
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent
html = (RAIZ / "index.html").read_text(encoding="utf-8")

local = RAIZ / ".render" / "three.min.js"
if not local.exists():
    sys.exit("falta .render/three.min.js — descárgalo una vez desde el CDN")

html = html.replace(
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
    '<script src=".render/three.min.js"></script>', 1)

# Amortiguadores de atmósfera -> inmediatos.
sust = [
    (r"(escena\.fog\.color\.lerp\(objetivo\.fog,\s*)[\d.]+(\))", r"\g<1>1\g<2>"),
    (r"(escena\.background\.lerp\(objetivo\.fondo,\s*)[\d.]+(\))", r"\g<1>1\g<2>"),
    (r"escena\.fog\.density \+= \(objetivo\.niebla - escena\.fog\.density\) \* [\d.]+;",
     "escena.fog.density = objetivo.niebla;"),
    (r"(luzEstacion\.color\.lerp\(objetivo\.luz,\s*)[\d.]+(\))", r"\g<1>1\g<2>"),
    (r"luzEstacion\.intensity \+= \(objetivo\.int - luzEstacion\.intensity\) \* [\d.]+;",
     "luzEstacion.intensity = objetivo.int;"),
    (r"(luzCielo\.color\.lerp\(objetivo\.luz,\s*)[\d.]+(\))", r"\g<1>1\g<2>"),
    (r"(luzCielo\.groundColor\.lerp\(objetivo\.suelo,\s*)[\d.]+(\))", r"\g<1>1\g<2>"),
    (r"ambiente \+= \(objetivo\.amb - ambiente\) \* [\d.]+;",
     "ambiente = objetivo.amb;"),
]
# Gancho de medición. La escena vive en un cierre y no hay forma de
# alcanzarla desde fuera; sin esto no se pueden medir cajas envolventes ni
# materiales, y toda comprobación se vuelve observación de una captura a 1
# fps, que es justamente lo que no sirve. Vive solo aquí: el build publicado
# no expone nada.
sust.append((r"(\s)escena = new THREE\.Scene\(\);",
             r"\g<1>escena = new THREE.Scene(); window.__esc = escena;"))
sust.append((r"(\s)camara = new THREE\.PerspectiveCamera\(",
             r"\g<1>window.__cam = camara = new THREE.PerspectiveCamera("))
sust.append((r"(\s)render = new THREE\.WebGLRenderer\(",
             r"\g<1>window.__rend = render = new THREE.WebGLRenderer("))

fallos = []
for patron, reemplazo in sust:
    html, n = re.subn(patron, reemplazo, html, count=1)
    if n == 0:
        fallos.append(patron)

(RAIZ / "prueba-render.html").write_text(html, encoding="utf-8")
print("prueba-render.html regenerada")
if fallos:
    print("AVISO — amortiguadores no encontrados (¿cambió el código?):")
    for f in fallos:
        print("  ", f)
