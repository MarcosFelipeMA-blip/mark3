"""Monta os kits: Markdown -> PDF, gera as planilhas e compacta cada produto em ZIP.

Uso: python3 build.py
Requer: pip install markdown openpyxl ; Node com Playwright (Chromium).
"""
import html
import os
import re
import shutil
import subprocess
import sys
import zipfile

import markdown

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TMP = os.path.join(HERE, "_tmp")

PRODUTOS = [
    {
        "pasta": "01 - Salao Cheio com IA",
        "cor": "#b0476b", "suave": "#fbf1f4", "linha": "#ead9df",
        "planilha": ("planilha_salao.py", "4 - Planilhas do Salao.xlsx"),
        "docs": [
            ("comece-aqui.md", "1 - Comece Aqui.pdf", "Comece Aqui", "Seu primeiro passo com o Salão Cheio com IA", "Guia rápido"),
            ("ebook.md", "2 - Ebook Salao Cheio com IA.pdf", "Salão Cheio com IA",
             "O método para lotar a agenda, fidelizar clientes e cobrar o preço certo, com a inteligência artificial fazendo o trabalho pesado", "E-book"),
            ("prompts.md", "3 - Biblioteca de Prompts.pdf", "Biblioteca de Prompts",
             "50 prompts prontos para o dia a dia do salão", "Salão Cheio com IA"),
            ("amostra.md", "Amostra gratis - Salao Cheio com IA.pdf", "5 prompts para lotar a agenda",
             "Amostra grátis do kit Salão Cheio com IA", "Presente para você", "VENDAS - para voce"),
        ],
    },
    {
        "pasta": "02 - Corretor com IA",
        "cor": "#1f5f8b", "suave": "#eef4f9", "linha": "#d6e2ec",
        "planilha": ("planilha_corretor.py", "4 - Planilhas do Corretor.xlsx"),
        "docs": [
            ("comece-aqui.md", "1 - Comece Aqui.pdf", "Comece Aqui", "Seu primeiro passo com o Corretor com IA", "Guia rápido"),
            ("ebook.md", "2 - Ebook Corretor com IA.pdf", "Corretor com IA",
             "O método para captar melhor, atender mais rápido e fechar mais negócios, com a inteligência artificial como assistente", "E-book"),
            ("prompts.md", "3 - Biblioteca de Prompts.pdf", "Biblioteca de Prompts",
             "50 prompts prontos para o dia a dia do corretor", "Corretor com IA"),
            ("amostra.md", "Amostra gratis - Corretor com IA.pdf", "5 prompts para vender mais imóveis",
             "Amostra grátis do kit Corretor com IA", "Presente para você", "VENDAS - para voce"),
        ],
    },
    {
        "pasta": "03 - Contas em Dia com IA",
        "cor": "#1e7a4c", "suave": "#edf7f1", "linha": "#d3e6da",
        "planilha": ("planilha_contas.py", "4 - Planilhas Contas em Dia.xlsx"),
        "docs": [
            ("comece-aqui.md", "1 - Comece Aqui.pdf", "Comece Aqui", "Seu primeiro passo com o Contas em Dia com IA", "Guia rápido"),
            ("ebook.md", "2 - Ebook Contas em Dia com IA.pdf", "Contas em Dia com IA",
             "Como entender suas dívidas, sair do rotativo, negociar com segurança e não voltar para o vermelho", "E-book"),
            ("prompts.md", "3 - Biblioteca de Prompts.pdf", "Biblioteca de Prompts",
             "40 prompts prontos para organizar o seu dinheiro", "Contas em Dia com IA"),
            ("amostra.md", "Amostra gratis - Contas em Dia com IA.pdf", "5 prompts para organizar suas contas",
             "Amostra grátis do kit Contas em Dia com IA", "Presente para você", "VENDAS - para voce"),
        ],
    },
]

AUTOR = "[Seu Nome]"

CSS = """
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
body { margin:0; font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif; color:#1f1f1f;
       line-height:1.62; font-size:11pt; }
.cover { height: 257mm; display:flex; flex-direction:column; justify-content:space-between;
         padding: 22mm 4mm 10mm; border-left: 10px solid var(--cor); padding-left: 14mm; page-break-after: always; }
.cover .tag { color:var(--cor); font-weight:700; letter-spacing:.14em; text-transform:uppercase; font-size:10pt; }
.cover h1 { font-size:38pt; line-height:1.05; margin:10mm 0 6mm; color:#141414; border:0; padding:0; }
.cover .sub { font-size:15pt; color:#555; max-width:150mm; }
.cover .autor { font-size:11pt; color:#555; }
.cover .barra { height:6px; width:60mm; background:var(--cor); margin-top:8mm; border-radius:3px; }
h1 { font-size:22pt; color:var(--cor); margin:0 0 4mm; padding-top:2mm; page-break-before: always;
     line-height:1.15; }
h1:first-of-type { page-break-before: auto; }
h2 { font-size:15pt; margin:8mm 0 2mm; color:#141414; page-break-after: avoid; }
h3 { font-size:12pt; margin:6mm 0 1mm; color:var(--cor); page-break-after: avoid; }
p { margin: 0 0 3mm; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin: 1mm 0; }
strong { color:#111; }
pre { background:var(--suave); border-left:4px solid var(--cor); border-radius:6px; padding:3.5mm 4mm;
      white-space:pre-wrap; word-wrap:break-word; font-family: Consolas, "Cascadia Mono", monospace;
      font-size:9.3pt; line-height:1.5; page-break-inside: avoid; margin: 2mm 0 4mm; }
pre::before { content:"PROMPT · copie e cole"; display:block; font-family:"Segoe UI",system-ui,sans-serif;
      font-size:7.5pt; font-weight:700; letter-spacing:.1em; color:var(--cor); margin-bottom:1.5mm; }
code { font-family: Consolas, monospace; font-size:.92em; }
blockquote { margin: 3mm 0 4mm; padding: 3mm 4mm; background:#fff8e6; border-radius:6px; border:0;
             page-break-inside: avoid; }
blockquote p:last-child { margin:0; }
table { width:100%; border-collapse:collapse; margin: 2mm 0 5mm; font-size:9.8pt; page-break-inside: avoid; }
th, td { border:1px solid var(--linha); padding: 1.8mm 2.4mm; text-align:left; vertical-align:top; }
th { background:var(--suave); }
hr { border:0; border-top:1px solid var(--linha); margin:6mm 0; }
.sumario { page-break-after: always; }
.sumario h2 { margin-top:0; }
.sumario ol { font-size:11.5pt; }
.fim { margin-top:10mm; font-size:8.5pt; color:#777; border-top:1px solid var(--linha); padding-top:3mm; }
"""


def render(md_text, titulo, sub, tag, p):
    body = markdown.markdown(md_text, extensions=["tables", "fenced_code", "sane_lists"])
    capitulos = re.findall(r"<h1[^>]*>(.*?)</h1>", body)
    sumario = ""
    if len(capitulos) >= 3:
        itens = "".join(f"<li>{c}</li>" for c in capitulos)
        sumario = f'<section class="sumario"><h2>Sumário</h2><ol>{itens}</ol></section>'
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>{html.escape(titulo)}</title>
<style>:root{{--cor:{p['cor']};--suave:{p['suave']};--linha:{p['linha']};}}{CSS}</style></head><body>
<section class="cover"><div><div class="tag">{html.escape(tag)}</div><h1>{html.escape(titulo)}</h1>
<div class="sub">{html.escape(sub)}</div><div class="barra"></div></div>
<div class="autor">Por {html.escape(AUTOR)}</div></section>
{sumario}
{body}
<p class="fim">© {html.escape(AUTOR)}. Material de uso pessoal do comprador. Proibida a revenda, cópia ou distribuição.</p>
</body></html>"""


def main():
    os.makedirs(TMP, exist_ok=True)
    jobs = []
    for p in PRODUTOS:
        base = os.path.join(ROOT, p["pasta"])
        fontes = os.path.join(base, "fontes")
        entrega = os.path.join(base, "PRODUTO - entregar ao cliente")
        os.makedirs(entrega, exist_ok=True)
        for md_file, pdf_name, titulo, sub, tag, *destino in p["docs"]:
            pasta = os.path.join(base, destino[0]) if destino else entrega
            os.makedirs(pasta, exist_ok=True)
            with open(os.path.join(fontes, md_file), encoding="utf-8") as f:
                page = render(f.read(), titulo, sub, tag, p)
            tmp_html = os.path.join(TMP, f"{p['pasta'][:2]}-{md_file}.html")
            with open(tmp_html, "w", encoding="utf-8") as f:
                f.write(page)
            jobs.append((tmp_html, os.path.join(pasta, pdf_name)))
        script, xlsx = p["planilha"]
        subprocess.run([sys.executable, os.path.join(HERE, script), os.path.join(entrega, xlsx)], check=True)

    subprocess.run(["node", os.path.join(HERE, "pdf.js")] + [x for j in jobs for x in j], check=True)

    zips = os.path.join(ROOT, "ZIPS")
    os.makedirs(zips, exist_ok=True)
    for p in PRODUTOS:
        base = os.path.join(ROOT, p["pasta"])
        dest = os.path.join(zips, p["pasta"] + ".zip")
        with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
            for dirpath, _, files in os.walk(base):
                for fn in sorted(files):
                    full = os.path.join(dirpath, fn)
                    z.write(full, os.path.join(p["pasta"], os.path.relpath(full, base)))
        print("zip:", dest)
    shutil.rmtree(TMP)


if __name__ == "__main__":
    main()
