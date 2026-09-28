"""Monta o desenho 2D do NMRV 063 (2 folhas A3) a partir das linhas extraídas do modelo 3D.

Uso:  python3 tools/make_drawing.py desenho2d.json pasta_saida
Gera: NMRV063-folha1-vistas.dxf, NMRV063-folha2-explodida.dxf e NMRV063-desenho.pdf
Requer: ezdxf e pymupdf (pip install ezdxf pymupdf)
"""
import json
import math
import sys
from pathlib import Path

import ezdxf
import pymupdf
from ezdxf.addons.drawing import Frontend, RenderContext, config, layout
from ezdxf.addons.drawing import pymupdf as pdfbackend
from ezdxf.enums import TextEntityAlignment as TA

DATA = json.loads(Path(sys.argv[1]).read_text())
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else ".")
OUT.mkdir(parents=True, exist_ok=True)
DATE = "28/09/2026"
TITLE = "REDUTOR COROA E ROSCA SEM FIM NMRV 063 · i = 30:1"

# Lista de peças: item -> ids das peças do modelo
BOM = [
    (1, ["flScrews"], 4, "Parafuso Allen", "M6 × 14 · classe 8.8", "Aço"),
    (2, ["flange"], 1, "Flange de entrada B14", "Motor carcaça 71/80", "Alumínio"),
    (3, ["sealIn"], 1, "Retentor de entrada", "30 × 42 × 7", "NBR"),
    (4, ["cvScrews"], 4, "Parafuso Allen", "M8 × 16 · classe 8.8", "Aço"),
    (5, ["cover"], 1, "Tampa lateral", "Centragem Ø80 h8", "Alumínio"),
    (6, ["sealF", "sealB"], 2, "Retentor de saída", "40 × 52 × 6", "NBR"),
    (7, ["bearF", "bearB"], 2, "Rolamento rígido de esferas", "6008-2RS · 40 × 68 × 15", "Aço"),
    (8, ["wheel"], 1, "Coroa com eixo vazado", "Z = 30 · furo Ø25 H7 · chaveta 8", "Bronze / ferro fundido"),
    (9, ["cap"], 1, "Tampa cega do sem-fim", "Ø66", "Aço"),
    (10, ["bearWL", "bearWR"], 2, "Rolamento rígido de esferas", "6206-2RS · 30 × 62 × 16", "Aço"),
    (11, ["worm"], 1, "Rosca sem-fim", "1 entrada · furo Ø19 · chaveta 6", "Aço temperado e retificado"),
    (12, ["housing"], 1, "Carcaça", "Tamanho 063", "Alumínio"),
    (13, [], "0,25 L", "Óleo lubrificante", "Sintético ISO VG 320", "—"),
]
TECH = [
    ("Modelo", "NMRV 063"), ("Redução (i)", "30:1"), ("Rotação de entrada", "1.700 rpm"),
    ("Rotação de saída (n2)", "56,7 rpm"), ("Potência do motor", "1,5 cv"), ("Torque de saída (M2M)", "137,5 Nm"),
    ("Torque nominal (M2Nom)", "166 Nm"), ("Rendimento", "74 %"), ("Fator de serviço", "1,2"),
    ("Carga radial máx. (FR2)", "3.050 N"), ("Distância entre centros", "63 mm"), ("Massa", "6,2 kg"),
]
# Hachura por peça (padrão, ângulo, escala); retentores em preto sólido
HATCH = {
    "housing": ("ANSI31", 0, 1.0), "cover": ("ANSI31", 90, 1.0), "flange": ("ANSI31", 90, 0.7),
    "wheel#0": ("ANSI31", 90, 0.45), "wheel#1": ("ANSI37", 0, 0.5), "worm": ("ANSI31", 0, 0.35),
    "cap": ("ANSI31", 90, 0.3), "screw": ("ANSI31", 0, 0.25), "bear": ("ANSI31", 90, 0.22),
}


def new_doc():
    doc = ezdxf.new("R2010", setup=True, units=4)
    doc.header["$MEASUREMENT"] = 1
    doc.header["$LTSCALE"] = 6
    doc.styles.new("DESENHO", dxfattribs={"font": "DejaVuSans.ttf"})
    for name, lw, color, lt in [
        ("MOLDURA", 70, 7, "Continuous"), ("VISIVEL", 35, 7, "Continuous"), ("CORTE", 50, 7, "Continuous"),
        ("HACHURA", 13, 8, "Continuous"), ("CENTRO", 18, 7, "CENTER"), ("COTA", 18, 7, "Continuous"),
        ("TEXTO", 25, 7, "Continuous"), ("PLANO", 50, 7, "Continuous"), ("BALAO", 25, 7, "Continuous"),
    ]:
        doc.layers.add(name, color=color, lineweight=lw, linetype=lt)
    ds = doc.dimstyles.new("COTA")
    ds.dxf.dimtxsty = "DESENHO"
    for k, v in dict(dimtxt=2.5, dimasz=2.2, dimexe=1.5, dimexo=1.0, dimgap=0.8, dimtad=1, dimdec=0, dimdsep=44).items():
        ds.set_dxf_attrib(k, v)
    return doc, doc.modelspace()


def text(msp, s, x, y, h=2.5, align=TA.MIDDLE_LEFT, layer="TEXTO"):
    msp.add_text(s, height=h, dxfattribs={"style": "DESENHO", "layer": layer}).set_placement((x, y), align=align)


def rect(msp, x0, y0, x1, y1, layer="MOLDURA"):
    msp.add_lwpolyline([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], close=True, dxfattribs={"layer": layer})


def frame(msp, sheet_name, sheet_no, scale_txt):
    rect(msp, 0, 0, 420, 297, "COTA")
    rect(msp, 25, 10, 410, 287)
    x0, x1, x2, x3 = 225, 318, 364, 410
    rect(msp, x0, 10, x3, 62)
    for y in (24, 36, 48):
        msp.add_line((x0, y), (x3, y), dxfattribs={"layer": "MOLDURA"})
    for x, y0, y1 in ((x1, 10, 48), (x2, 10, 36)):
        msp.add_line((x, y0), (x, y1), dxfattribs={"layer": "MOLDURA"})
    lab = lambda s, x, y: text(msp, s, x + 1.5, y - 2.2, 1.6)
    lab("TÍTULO", x0, 62); text(msp, TITLE, x0 + 3, 54, 3.2)
    lab("CONTEÚDO", x0, 48); text(msp, sheet_name, x0 + 3, 41, 3)
    lab("FOLHA", x1, 48); text(msp, f"{sheet_no}/2", x1 + 23, 41, 3.5, TA.MIDDLE_CENTER)
    lab("PROJETO E DESENHO", x0, 36); text(msp, "Marcos Felipe", x0 + 3, 29, 3)
    lab("DATA", x1, 36); text(msp, DATE, x1 + 3, 29, 2.8)
    lab("ESCALA", x2, 36); text(msp, scale_txt, x2 + 23, 29, 2.8, TA.MIDDLE_CENTER)
    lab("REFERÊNCIA", x0, 24); text(msp, "Catálogo geral JADD · NMRV 063", x0 + 3, 17.5, 2.4)
    text(msp, "Geometria interna representativa", x0 + 3, 13, 1.8)
    lab("UNIDADE", x1, 24); text(msp, "mm", x1 + 3, 16, 3)
    lab("PROJEÇÃO", x2, 24); text(msp, "1º diedro", x2 + 3, 13, 1.8)
    # símbolo do 1º diedro: tronco de cone de perfil (esquerda) e de frente (direita)
    cx, cy = 392, 17
    msp.add_lwpolyline([(cx - 12, cy - 2.5), (cx - 4, cy - 4), (cx - 4, cy + 4), (cx - 12, cy + 2.5)], close=True, dxfattribs={"layer": "TEXTO"})
    msp.add_circle((cx + 6, cy), 4, dxfattribs={"layer": "TEXTO"})
    msp.add_circle((cx + 6, cy), 2.5, dxfattribs={"layer": "TEXTO"})


class View:
    def __init__(self, ox, oy, s):
        self.ox, self.oy, self.s = ox, oy, s

    def p(self, u, v):
        return (self.ox + u * self.s, self.oy + v * self.s)


def lines(msp, view, segs, layer="VISIVEL"):
    for a in segs:
        msp.add_line(view.p(a[0], a[1]), view.p(a[2], a[3]), dxfattribs={"layer": layer})


def draw_view(msp, name, view):
    for segs in DATA["views"][name]["byPart"].values():
        lines(msp, view, segs)


def chain(segs, tol=0.02):
    key = lambda x, y: (round(x / tol), round(y / tol))
    adj, keys = {}, []
    for i, (a, b, c, d) in enumerate(segs):
        ka, kb = key(a, b), key(c, d)
        keys.append((ka, kb))
        if ka != kb:
            adj.setdefault(ka, []).append((i, kb, (c, d)))
            adj.setdefault(kb, []).append((i, ka, (a, b)))
    used, loops, opens = set(), [], []
    for i, (a, b, c, d) in enumerate(segs):
        ka, kb = keys[i]
        if i in used or ka == kb:
            continue
        used.add(i)
        pts, cur = [(a, b), (c, d)], kb
        while cur != ka:
            nxt = next(((j, kk, p) for j, kk, p in adj.get(cur, []) if j not in used), None)
            if not nxt:
                break
            used.add(nxt[0]); pts.append(nxt[2]); cur = nxt[1]
        (loops if cur == ka and len(pts) > 3 else opens).append(pts[:-1] if cur == ka else pts)
    return loops, opens


def hatch_style(key):
    pid = key.split("#")[0]
    if key in HATCH:
        return HATCH[key]
    if pid.startswith("seal"):
        return None
    if "Screws" in pid:
        return HATCH["screw"]
    if pid.startswith("bear"):
        return HATCH["bear"]
    return HATCH.get(pid, ("ANSI31", 0, 0.5))


def draw_section(msp, cut, view):
    for key, segs in DATA["sections"][cut].items():
        loops, opens = chain(segs)
        for pts in loops:
            msp.add_lwpolyline([view.p(*q) for q in pts], close=True, dxfattribs={"layer": "CORTE"})
        for pts in opens:
            msp.add_lwpolyline([view.p(*q) for q in pts], dxfattribs={"layer": "CORTE"})
        if not loops:
            continue
        style = hatch_style(key)
        h = msp.add_hatch(color=7 if style is None else 8, dxfattribs={"layer": "HACHURA"})
        if style:
            h.set_pattern_fill(style[0], scale=style[2], angle=style[1])
        for pts in loops:
            h.paths.add_polyline_path([view.p(*q) for q in pts], is_closed=True)


def center(msp, view, p0, p1):
    msp.add_line(view.p(*p0), view.p(*p1), dxfattribs={"layer": "CENTRO"})


def dim(msp, view, p1, p2, base, angle, txt=None):
    d = msp.add_linear_dim(base=view.p(*base), p1=view.p(*p1), p2=view.p(*p2), angle=angle, dimstyle="COTA",
                           text=txt if txt else "<>", override={"dimlfac": 1 / view.s}, dxfattribs={"layer": "COTA"})
    d.render()


def arrow(msp, x, y, dx, dy, size=3):
    n = math.hypot(dx, dy); dx, dy = dx / n, dy / n
    tip = (x + dx * size * 2.2, y + dy * size * 2.2)
    msp.add_line((x, y), tip, dxfattribs={"layer": "PLANO"})
    h = msp.add_hatch(color=7, dxfattribs={"layer": "PLANO"})
    h.paths.add_polyline_path([tip, (tip[0] - dx * size - dy * size * 0.35, tip[1] - dy * size + dx * size * 0.35),
                               (tip[0] - dx * size + dy * size * 0.35, tip[1] - dy * size - dx * size * 0.35)], is_closed=True)


def cut_mark(msp, view, a, b, letter, sight):
    """Indicação do plano de corte: traços grossos nas pontas, setas no sentido de observação e letras."""
    (u0, v0), (u1, v1) = a, b
    du, dv = u1 - u0, v1 - v0
    n = math.hypot(du, dv); du, dv = du / n, dv / n
    msp.add_line(view.p(u0, v0), view.p(u1, v1), dxfattribs={"layer": "CENTRO"})
    for (u, v), sgn in (((u0, v0), 1), ((u1, v1), -1)):
        p = view.p(u, v); q = view.p(u + du * 12 * sgn, v + dv * 12 * sgn)
        msp.add_line(p, q, dxfattribs={"layer": "PLANO"})
        arrow(msp, p[0], p[1], sight[0], sight[1])
        text(msp, letter, p[0] + sight[0] * 10 - du * 4 * sgn, p[1] + sight[1] * 10 - dv * 4 * sgn, 4, TA.MIDDLE_CENTER)


def export_pdf(docs, path):
    out = pymupdf.open()
    cfg = config.Configuration(background_policy=config.BackgroundPolicy.WHITE,
                               color_policy=config.ColorPolicy.COLOR, lineweight_scaling=1.0,
                               hatch_policy=config.HatchPolicy.NORMAL)
    for doc in docs:
        be = pdfbackend.PyMuPdfBackend()
        Frontend(RenderContext(doc), be, config=cfg).draw_layout(doc.modelspace(), finalize=True)
        page = layout.Page(420, 297, layout.Units.mm, margins=layout.Margins.all(0))
        pdf = pymupdf.open("pdf", be.get_pdf_bytes(page, settings=layout.Settings(fit_page=False, scale=1)))
        out.insert_pdf(pdf)
    out.save(path)
    return out


# ------------------------------------------------------------------ Folha 1: vistas e cortes, 1:2
doc1, m1 = new_doc()
S = 0.5
FRONT, SIDE, TOP = View(150, 196, S), View(55, 196, S), View(150, 90, S)
AA, BB = View(266, 196, S), View(366, 196, S)
draw_view(m1, "front", FRONT); draw_view(m1, "side", SIDE); draw_view(m1, "top", TOP)
draw_view(m1, "aa", AA); draw_section(m1, "aa", AA)
draw_view(m1, "bb", BB); draw_section(m1, "bb", BB)
for v in (FRONT, AA):
    center(m1, v, (-80, 0), (80, 0)); center(m1, v, (0, -80), (0, 80)); center(m1, v, (-80, 63), (102, 63))
for v in (SIDE, BB):
    center(m1, v, (-66, 0), (66, 0)); center(m1, v, (0, -80), (0, 130)); center(m1, v, (-30, 63), (30, 63))
center(m1, TOP, (-84, 0), (104, 0)); center(m1, TOP, (0, -66), (0, 66))
# cotas do catálogo
dim(m1, FRONT, (-72, -72), (-40, 102), (-104, 0), 90, "174 (E)")
dim(m1, FRONT, (-72, -72), (0, 0), (-90, 0), 90, "72 (H)")
dim(m1, FRONT, (0, 0), (-40, 102), (-90, 0), 90, "102 (R)")
dim(m1, FRONT, (0, 0), (95, 63), (116, 0), 90, "63 (I)")
dim(m1, FRONT, (-72, -72), (72, -72), (0, -95), 0, "144 (C)")
dim(m1, FRONT, (-50, -72), (50, -72), (0, -84), 0, "100 (A)")
dim(m1, FRONT, (-72, 40), (0, 0), (0, 138), 0, "72 (H)")
dim(m1, FRONT, (0, 0), (95, 123), (0, 138), 0, "95 (G)")
dim(m1, SIDE, (-56, 0), (56, 0), (0, -104), 0, "112 (G1)")
dim(m1, SIDE, (-51.5, -72), (51.5, -72), (0, -94), 0, "103 (L)")
dim(m1, SIDE, (-42.5, -72), (42.5, -72), (0, -84), 0, "85 (K)")
dim(m1, SIDE, (56, -40), (56, 40), (72, 0), 90, "Ø80 h8 (N)")
dim(m1, BB, (-40, -12.5), (-40, 12.5), (-76, 0), 90, "Ø25 H7 (D)")
# planos de corte indicados na vista superior
cut_mark(m1, TOP, (0, 74), (0, -74), "B", (-1, 0))
cut_mark(m1, TOP, (-96, 0), (116, 0), "A", (0, 1))
for v, t, (u, vv) in ((SIDE, "VISTA LATERAL DIREITA", (0, -114)), (FRONT, "VISTA FRONTAL", (10, -106)),
                      (TOP, "VISTA SUPERIOR", (58, -90)), (AA, "CORTE A-A", (10, -106)), (BB, "CORTE B-B", (0, -114))):
    x, y = v.p(u, vv); text(m1, t, x, y, 3.5, TA.MIDDLE_CENTER)
m1.add_mtext("NOTAS\\P1. Cotas em mm. Cotas externas conforme catálogo geral JADD, NMRV 063 (letras entre parênteses).\\P"
             "2. Dentes, rolamentos e retentores são representativos; confirme com o fabricante.\\P"
             "3. Lubrificação permanente: 0,25 L de óleo sintético ISO VG 320.\\P"
             "4. Linhas extraídas do modelo 3D com remoção de linhas ocultas.",
             dxfattribs={"style": "DESENHO", "char_height": 2.3, "width": 175, "insert": (230, 132), "layer": "TEXTO"})
frame(m1, "Vistas, cortes A-A e B-B e cotas", 1, "1:2")
doc1.saveas(OUT / "NMRV063-folha1-vistas.dxf")

# ------------------------------------------------------------------ Folha 2: vista explodida, lista de peças, dados
doc2, m2 = new_doc()


def fit_scale(bounds, w, h):
    for s in (1 / 2, 1 / 2.5, 1 / 3, 1 / 4, 1 / 5, 1 / 6):
        if (bounds["u1"] - bounds["u0"]) * s <= w and (bounds["v1"] - bounds["v0"]) * s <= h:
            return s
    return 1 / 8


eb = DATA["views"]["exploded"]["bounds"]
se = fit_scale(eb, 235, 160)
EXP = View(30 + 125 - (eb["u0"] + eb["u1"]) / 2 * se, 78 + 100 - (eb["v0"] + eb["v1"]) / 2 * se, se)
draw_view(m2, "exploded", EXP)
ib = DATA["views"]["iso"]["bounds"]
si = fit_scale(ib, 95, 80)
ISO = View(357 - (ib["u0"] + ib["u1"]) / 2 * si, 150 - (ib["v0"] + ib["v1"]) / 2 * si, si)
draw_view(m2, "iso", ISO)
fr = lambda s: f"1:{round(1 / s, 1):g}".replace(".", ",")
text(m2, f"VISTA EXPLODIDA · ESC. {fr(se)}", 30, 280, 3.5, TA.MIDDLE_LEFT)
text(m2, f"MONTADO · ESC. {fr(si)}", 357, 100, 3, TA.MIDDLE_CENTER)

# balões: âncora = ponto visível da peça mais perto do centro dela; balão empurrado para fora do conjunto
cx, cy = EXP.p((eb["u0"] + eb["u1"]) / 2, (eb["v0"] + eb["v1"]) / 2)
anchors = []
for item, ids, *_ in BOM:
    if not ids:
        continue
    pid = ids[0]
    c = DATA["centers"]["exploded"][pid]
    best = min(((((a[0] + a[2]) / 2 - c[0]) ** 2 + ((a[1] + a[3]) / 2 - c[1]) ** 2, (a[0] + a[2]) / 2, (a[1] + a[3]) / 2)
                for a in DATA["views"]["exploded"]["byPart"][pid]), default=None)
    if best:
        anchors.append((item, *EXP.p(best[1], best[2])))
# balões numa elipse em volta do desenho, na direção de cada peça, com separação mínima entre eles
bx0, by0 = EXP.p(eb["u0"], eb["v0"]); bx1, by1 = EXP.p(eb["u1"], eb["v1"])
ea, eb2 = (bx1 - bx0) / 2 + 22, (by1 - by0) / 2 + 20
ecx, ecy = (bx0 + bx1) / 2, (by0 + by1) / 2
pos = lambda th: (min(max(ecx + ea * math.cos(th), 32), 298), min(max(ecy + eb2 * math.sin(th), 82), 268))
angs = sorted([math.atan2((ay - ecy) / eb2, (ax - ecx) / ea), item, ax, ay] for item, ax, ay in anchors)
for _ in range(3000):  # afasta vizinhos até ficarem a 13 mm, mantendo a ordem em volta do desenho
    moved = False
    for i in range(len(angs)):
        j = (i + 1) % len(angs)
        (x1, y1), (x2, y2) = pos(angs[i][0]), pos(angs[j][0])
        if math.hypot(x2 - x1, y2 - y1) < 13:
            angs[i][0] -= 0.004; angs[j][0] += 0.004; moved = True
    if not moved:
        break
placed = []
for th, item, ax, ay in angs:
    bx, by = pos(th)
    placed.append((item, bx, by, ax, ay))
for item, bx, by, ax, ay in placed:
    m2.add_circle((ax, ay), 0.6, dxfattribs={"layer": "BALAO"})
    L = math.hypot(bx - ax, by - ay) or 1
    m2.add_line((ax, ay), (bx - (bx - ax) / L * 4.5, by - (by - ay) / L * 4.5), dxfattribs={"layer": "BALAO"})
    m2.add_circle((bx, by), 4.5, dxfattribs={"layer": "BALAO"})
    text(m2, str(item), bx, by, 3.2, TA.MIDDLE_CENTER, "BALAO")
print("balões", [(i, round(x), round(y)) for i, x, y, *_ in placed])

# lista de peças (acima da linha de base, leitura de baixo para cima como na NBR)
cols = [(25, "ITEM", 11), (36, "QTD.", 12), (48, "DENOMINAÇÃO", 55), (103, "ESPECIFICAÇÃO", 62), (165, "MATERIAL", 55)]
row, y0 = 4.2, 10
rect(m2, 25, y0, 220, y0 + row * (len(BOM) + 1))
for i in range(1, len(BOM) + 1):
    m2.add_line((25, y0 + row * i), (220, y0 + row * i), dxfattribs={"layer": "COTA"})
for x, _, _ in cols[1:]:
    m2.add_line((x, y0), (x, y0 + row * (len(BOM) + 1)), dxfattribs={"layer": "COTA"})
yh = y0 + row * 0.5
for x, h, w in cols:
    text(m2, h, x + 1.5, yh, 2.1)
for k, (item, ids, qty, name, spec, mat) in enumerate(BOM):
    y = y0 + row * (k + 1.5)
    for (x, _, _), val in zip(cols, (str(item), str(qty), name, spec, mat)):
        text(m2, val, x + 1.5, y, 2.1)
text(m2, "LISTA DE PEÇAS", 27, y0 + row * (len(BOM) + 1) + 3, 3)

# dados técnicos (catálogo)
tx, top, tw, tr = 305, 278, 105, 4.2
text(m2, "DADOS TÉCNICOS · CATÁLOGO JADD", tx, top + 4, 3)
rect(m2, tx, top - tr * len(TECH), tx + tw, top)
for k in range(1, len(TECH)):
    m2.add_line((tx, top - tr * k), (tx + tw, top - tr * k), dxfattribs={"layer": "COTA"})
for k, (a, b) in enumerate(TECH):
    y = top - tr * (k + 0.5)
    text(m2, a, tx + 2, y, 2.1)
    text(m2, b, tx + tw - 2, y, 2.1, TA.MIDDLE_RIGHT)
frame(m2, "Explodida, lista de peças e dados", 2, f"{fr(se)} / {fr(si)}")
doc2.saveas(OUT / "NMRV063-folha2-explodida.dxf")

pdf = export_pdf([doc1, doc2], OUT / "NMRV063-desenho.pdf")
for i, page in enumerate(pdf):
    page.get_pixmap(dpi=110).save(OUT / f"preview-folha{i + 1}.png")
print("ok", sorted(p.name for p in OUT.iterdir()))
