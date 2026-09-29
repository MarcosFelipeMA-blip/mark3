"""Gera os Reels em MP4 (1080x1920, sem áudio) a partir de reels.html.

Uso: pip install imageio-ffmpeg && python3 templates/reels.py
A música é adicionada no próprio Instagram (áudio em alta).
"""
import os
import pathlib
import subprocess
import tempfile

import imageio_ffmpeg

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = ROOT / "templates" / "reels.html"
OUT = ROOT / "reels"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# (arquivo de saída, [(cena, segundos na tela)])
REELS = [
    ("reels-1-a-dor.mp4", [("r1-1", 2.0), ("r1-2", 2.5), ("r1-3", 3.0), ("r1-4", 3.5), ("r1-5", 3.5), ("r1-6", 4.0)]),
    ("reels-2-tres-posts.mp4", [("r2-1", 3.0), ("r2-2", 3.0), ("r2-3", 3.0), ("r2-4", 3.0), ("r2-5", 4.0)]),
    ("reels-3-europa.mp4", [("r3-1", 3.0), ("r3-2", 2.5), ("r3-3", 3.0), ("r3-4", 3.5), ("r3-5", 4.0)]),
]
FADE = 0.4
FPS = 30


def render_scenes(tmp: pathlib.Path) -> None:
    js = f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const b = await chromium.launch();
  const p = await b.newPage({{ viewport: {{ width: 1080, height: 1920 }} }});
  await p.goto('file://{HTML}');
  for (const el of await p.$$('section.s')) {{
    await el.screenshot({{ path: '{tmp}/' + (await el.getAttribute('id')) + '.png' }});
  }}
  await b.close();
}})();
"""
    npm_root = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
    subprocess.run(["node", "-e", js], check=True, env={**os.environ, "NODE_PATH": npm_root})


def build(name: str, scenes: list, tmp: pathlib.Path) -> None:
    args = [FFMPEG, "-y", "-loglevel", "error"]
    for scene, dur in scenes:
        args += ["-loop", "1", "-t", str(dur), "-framerate", str(FPS), "-i", str(tmp / f"{scene}.png")]
    # Zoom lento em cada cena + transição em fade entre elas.
    parts = []
    for i, (_, dur) in enumerate(scenes):
        frames = int(dur * FPS)
        parts.append(
            f"[{i}:v]scale=1188:2112,zoompan=z='1+0.06*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d=1:s=1080x1920:fps={FPS},format=yuv420p,setsar=1[v{i}]"
        )
    last, offset = "v0", 0.0
    for i in range(1, len(scenes)):
        offset += scenes[i - 1][1] - FADE
        parts.append(f"[{last}][v{i}]xfade=transition=fade:duration={FADE}:offset={offset:.2f}[x{i}]")
        last = f"x{i}"
    args += ["-filter_complex", ";".join(parts), "-map", f"[{last}]",
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart",
             str(OUT / name)]
    subprocess.run(args, check=True)
    print("ok", name)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        render_scenes(tmp)
        for name, scenes in REELS:
            build(name, scenes, tmp)
