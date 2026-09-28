// Roda dentro da página do redutor (index.html#captura). Extrai, do modelo 3D, as linhas visíveis
// de cada vista (com remoção de linhas ocultas por mapa de profundidade) e os contornos dos cortes.
window.extract2D = function extract2D(opts = {}) {
  const R = window.redutor, { THREE, assembly, renderer, mergeVertices, MeshBVH, state } = R.internals;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  state.running = false; state.alpha = 0;
  R.setCut('none');
  const PX_PER_MM = opts.pxPerMm || 8, MAXPX = 4096, CREASE = Math.cos((opts.crease || 24) * Math.PI / 180);

  function settle() { for (let i = 0; i < 6; i++) R.step(4); assembly.updateMatrixWorld(true); }
  function meshes() { const out = []; assembly.traverse(o => { if (o.isMesh && o.userData.pid && o.visible) { let v = true, p = o; while (p) { if (!p.visible) v = false; p = p.parent; } if (v) out.push(o); } }); return out; }
  // Geometria em coordenadas do mundo, soldada por posição. As normais por face vêm das normais
  // originais da superfície (robustas para os triângulos finos que a malha booleana gera).
  function worldGeo(m) {
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', m.geometry.getAttribute('position').clone());
    g.setAttribute('normal', m.geometry.getAttribute('normal').clone());
    if (m.geometry.index) g.setIndex(m.geometry.index.clone());
    g.applyMatrix4(m.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    const nv = g.attributes.normal.array, nf = nv.length / 9, faceN = new Float32Array(nf * 3);
    for (let f = 0; f < nf; f++) {
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < 3; k++) { x += nv[9 * f + 3 * k]; y += nv[9 * f + 3 * k + 1]; z += nv[9 * f + 3 * k + 2]; }
      const l = Math.hypot(x, y, z) || 1; faceN[3 * f] = x / l; faceN[3 * f + 1] = y / l; faceN[3 * f + 2] = z / l;
    }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute('position', g.attributes.position);
    const merged = mergeVertices(gp, 1e-4);
    merged.userData.faceN = faceN;
    return merged;
  }
  function basis(dir, up0 = V(0, 1, 0)) {
    const d = dir.clone().normalize(), f = d.clone().negate();
    const right = f.clone().cross(up0).normalize(), up = right.clone().cross(f).normalize();
    return { dir: d, right, up };
  }
  const VIEWS = {
    front: { dir: V(0, 0, 1), right: V(1, 0, 0), up: V(0, 1, 0) },
    side: { dir: V(1, 0, 0), right: V(0, 0, -1), up: V(0, 1, 0) },
    top: { dir: V(0, 1, 0), right: V(1, 0, 0), up: V(0, 0, -1) },
    iso: basis(V(1, 0.78, 1.18)),
  };
  // cortes (um pouco fora de zero para não cair exatamente sobre vértices)
  const CUTS = {
    aa: { view: 'front', planes: [{ n: V(0, 0, -1), c: 0.013 }], cap: 0.013 },
    bb: { view: 'side', planes: [{ n: V(-1, 0, 0), c: 0.017 }], cap: 0.017 },
  };
  const clipped = (p, planes) => planes.some(pl => pl.n.dot(p) + pl.c < 0);

  const depthMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, toneMapped: false,
    uniforms: { uDir: { value: V(0, 0, 1) }, uP: { value: new THREE.Vector4(0, 0, 0, 1e9) }, uCap: { value: -1e9 }, uD0: { value: 0 }, uD1: { value: 1 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `#include <packing>
      uniform vec3 uDir; uniform vec4 uP; uniform float uCap, uD0, uD1; varying vec3 vW;
      void main(){
        if (dot(uP.xyz, vW) + uP.w < 0.0) discard;
        float d = gl_FrontFacing ? dot(vW, uDir) : uCap;
        gl_FragColor = packDepthToRGBA(clamp((d - uD0) / (uD1 - uD0), 0.0, 0.999));
      }`,
  });
  const UF = [255 / 256 / 16777216, 255 / 256 / 65536, 255 / 256 / 256, 255 / 256];

  function project(p, B) { return [p.dot(B.right), p.dot(B.up), p.dot(B.dir)]; }
  function bounds(list, B, planes) {
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9, d0 = 1e9, d1 = -1e9;
    const p = V(0, 0, 0);
    for (const m of list) {
      const a = m.geometry.getAttribute('position');
      for (let i = 0; i < a.count; i += 3) {
        p.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld);
        if (planes.length && clipped(p, planes)) continue;
        const [u, v, d] = project(p, B);
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); d0 = Math.min(d0, d); d1 = Math.max(d1, d);
      }
    }
    const pad = 4;
    return { u0: u0 - pad, u1: u1 + pad, v0: v0 - pad, v1: v1 + pad, d0: d0 - pad, d1: d1 + pad };
  }
  function depthMap(list, B, bb, planes, cap) {
    const ppm = Math.min(PX_PER_MM, MAXPX / (bb.u1 - bb.u0), MAXPX / (bb.v1 - bb.v0));
    const W = Math.ceil((bb.u1 - bb.u0) * ppm), H = Math.ceil((bb.v1 - bb.v0) * ppm);
    const cam = new THREE.OrthographicCamera(bb.u0, bb.u1, bb.v1, bb.v0, 1, 20000);
    cam.position.copy(B.dir).multiplyScalar(8000); cam.up.copy(B.up); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    depthMat.uniforms.uDir.value.copy(B.dir);
    const pl = planes[0];
    depthMat.uniforms.uP.value.set(pl ? pl.n.x : 0, pl ? pl.n.y : 0, pl ? pl.n.z : 0, pl ? pl.c : 1e9);
    depthMat.uniforms.uCap.value = cap ?? -1e9;
    depthMat.uniforms.uD0.value = bb.d0; depthMat.uniforms.uD1.value = bb.d1;
    const rt = new THREE.WebGLRenderTarget(W, H);
    const saved = [];
    assembly.traverse(o => { if (o.isMesh) { saved.push([o, o.material, o.visible]); if (list.includes(o)) o.material = depthMat; else o.visible = false; } });
    const prevCol = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(assembly, cam);
    const buf = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    renderer.setRenderTarget(null); renderer.setClearColor(prevCol, prevA); rt.dispose();
    for (const [o, m, v] of saved) { o.material = m; o.visible = v; }
    const D = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) D[i] = (buf[4 * i] / 255) * UF[0] + (buf[4 * i + 1] / 255) * UF[1] + (buf[4 * i + 2] / 255) * UF[2] + (buf[4 * i + 3] / 255) * UF[3];
    return { D, W, H, ppm };
  }
  function edgesOf(g, dir) {
    const P = g.attributes.position.array, I = g.index.array, nf = I.length / 3;
    const N = g.userData.faceN || new Float32Array(nf * 3);
    if (!g.userData.faceN) for (let f = 0; f < nf; f++) {
      const a = I[3 * f] * 3, b = I[3 * f + 1] * 3, c = I[3 * f + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
      N[3 * f] = nx / l; N[3 * f + 1] = ny / l; N[3 * f + 2] = nz / l;
    }
    const map = new Map();
    for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) {
      const a = I[3 * f + k], b = I[3 * f + ((k + 1) % 3)], key = a < b ? a * 4194304 + b : b * 4194304 + a;
      const e = map.get(key); if (e) e.push(f); else map.set(key, [f]);
    }
    const out = [];
    const featureBetween = (f1, f2) => {
      const c = N[3 * f1] * N[3 * f2] + N[3 * f1 + 1] * N[3 * f2 + 1] + N[3 * f1 + 2] * N[3 * f2 + 2];
      if (c < CREASE) return true;
      const s1 = N[3 * f1] * dir.x + N[3 * f1 + 1] * dir.y + N[3 * f1 + 2] * dir.z, s2 = N[3 * f2] * dir.x + N[3 * f2 + 1] * dir.y + N[3 * f2 + 2] * dir.z;
      return (s1 > 0) !== (s2 > 0);
    };
    // Arestas com uma face só vêm de junções em T da malha booleana: procura a face vizinha real do outro lado.
    let bvh = null;
    const hit = {}, pa = V(0, 0, 0), pb = V(0, 0, 0), pc = V(0, 0, 0), m = V(0, 0, 0), t = V(0, 0, 0), w = V(0, 0, 0), n = V(0, 0, 0);
    const neighbour = (f, a, b) => {
      bvh ||= new MeshBVH(g, { indirect: true }); // indirect: não reordena os triângulos
      pa.fromArray(P, a * 3); pb.fromArray(P, b * 3);
      const c = [I[3 * f], I[3 * f + 1], I[3 * f + 2]].find(v => v !== a && v !== b);
      pc.fromArray(P, c * 3);
      n.fromArray(N, 3 * f); t.subVectors(pb, pa).normalize(); w.crossVectors(n, t);
      if (w.dot(pc.clone().sub(pa)) > 0) w.negate();
      m.addVectors(pa, pb).multiplyScalar(0.5).addScaledVector(w, 0.03);
      const r = bvh.closestPointToPoint(m, hit, 0, 0.02);
      return r && r.faceIndex !== f ? r.faceIndex : -1;
    };
    for (const [key, fs] of map) {
      let keep;
      if (fs.length === 2) keep = featureBetween(fs[0], fs[1]);
      else if (fs.length === 1) {
        const a = Math.floor(key / 4194304), b = key % 4194304, g2 = neighbour(fs[0], a, b);
        keep = g2 < 0 || featureBetween(fs[0], g2);
      } else keep = true;
      if (keep) { const a = Math.floor(key / 4194304), b = key % 4194304; out.push(P[3 * a], P[3 * a + 1], P[3 * a + 2], P[3 * b], P[3 * b + 1], P[3 * b + 2]); }
    }
    return out;
  }
  const r2 = x => Math.round(x * 100) / 100;
  function visibleLines(name, planes, cap) {
    const B = VIEWS[name], list = meshes(), bb = bounds(list, B, planes), dm = depthMap(list, B, bb, planes, cap);
    const eps = 0.5 / (bb.d1 - bb.d0);
    const p = V(0, 0, 0), a = V(0, 0, 0), b = V(0, 0, 0);
    const vis = q => {
      if (planes.length && clipped(q, planes)) return false;
      const [u, v, d] = project(q, B);
      const n = (d - bb.d0) / (bb.d1 - bb.d0);
      const px = Math.floor((u - bb.u0) * dm.ppm), py = Math.floor((v - bb.v0) * dm.ppm);
      let m = 1;
      for (let y = py - 1; y <= py + 1; y++) for (let x = px - 1; x <= px + 1; x++) {
        if (x < 0 || y < 0 || x >= dm.W || y >= dm.H) { m = 0; continue; }
        m = Math.min(m, dm.D[y * dm.W + x]);
      }
      return n >= m - eps;
    };
    const byPart = {};
    for (const mesh of list) {
      const E = edgesOf(worldGeo(mesh), B.dir), segs = byPart[mesh.userData.pid] ||= [];
      for (let i = 0; i < E.length; i += 6) {
        a.set(E[i], E[i + 1], E[i + 2]); b.set(E[i + 3], E[i + 4], E[i + 5]);
        const [ua, va] = project(a, B), [ub, vb] = project(b, B);
        const lenPx = Math.hypot(ub - ua, vb - va) * dm.ppm;
        if (lenPx < 0.3) continue;
        const n = Math.min(400, Math.max(1, Math.ceil(lenPx / 1.5)));
        let start = null, last = null;
        for (let k = 0; k <= n; k++) {
          const t = k / n; p.lerpVectors(a, b, t);
          const ok = vis(p);
          if (ok && start === null) start = t;
          if (ok) last = t;
          if ((!ok || k === n) && start !== null) {
            if (last > start && (last - start) * lenPx > 1.2) segs.push([r2(ua + (ub - ua) * start), r2(va + (vb - va) * start), r2(ua + (ub - ua) * last), r2(va + (vb - va) * last)]);
            start = null;
          }
        }
      }
    }
    return { bounds: bb, byPart };
  }
  function sectionLines(cut) {
    const { planes } = CUTS[cut], B = VIEWS[CUTS[cut].view], pl = planes[0], byPart = {};
    const q = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)], seen = {};
    for (const mesh of meshes()) {
      // uma chave por malha (ex.: aro e cubo da coroa têm hachuras separadas)
      const pid = mesh.userData.pid, k = (seen[pid] = (seen[pid] ?? -1) + 1);
      const g = worldGeo(mesh), P = g.attributes.position.array, I = g.index.array, segs = byPart[`${pid}#${k}`] = [];
      for (let f = 0; f < I.length; f += 3) {
        const d = [];
        for (let k = 0; k < 3; k++) { q[k].fromArray(P, I[f + k] * 3); d.push(pl.n.dot(q[k]) + pl.c); }
        const pts = [];
        for (let k = 0; k < 3; k++) {
          const k1 = (k + 1) % 3;
          if ((d[k] < 0) !== (d[k1] < 0)) { const t = d[k] / (d[k] - d[k1]); pts.push(q[k].clone().lerp(q[k1], t)); }
        }
        if (pts.length === 2) { const [u1, v1] = project(pts[0], B), [u2, v2] = project(pts[1], B); segs.push([u1, v1, u2, v2].map(x => Math.round(x * 1000) / 1000)); }
      }
    }
    return byPart;
  }
  function partCenters(name) {
    const B = VIEWS[name], out = {};
    for (const p of R.internals.parts) {
      const box = new THREE.Box3().setFromObject(p.group);
      if (box.isEmpty()) continue;
      const c = box.getCenter(V(0, 0, 0)); const [u, v] = project(c, B); out[p.id] = [r2(u), r2(v)];
    }
    return out;
  }

  const result = { views: {}, sections: {}, centers: {} };
  R.assembleAll(); R.setExplode(0); settle();
  for (const name of ['front', 'side', 'top']) result.views[name] = visibleLines(name, []);
  for (const cut of ['aa', 'bb']) {
    result.views[cut] = visibleLines(CUTS[cut].view, CUTS[cut].planes, CUTS[cut].cap);
    result.sections[cut] = sectionLines(cut);
  }
  result.views.iso = visibleLines('iso', []);
  R.setExplode(1); settle();
  result.views.exploded = visibleLines('iso', []);
  result.centers.exploded = partCenters('iso');
  R.setExplode(0); settle();
  return result;
};
