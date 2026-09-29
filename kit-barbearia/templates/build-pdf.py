"""Gera o PDF do produto (entregavel/Kit-30-Dias-Barbearia.pdf) a partir de 02-kit-30-dias.md.

Uso: pip install markdown && python3 templates/build-pdf.py
"""
import os
import pathlib
import subprocess

import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "02-kit-30-dias.md"
OUT_DIR = ROOT / "entregavel"
HTML = OUT_DIR / "kit.html"
PDF = OUT_DIR / "Kit-30-Dias-Barbearia.pdf"

text = SRC.read_text(encoding="utf-8")
# O título e a nota inicial viram a capa; o resto é o miolo.
body_md = text.split("## Como usar", 1)[1]
body = markdown.markdown("## Como usar" + body_md, extensions=["tables"])

CSS = """
@page { size: A4; margin: 18mm 16mm; }
body { font-family: Arial, sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.5; }
.cover { height: 250mm; background: #111; color: #f4efe6; margin: -18mm -16mm 0;
  padding: 40mm 20mm; page-break-after: always; position: relative; }
.cover .pole { position: absolute; top: 0; right: 24mm; width: 8mm; height: 70mm;
  background: repeating-linear-gradient(180deg,#b3261e 0 8mm,#f4efe6 8mm 16mm,#1d4e9e 16mm 24mm); }
.cover p.tag { color: #d4a24c; letter-spacing: .3em; font-weight: bold; font-size: 12pt; }
.cover h1 { font-size: 54pt; line-height: 1; margin: 10mm 0; text-transform: uppercase; }
.cover h1 span { color: #d4a24c; }
.cover .sub { font-size: 16pt; max-width: 140mm; }
.cover .inc { position: absolute; bottom: 30mm; left: 20mm; right: 20mm; font-size: 12pt;
  border-top: 2px solid #d4a24c; padding-top: 6mm; color: #cfc8bc; }
h2 { background: #111; color: #d4a24c; padding: 4mm 6mm; font-size: 18pt; margin-top: 0;
  page-break-before: always; text-transform: uppercase; }
h2:first-of-type { page-break-before: avoid; }
p strong:first-child { color: #8a5f14; font-size: 12.5pt; }
blockquote { background: #f6f1e7; border-left: 4px solid #d4a24c; margin: 2mm 0 6mm;
  padding: 3mm 5mm; page-break-inside: avoid; }
blockquote p { margin: 1mm 0; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #ccc; padding: 2mm 3mm; text-align: left; }
th { background: #f6f1e7; }
hr { display: none; }
"""

COVER = """
<section class="cover"><div class="pole"></div>
  <p class="tag">Kit para barbearias</p>
  <h1>30 dias<br>de posts<br><span>prontos</span></h1>
  <p class="sub">Calendário, legendas e roteiros de Reels para o Instagram da sua barbearia
  postar todo dia sem você perder tempo pensando no que postar.</p>
  <p class="inc">Inclui: 30 posts com legenda · roteiros de Reels · 10 prompts de IA ·
  adaptação para Portugal · templates editáveis</p>
</section>
<p><em>Troque o que está entre colchetes: [NOME DA BARBEARIA], [BAIRRO], [WHATSAPP], [PREÇO].
Os links dos templates editáveis no Canva estão em: [LINK DOS TEMPLATES].</em></p>
"""

OUT_DIR.mkdir(exist_ok=True)
HTML.write_text(
    f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style></head>'
    f"<body>{COVER}{body}</body></html>",
    encoding="utf-8",
)

JS = f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://{HTML}');
  await p.pdf({{ path: '{PDF}', format: 'A4', printBackground: true, preferCSSPageSize: true }});
  await b.close();
}})();
"""
npm_root = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
subprocess.run(["node", "-e", JS], check=True, env={**os.environ, "NODE_PATH": npm_root})
HTML.unlink()
print("ok", PDF)
