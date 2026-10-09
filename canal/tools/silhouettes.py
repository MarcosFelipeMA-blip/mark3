"""Contorno (silhueta) de pastilha + lâmina no plano de corte, a partir das malhas dos STEP.

Coordenadas de saída relativas ao ponto de referência da ferramenta (TCP):
  s = deslocamento axial (largura do canal), o = recuo em relação à ponta (o <= 0).
"""
import json, sys
from shapely.geometry import Polygon
from shapely.ops import unary_union

raw = json.load(open(sys.argv[1]))
TCP_X = {"reto": -35.0, "redondo": -35.0, "esquerdo": -36.0, "direito": -36.0}
out = {}
for name, meshes in raw.items():
    ins, blade = meshes[2], meshes[1]
    ztip = min(ins["pos"][2::3])
    x0 = TCP_X[name]
    polys = []
    for m in (ins, blade):
        P, I = m["pos"], m["idx"]
        for t in range(0, len(I), 3):
            pts = [(P[3 * i] - x0, -(P[3 * i + 2] - ztip)) for i in I[t:t + 3]]
            if max(p[1] for p in pts) < -24:  # longe da ponta: não alcança o material
                continue
            poly = Polygon(pts)
            if poly.area > 1e-7:
                polys.append(poly)
    sil = unary_union(polys).buffer(0.002).buffer(-0.002)
    sil = sil.intersection(Polygon([(-40, 0.01), (40, 0.01), (40, -24), (-40, -24)]))
    if sil.geom_type != "Polygon":
        sil = max(sil.geoms, key=lambda g: g.area)
    sil = sil.simplify(0.01)
    ring = [(round(x, 3), round(y, 3)) for x, y in sil.exterior.coords[:-1]]
    out[name] = {"ztip": ztip, "xtcp": x0, "outline": ring}
    # largura ocupada em cada recuo (para checar folga no pescoço/boca)
    for o in (0, -2, -3.5, -6, -10, -14, -18, -20, -23):
        cut = sil.intersection(Polygon([(-40, o + 0.05), (40, o + 0.05), (40, o - 0.05), (-40, o - 0.05)]))
        b = cut.bounds if not cut.is_empty else None
        print(name, "recuo", o, "s de", b and round(b[0], 2), "a", b and round(b[2], 2))
    print(name, "vértices", len(ring))
json.dump(out, open(sys.argv[2], "w"))
