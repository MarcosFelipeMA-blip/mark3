"""Gera as versões autocontidas da apresentação a partir de src/.

    index.html          three.js pelo CDN (versão publicada)
    index-offline.html  three.js embutido; roda sem internet (Android, pen drive)

Para regenerar a malha a partir do STEP oficial:
    npm i occt-import-js@0.0.23 && node src/step-to-mesh.cjs 0.02 0.15 ARQUIVO.stp   # grava mesh.js
Para regenerar src/three-bundle.min.js (three 0.160.0 + OrbitControls + RoomEnvironment):
    esbuild entry.js --bundle --minify --format=iife
"""
import pathlib, re
here = pathlib.Path(__file__).parent
t = (here / 'src/template.html').read_text()
t = t.replace('/*MESH*/', (here / 'src/mesh.js').read_text())
t = t.replace('<!--DRAWING-->', (here / 'src/drawing.svg').read_text())
(here / 'index.html').write_text(t)
print('index.html', len(t))

imports = ("import * as THREE from 'three';\n"
           "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';\n"
           "import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';\n")
assert imports in t
off = t.replace(imports, "const { THREE, OrbitControls, RoomEnvironment } = window.__THREE;\n")
off = re.sub(r'<script type="importmap">.*?</script>\n',
             lambda m: '<script>' + (here / 'src/three-bundle.min.js').read_text() + '</script>\n', off, flags=re.S)
(here / 'index-offline.html').write_text(off)
print('index-offline.html', len(off))
