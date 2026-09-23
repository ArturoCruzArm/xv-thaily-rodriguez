#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Regenera js/photos.js a partir de los archivos de la carpeta img/.

Uso:
    python generate_photo_list.py

Estructura esperada:
    img/           -> foto completa (se abre en el modal / lightbox)
    img/thumb/          -> miniatura del mismo nombre (se usa en la rejilla)

Si una foto no tiene miniatura, la rejilla usa la completa.
Orden natural (foto2 antes que foto10). Acepta .webp .jpg .jpeg .png .avif.
Ver D:\\eventos\\HERRAMIENTAS_FOTOS.md para el convertidor JPEG -> WebP.
"""

import os
import re
import sys

try:
    from urllib.parse import quote          # py3
except ImportError:
    from urllib import quote               # py2

AQUI    = os.path.dirname(os.path.abspath(__file__))
CARPETA = os.path.join(AQUI, 'img')
THUMBS  = os.path.join(CARPETA, 'thumb')
SALIDA  = os.path.join(AQUI, 'js', 'photos.js')
EXTS    = ('.webp', '.jpg', '.jpeg', '.png', '.avif')

CABECERA = """/* ============================================================
   LISTA DE FOTOS - XV Anos Thaily Rodríguez
   NO editar a mano: se regenera con  python generate_photo_list.py
   Fotos: %d   |   Con miniatura: %d
   ============================================================ */

// Foto completa: se abre en el modal del selector y en el lightbox.
window.PHOTOS = [
%s
];

// Miniatura: es lo que carga la rejilla. Si falta, cae a la completa.
window.PHOTO_THUMBS = [
%s
];

// Nombre de archivo original (mismo orden). Se guarda en Supabase
// (datos.filename) para localizar el archivo maestro.
window.PHOTO_FILES = [
%s
];
"""


def clave_natural(nombre):
    partes = re.split(r'(\d+)', nombre.lower())
    return [int(p) if p.isdigit() else p for p in partes]


def main():
    if not os.path.isdir(CARPETA):
        print('No existe la carpeta: %s' % CARPETA)
        return 1

    archivos = [f for f in os.listdir(CARPETA)
                if f.lower().endswith(EXTS)
                and not f.startswith('.')
                and os.path.isfile(os.path.join(CARPETA, f))]
    archivos.sort(key=clave_natural)

    if not archivos:
        print('Sin imagenes en %s (se genera lista vacia).' % CARPETA)

    # Las rutas van codificadas: hay archivos con espacios y parentesis
    # (IMG_1894 (2).webp) que sin %20 dan 404 en GitHub Pages.
    url = lambda p: quote(p, safe='/')

    hay_thumbs = os.path.isdir(THUMBS)
    con_thumb = 0
    thumbs = []
    for f in archivos:
        if hay_thumbs and os.path.isfile(os.path.join(THUMBS, f)):
            thumbs.append(url('img/thumb/%s' % f))
            con_thumb += 1
        else:
            thumbs.append(url('img/%s' % f))

    bloque = lambda xs: ',\n'.join('    "%s"' % x for x in xs)

    with open(SALIDA, 'w', encoding='utf-8') as fh:
        fh.write(CABECERA % (
            len(archivos), con_thumb,
            bloque(url('img/%s' % f) for f in archivos),
            bloque(thumbs),
            bloque(archivos),
        ))

    print('OK  %d fotos (%d con miniatura) -> %s' % (len(archivos), con_thumb, SALIDA))
    if archivos and con_thumb < len(archivos):
        print('AVISO: %d fotos sin miniatura en img/thumb/' % (len(archivos) - con_thumb))
    print('Recuerda subir la version del script en los HTML:  js/photos.js?v=N')
    return 0


if __name__ == '__main__':
    sys.exit(main())
