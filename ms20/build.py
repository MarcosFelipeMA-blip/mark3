"""Gera ms20/index.html (autocontido) a partir de src/template.html, src/mesh.js e src/drawing.svg.

Para regenerar a malha a partir do STEP oficial:
    npm i occt-import-js@0.0.23 && node src/step-to-mesh.cjs 0.02 0.15 ARQUIVO.stp   # grava mesh.js
"""
import pathlib, re
here = pathlib.Path(__file__).parent
t = (here / 'src/template.html').read_text()
t = t.replace('/*MESH*/', (here / 'src/mesh.js').read_text())
t = t.replace('<!--DRAWING-->', (here / 'src/drawing.svg').read_text())
(here / 'index.html').write_text(t)
print('index.html', len(t), 'bytes')
