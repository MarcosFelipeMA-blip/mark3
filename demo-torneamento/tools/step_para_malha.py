"""Converte o STEP da montagem Sandvik (suporte + pastilha) em malha triangular JSON.

Uso:  pip install cadquery-ocp
      python tools/step_para_malha.py modelo/DWLNR_2525M_06_WNMG_060412-WMX_4405.stp modelo/mesh.json

Saída: {"holder": {"v": [...], "i": [...]}, "insert": {...}} em mm, no sistema de
coordenadas do arquivo STEP (Y para cima, haste do suporte ao longo de +Z,
ponta da pastilha em Z mínimo).
"""
import json
import sys

from OCP.BRep import BRep_Tool
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.STEPControl import STEPControl_Reader
from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopLoc import TopLoc_Location
from OCP.TopoDS import TopoDS


def mesh(shape):
    BRepMesh_IncrementalMesh(shape, 0.01, False, 0.15, True)
    V, I = [], []
    e = TopExp_Explorer(shape, TopAbs_FACE)
    while e.More():
        f = TopoDS.Face(e.Current())
        loc = TopLoc_Location()
        t = BRep_Tool.Triangulation_s(f, loc)
        if t:
            tr = loc.Transformation()
            o = len(V) // 3
            for i in range(1, t.NbNodes() + 1):
                p = t.Node(i).Transformed(tr)
                V += [round(p.X(), 2), round(p.Y(), 2), round(p.Z(), 2)]
            rev = f.Orientation() == TopAbs_REVERSED
            for i in range(1, t.NbTriangles() + 1):
                a, b, c = t.Triangle(i).Get()
                if rev:
                    b, c = c, b
                I += [o + a - 1, o + b - 1, o + c - 1]
        e.Next()
    return {"v": V, "i": I}


def main(src, dst):
    r = STEPControl_Reader()
    r.ReadFile(src)
    r.TransferRoots()
    solids = []
    e = TopExp_Explorer(r.OneShape(), TopAbs_SOLID)
    while e.More():
        solids.append(mesh(e.Current()))
        e.Next()
    # O primeiro sólido do arquivo é o suporte (DWLNR 2525M 06), o segundo a pastilha (WNMG 06 04 12-WMX 4405)
    out = {"holder": solids[0], "insert": solids[1]}
    json.dump(out, open(dst, "w"), separators=(",", ":"))
    for k, m in out.items():
        print(k, len(m["v"]) // 3, "vértices,", len(m["i"]) // 3, "triângulos")


if __name__ == "__main__":
    main(*sys.argv[1:3])
