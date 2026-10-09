// Exportação para realidade aumentada: GLB (Android, com animação) e USDZ (iPhone, estático).
// Roda na página de simulação (modo #captura) depois que todos os canais foram cortados.
import './main.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';

// Douglas-Peucker em anel fechado [[x,y],...]
function simplify(pts, tol) {
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let best = -1, bi = -1;
    const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L; if (d > best) { best = d; bi = i; } }
    if (best > tol) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

window.exportAR = async function exportAR({ segs = 48, tol = 0.02 } = {}) {
  const D = window.demo, { THREE, TOOLS, PATHS, R0, Y0, yc, FOCUS, bands, pc, bodyRing, PHI0, PHILEN, M } = D;
  D.state.playing = true; D.seek(D.TOTAL); for (let i = 0; i < 4; i++) D.step(1 / 30);

  // perfil único da seção: corpo + faixas usinadas
  const polys = [[bodyRing.concat([bodyRing[0]])]];
  for (const b of bands) polys.push(b.removed.length ? pc.difference([b.rect], b.removed) : [b.rect]);
  const merged = pc.union(...polys);
  const outer = merged.reduce((a, p) => (p[0].length > a[0].length ? p : a), merged[0])[0];
  // anel fechado: divide no ponto mais distante do primeiro e simplifica as duas metades
  const pts0 = outer.slice(0, -1); let far = 0, fd = -1;
  pts0.forEach(([x, y], i) => { const d = Math.hypot(x - pts0[0][0], y - pts0[0][1]); if (d > fd) { fd = d; far = i; } });
  let ring = simplify(pts0.slice(0, far + 1), tol).concat(simplify(pts0.slice(far).concat([pts0[0]]), tol).slice(1, -1));
  let area = 0; for (let i = 0; i < ring.length; i++) { const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length]; area += x1 * y2 - x2 * y1; }
  if (area < 0) ring = ring.reverse(); // anti-horário no plano (r, y) → normais para fora

  // superfície de revolução, faces de um lado só, separada em usinada (junto ao Ø interno) e bruta
  const P = (r, y, f) => [r * Math.sin(f), y, r * Math.cos(f)];
  const surf = { mach: { pos: [], nor: [], idx: [] }, raw: { pos: [], nor: [], idx: [] } };
  for (let i = 0; i < ring.length; i++) {
    const [r1, y1] = ring[i], [r2, y2] = ring[(i + 1) % ring.length];
    const dx = r2 - r1, dy = y2 - y1, l = Math.hypot(dx, dy); if (l < 1e-6) continue;
    const nr = dy / l, ny = -dx / l;
    const S = Math.max(r1, r2) < R0 + 25.01 ? surf.mach : surf.raw, base = S.pos.length / 3;
    for (let j = 0; j <= segs; j++) {
      const f = PHI0 + (PHILEN * j) / segs, s = Math.sin(f), c = Math.cos(f);
      S.pos.push(...P(r1, y1, f), ...P(r2, y2, f)); S.nor.push(nr * s, ny, nr * c, nr * s, ny, nr * c);
      if (j < segs) { const k = base + 2 * j; S.idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
  }
  const mk = S => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(S.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(S.nor, 3)); g.setIndex(S.idx); return g; };

  // tampas do corte (hachura), com a face voltada para a abertura de 60°
  const tris = THREE.ShapeUtils.triangulateShape(ring.map(([x, y]) => new THREE.Vector2(x, y)), []);
  function cap(f, sign) {
    const t = [Math.cos(f), 0, -Math.sin(f)], n = t.map(v => v * sign); // sign -1: normal contra o sentido de f
    const pos = [], nor = [], uv = [], idx = [];
    ring.forEach(([r, y]) => { pos.push(...P(r, y, f)); nor.push(...n); uv.push(r / 24, y / 24); });
    for (const [a, b, c] of tris) {
      const A = new THREE.Vector3(...pos.slice(3 * a, 3 * a + 3)), B = new THREE.Vector3(...pos.slice(3 * b, 3 * b + 3)), C = new THREE.Vector3(...pos.slice(3 * c, 3 * c + 3));
      const fn = B.clone().sub(A).cross(C.clone().sub(A));
      idx.push(...(fn.dot(new THREE.Vector3(...n)) >= 0 ? [a, b, c] : [a, c, b]));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  const hatch = M.cap.map.clone(); hatch.repeat.set(1, 1); hatch.needsUpdate = true;
  const matCap = new THREE.MeshStandardMaterial({ map: hatch, metalness: 0.1, roughness: 0.7, name: 'Corte' });
  const matMach = new THREE.MeshStandardMaterial({ color: 0xd7dce0, metalness: 0.9, roughness: 0.18, name: 'Usinado' });
  const matRaw = new THREE.MeshStandardMaterial({ color: 0xa9b0b7, metalness: 0.75, roughness: 0.36, name: 'Peca' });
  const matHolder = new THREE.MeshStandardMaterial({ color: 0x25282c, metalness: 0.6, roughness: 0.38, name: 'Suporte' });
  const matInsert = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.85, roughness: 0.3, name: 'Pastilha' });

  const root = new THREE.Group(); root.name = 'Canais_T';
  const mm = new THREE.Group(); mm.name = 'mm'; mm.scale.setScalar(0.001); mm.position.y = -Y0 * 0.001; root.add(mm);
  const ringG = new THREE.Group(); ringG.name = 'Anel'; mm.add(ringG);
  ringG.add(new THREE.Mesh(mk(surf.mach), matMach), new THREE.Mesh(mk(surf.raw), matRaw),
    new THREE.Mesh(cap(PHI0, -1), matCap), new THREE.Mesh(cap(PHI0 + PHILEN, 1), matCap));

  // ferramentas: suporte + lâmina + pastilha (sem cabeçote e aríete)
  function toolCopy(k) {
    const src = TOOLS[k].group, g = new THREE.Group(); g.name = 'Ferramenta_' + k;
    g.quaternion.copy(src.quaternion);
    const inner = src.children[0], wrap = new THREE.Group(); wrap.position.copy(inner.position); g.add(wrap);
    inner.children.forEach((c, i) => { if (c.geometry.type !== 'BoxGeometry') wrap.add(new THREE.Mesh(c.geometry, i === 2 ? matInsert : matHolder)); });
    return g;
  }
  const keys = ['reto', 'redondo', 'esquerdo', 'direito'];
  const tools = keys.map(k => { const t = toolCopy(k); mm.add(t); return t; });
  const PT = (s, d) => new THREE.Vector3(R0 + d, yc(FOCUS) + s, 0);
  const park = new THREE.Vector3(R0 - 120, yc(FOCUS), 0);

  // USDZ (estático): bedame esquerdo parado dentro do canal 5, no raio R3
  tools.forEach(t => (t.visible = false));
  const pe = PATHS.esquerdo; tools[2].visible = true; tools[2].position.copy(PT(pe[2][0], pe[2][1]));
  const usdzRoot = root.clone(), drop = [];
  usdzRoot.traverse(o => { if (o.name.startsWith('Ferramenta_') && !o.visible) drop.push(o); });
  drop.forEach(o => o.parent.remove(o));
  const usdz = await new USDZExporter().parse(usdzRoot, { quickLookCompatible: true });

  // GLB (animado): as 4 ferramentas entram em sequência no canal 5, em câmera lenta
  tools.forEach(t => { t.visible = true; t.position.copy(park); });
  const tracks = []; let t0 = 0;
  keys.forEach((k, i) => {
    const pts = [park, ...PATHS[k].map(([s, d]) => PT(s, d)), park];
    const times = [], vals = []; let t = t0;
    pts.forEach((p, j) => {
      if (j) { const d = pts[j - 1].distanceTo(p), cut = PATHS[k][j - 1] && PATHS[k][j - 1][2] === 'F' && j < pts.length - 1; t += Math.max(0.2, d * (cut ? 0.18 : 0.012)); }
      times.push(t); vals.push(p.x, p.y, p.z);
    });
    tracks.push(new THREE.VectorKeyframeTrack(`${tools[i].name}.position`, times, vals));
    // visibilidade por escala; tempos estritamente crescentes (exigência do glTF)
    const e = 1e-4, keysV = t0 > 0 ? [[0, e], [t0, 1], [t, 1], [t + 0.02, e]] : [[0, 1], [t, 1], [t + 0.02, e]];
    tracks.push(new THREE.VectorKeyframeTrack(`${tools[i].name}.scale`, keysV.map(k => k[0]), keysV.flatMap(k => [k[1], k[1], k[1]]), THREE.InterpolateDiscrete));
    t0 = t + 0.6;
  });
  const clip = new THREE.AnimationClip('Usinagem', t0, tracks);
  const glb = await new Promise((res, rej) => new GLTFExporter().parse(root, res, rej, { binary: true, animations: [clip] }));

  // conferência: normais geométricas x normais armazenadas
  let bad = 0, n = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry, p = g.attributes.position, nn = g.attributes.normal, I = g.index ? g.index.array : null, cnt = I ? I.length : p.count;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
    for (let t = 0; t < cnt; t += 3 * 7) {
      const a = I ? I[t] : t, b = I ? I[t + 1] : t + 1, c = I ? I[t + 2] : t + 2;
      A.fromBufferAttribute(p, a); B.fromBufferAttribute(p, b); C.fromBufferAttribute(p, c);
      const fn = B.sub(A).cross(C.sub(A)); if (fn.lengthSq() < 1e-12) continue;
      N.fromBufferAttribute(nn, a).add(C.fromBufferAttribute(nn, b)).add(A.fromBufferAttribute(nn, c));
      n++; if (fn.dot(N) < 0) bad++;
    }
  });
  let triCount = 0; root.traverse(o => { if (o.isMesh) triCount += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  return { glb: b64(glb), usdz: b64(usdz), tris: triCount, ringPts: ring.length, dur: t0, normals: `${bad}/${n} invertidas` };
};
