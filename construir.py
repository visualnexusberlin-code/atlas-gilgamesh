#!/usr/bin/env python3
"""
Reconstruye index.html (archivo único, autosuficiente) a partir de
index-dev.html + assets/.

    python3 construir.py

Trabaja en index-dev.html, que referencia ./assets/ y pesa 205 KB en vez
de 3 MB: es el que se puede abrir y editar cómodamente en un IDE. Cuando
quieras publicar, este script incrusta las imágenes en base64 y produce
el index.html de una sola pieza, que funciona a doble clic sin servidor.
"""

import base64
import datetime
import mimetypes
import pathlib
import re
import subprocess
import sys

RAIZ = pathlib.Path(__file__).parent
ORIGEN = RAIZ / "index-dev.html"
DESTINO = RAIZ / "index.html"


def incrustar(coincidencia):
    ruta = RAIZ / "assets" / coincidencia.group(1)
    if not ruta.exists():
        sys.exit(f"Falta el archivo: {ruta}")
    tipo = mimetypes.guess_type(ruta.name)[0] or "image/jpeg"
    datos = base64.b64encode(ruta.read_bytes()).decode()
    return f"data:{tipo};base64,{datos}"


def main():
    if not ORIGEN.exists():
        sys.exit("No encuentro index-dev.html")

    html = ORIGEN.read_text(encoding="utf-8")

    # Sello de versión: sin él, una copia antigua en Descargas es
    # indistinguible del build recién hecho.
    try:
        commit = subprocess.run(["git", "-C", str(RAIZ), "rev-parse", "--short", "HEAD"],
                                capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        commit = ""
    sello = datetime.datetime.now().strftime("build %d/%m %H:%M")
    if commit:
        sello += " · " + commit
    html = html.replace("{{SELLO}}", sello)

    html, n = re.subn(r"\./assets/([\w.\-]+)", incrustar, html)

    DESTINO.write_text(html, encoding="utf-8")
    print(f"{n} imágenes incrustadas")
    print(f"sello: {sello}")
    print(f"{DESTINO.name}: {len(html) // 1024} KB")


if __name__ == "__main__":
    main()
