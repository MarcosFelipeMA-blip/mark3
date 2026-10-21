"""Empacota malhas (quantizadas em base64) e silhuetas das ferramentas em src/toolsdata.js."""
import base64, json, sys
import numpy as np

raw = json.load(open(sys.argv[1])); sil = json.load(open(sys.argv[2]))

def pack(m):
    P = np.array(m["pos"], dtype=np.float64).reshape(-1, 3)
    mn, mx = P.min(0), P.max(0)
    q = np.round((P - mn) / np.where(mx - mn == 0, 1, mx - mn) * 65535 - 32768).astype(np.int16)
    n = np.round(np.array(m["nor"]).reshape(-1, 3) * 127).astype(np.int8)
    I = np.array(m["idx"]); i32 = len(P) >= 65536
    return {"mn": mn.round(4).tolist(), "mx": mx.round(4).tolist(), "i32": i32,
            "p": base64.b64encode(q.tobytes()).decode(), "n": base64.b64encode(n.tobytes()).decode(),
            "i": base64.b64encode(I.astype(np.uint32 if i32 else np.uint16).tobytes()).decode()}

out = {"holder": pack(raw["reto"][0]), "blades": {}, "inserts": {}, "sil": sil,
       "codes": {}}
for k, ms in raw.items():
    out["blades"][ms[1]["name"]] = out["blades"].get(ms[1]["name"]) or pack(ms[1])
    out["inserts"][k] = pack(ms[2])
    out["codes"][k] = ms[1]["name"]
open(sys.argv[3], "w").write("export default " + json.dumps(out, separators=(",", ":")) + ";\n")
print("ok", len(open(sys.argv[3]).read()) // 1024, "KB")
