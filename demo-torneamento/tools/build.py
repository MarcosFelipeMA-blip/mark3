"""Gera a página final: injeta a malha em src/template.html.

- dist/artifact.html : corpo da página (publicado como Artifact no claude.ai)
- index.html         : página completa para abrir direto no navegador / GitHub Pages
"""
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
tpl = (root / "src" / "template.html").read_text(encoding="utf-8")
mesh = (root / "modelo" / "mesh.json").read_text(encoding="utf-8")
body = tpl.replace("__MESH__", mesh)
(root / "dist").mkdir(exist_ok=True)
(root / "dist" / "artifact.html").write_text(body, encoding="utf-8")
head = '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n'
(root / "index.html").write_text(head + body + "\n</body>\n</html>\n", encoding="utf-8")
print("ok", len(body) // 1024, "KB")
