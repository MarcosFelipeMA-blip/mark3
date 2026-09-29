import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import pc from 'polygon-clipping';
import T from './toolsdata.js';

/*
  Demonstração: 9 canais em T no diâmetro interno de um anel porta-palhetas, num torno vertical.
  Eixo da mesa = Y. Seção da peça no plano (r, y). O corte é feito em +X (φ = 90° da revolução).
  Coordenadas do canal: s = axial (ao longo de Y, a partir do centro do canal), d = profundidade a partir do Ø interno.
*/

const TAU = Math.PI * 2, D2R = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const CAPTURE = location.hash === '#captura';

/* ---------- Peça ---------- */
const R0 = 684.5 / 2;             // Ø interno
const Y0 = 40, H = 427;           // base da peça sobre os calços, largura
const PITCH = 46, A0 = 26;        // passo e posição do 1º canal (estimados do desenho)
const NG = 9, FOCUS = 4;          // canal mostrado em detalhe: nº 5
const yc = k => Y0 + A0 + PITCH * k;
const BAND = 25;                  // faixa junto ao Ø interno que é recalculada durante o corte

// Perfil do canal conforme leitura do desenho (detalhe), em (s, d)
const G = { mouthW: 16, mouthD: 2.5, neckW: 11, floorD: 8.0, chamberW: 16.6, roofD: 14.2, rCorner: 3, rFloor: 0.5, domeR: 3, depth: 19.5 };
function arc(cx, cy, r, a0, a1, n = 12) { const out = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return out; }
function targetProfile() {
  const m = G.mouthW / 2, n = G.neckW / 2, c = G.chamberW / 2, R = G.rCorner, dr = G.domeR;
  const half = [
    [m, 0], [m, G.mouthD], [n, G.mouthD], [n, G.floorD - 0.5], [n + 0.5, G.floorD], [c - G.rFloor, G.floorD],
    ...arc(c - G.rFloor, G.floorD + G.rFloor, G.rFloor, -Math.PI / 2, 0, 4),
    [c, G.roofD - R], ...arc(c - R, G.roofD - R, R, 0, Math.PI / 2, 10), [dr, G.roofD],
    ...arc(0, G.depth - dr, dr, 0, Math.PI / 2, 10),
  ];
  // metade superior da boca até o topo do fundo, depois a mesma curva espelhada de volta à boca
  return half.concat(half.slice(0, -1).reverse().map(([s, d]) => [-s, d]));
}

/* ---------- Renderizador ---------- */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: CAPTURE });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(1200, 2200, 1600); scene.add(key);
scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa3ab, 0.6));
const fill = new THREE.PointLight(0xffffff, 3, 0, 0); scene.add(fill); // luz dentro do furo, acompanha a ferramenta

const M = {
  part: new THREE.MeshStandardMaterial({ color: 0xa9b0b7, metalness: 0.75, roughness: 0.34, side: THREE.DoubleSide }),
  machined: new THREE.MeshStandardMaterial({ color: 0xd7dce0, metalness: 0.9, roughness: 0.16, side: THREE.DoubleSide }),
  body: new THREE.MeshStandardMaterial({ color: 0xe6e9ec, metalness: 0.15, roughness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2c3035, metalness: 0.4, roughness: 0.5 }),
  table: new THREE.MeshStandardMaterial({ color: 0x7b8289, metalness: 0.8, roughness: 0.35 }),
  holder: new THREE.MeshStandardMaterial({ color: 0x25282c, metalness: 0.6, roughness: 0.38 }),
  insert: new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.85, roughness: 0.3 }),
  chip: new THREE.MeshStandardMaterial({ color: 0x8d7a5a, metalness: 1, roughness: 0.35, side: THREE.DoubleSide }),
};
const hatchTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const x = cv.getContext('2d'); x.fillStyle = '#eceff1'; x.fillRect(0, 0, 64, 64);
  x.strokeStyle = '#e07a57'; x.lineWidth = 2.2;
  for (let i = -64; i < 128; i += 32) { x.beginPath(); x.moveTo(i, 64); x.lineTo(i + 64, 0); x.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 3, 1 / 3); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
M.cap = new THREE.MeshStandardMaterial({ map: hatchTex, metalness: 0.1, roughness: 0.7, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

/* ---------- Sólido de revolução com faces nítidas + tampas do corte ---------- */
const PHI0 = Math.PI / 2, PHILEN = 300 * D2R, SEGS = 180;
function revolveProfile(ring) {
  // ring: [[r, y], ...] fechado implicitamente; orienta anti-horário para normais para fora
  let a = 0; for (let i = 0; i < ring.length; i++) { const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length]; a += x1 * y2 - x2 * y1; }
  const pts = a < 0 ? ring.slice().reverse() : ring;
  const pos = [], nor = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const [r1, y1] = pts[i], [r2, y2] = pts[(i + 1) % pts.length];
    const dx = r2 - r1, dy = y2 - y1, l = Math.hypot(dx, dy); if (l < 1e-6) continue;
    const nr = dy / l, ny = -dx / l, base = pos.length / 3;
    for (let j = 0; j <= SEGS; j++) {
      const f = PHI0 + (PHILEN * j) / SEGS, s = Math.sin(f), c = Math.cos(f);
      pos.push(r1 * s, y1, r1 * c, r2 * s, y2, r2 * c);
      nor.push(nr * s, ny, nr * c, nr * s, ny, nr * c);
      if (j < SEGS) { const k = base + 2 * j; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return { g };
}
function capAt(geo, phi) { const g = geo.clone(); g.rotateY(phi - Math.PI / 2); return g; }

const part = new THREE.Group(); scene.add(part);
// corpo estático (seção simplificada, fora da faixa dos canais)
const bodyRing = [[R0 + BAND, Y0], [420, Y0], [420, Y0 + 122], [440, Y0 + 142], [576.5, Y0 + 142], [576.5, Y0 + 322], [440, Y0 + 322], [420, Y0 + 342], [420, Y0 + H], [R0 + BAND, Y0 + H]];
{
  const { g } = revolveProfile(bodyRing);
  part.add(new THREE.Mesh(g, M.part));
  const shape = new THREE.Shape(bodyRing.map(([r, y]) => new THREE.Vector2(r, y)));
  const cap = new THREE.ShapeGeometry(shape);
  part.add(new THREE.Mesh(cap, M.cap), new THREE.Mesh(capAt(cap, PHI0 + PHILEN), M.cap));
}
// faixa junto ao Ø interno dividida por canal: só a do canal em corte é recalculada
const bounds = [Y0, ...Array.from({ length: NG - 1 }, (_, k) => yc(k) + PITCH / 2), Y0 + H];
const bands = bounds.slice(0, -1).map((b0, k) => {
  const rect = [[[R0, b0], [R0 + BAND, b0], [R0 + BAND, bounds[k + 1]], [R0, bounds[k + 1]], [R0, b0]]];
  const obj = { k, rect, removed: [], mesh: new THREE.Mesh(new THREE.BufferGeometry(), M.machined), cap1: new THREE.Mesh(new THREE.BufferGeometry(), M.cap), cap2: new THREE.Mesh(new THREE.BufferGeometry(), M.cap) };
  part.add(obj.mesh, obj.cap1, obj.cap2);
  return obj;
});
function rebuildBand(b, extra) {
  let geom = [b.rect];
  try {
    const cut = extra ? pc.union(b.removed, extra) : b.removed;
    if (cut.length) geom = pc.difference([b.rect], cut);
  } catch (e) { /* mantém a forma anterior se a união falhar numa degenerescência */ }
  const poly = geom.reduce((a, p) => (area(p[0]) > area(a[0]) ? p : a), geom[0]);
  const ring = poly[0].slice(0, -1);
  const { g } = revolveProfile(ring);
  b.mesh.geometry.dispose(); b.mesh.geometry = g;
  const shape = new THREE.Shape(ring.map(([r, y]) => new THREE.Vector2(r, y)));
  const cap = new THREE.ShapeGeometry(shape);
  b.cap1.geometry.dispose(); b.cap1.geometry = cap;
  b.cap2.geometry.dispose(); b.cap2.geometry = capAt(cap, PHI0 + PHILEN);
}
function area(r) { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(a / 2); }
bands.forEach(b => rebuildBand(b));

// perfil do desenho sobre a face do corte (linha tracejada)
const target = new THREE.Group(); scene.add(target);
{
  const pts = targetProfile().map(([s, d]) => V(R0 + d, s, 0.3));
  for (let k = 0; k < NG; k++) {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => p.clone().setY(p.y + yc(k)))), new THREE.LineDashedMaterial({ color: 0x0b6bcb, dashSize: 0.6, gapSize: 0.35, depthTest: false, transparent: true }));
    l.computeLineDistances(); l.renderOrder = 5; target.add(l);
  }
}

/* ---------- Máquina ---------- */
const table = new THREE.Group(); scene.add(table);
{
  const t = new THREE.Mesh(new THREE.CylinderGeometry(800, 800, 110, 96), M.table); t.position.y = -55; table.add(t);
  for (let i = 0; i < 12; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(620, 3, 22), M.dark);
    slot.position.set(0, 0.6, 0); slot.geometry.translate(470, 0, 0); slot.rotation.y = (i / 12) * TAU; table.add(slot);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4, g = new THREE.Group(); g.rotation.y = a;
    const riser = new THREE.Mesh(new THREE.BoxGeometry(90, Y0, 60), M.dark); riser.position.set(385, Y0 / 2, 0);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(60, 120, 70), M.dark); jaw.position.set(455, 60, 0);
    g.add(riser, jaw); table.add(g);
  }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(900, 950, 380, 96), M.body); base.position.y = -300; scene.add(base);
  const column = new THREE.Mesh(new THREE.BoxGeometry(520, 2400, 700), M.body); column.position.set(-1350, 900, 0); scene.add(column);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(2900, 300, 360), M.body); rail.position.set(-100, 1900, -420); scene.add(rail);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2902, 40, 362), M.dark); stripe.position.set(-100, 1990, -420); scene.add(stripe);
}

/* ---------- Ferramentas (STEP Sandvik) ---------- */
function decode(d) {
  const buf = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
  const q = new Int16Array(buf(d.p)), n = new Int8Array(buf(d.n)), idx = d.i32 ? new Uint32Array(buf(d.i)) : new Uint16Array(buf(d.i));
  const pos = new Float32Array(q.length), nor = new Float32Array(n.length);
  for (let k = 0; k < q.length; k++) { const j = k % 3; pos[k] = d.mn[j] + ((q[k] + 32768) / 65535) * (d.mx[j] - d.mn[j]); nor[k] = n[k] / 127; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.normalizeNormals();
  return g;
}
// ferramenta: -z (ponta) → +X radial; x (largura) → +Y; y → -Z
const TOOL_BASIS = new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, -1), V(-1, 0, 0));
const holderGeo = decode(T.holder);
const TOOLS = {
  reto: { name: 'Bedame reto', op: 'Abre o canal', insert: 'C2I-K2N-0600-0008-TM 1225', width: 'Largura 6,00 mm' },
  redondo: { name: 'Bedame redondo', op: 'Raio do fundo', insert: 'C2I-K2N-0714-RO 1225', width: 'Ponta redonda Ø7,14 mm' },
  esquerdo: { name: 'Bedame esquerdo', op: 'Raios R3 · lado superior', insert: 'LG123H1-0400-0004-GS 1205', width: 'Pé lateral 8,4 mm' },
  direito: { name: 'Bedame direito', op: 'Raios R3 · lado inferior', insert: 'RG123H1-0400-0004-GS 1205', width: 'Pé lateral 8,4 mm' },
};
for (const [k, t] of Object.entries(TOOLS)) {
  const s = T.sil[k];
  const tcp = V(s.xtcp, -1.5, s.ztip);
  const inner = new THREE.Group(); inner.position.copy(tcp).negate();
  inner.add(new THREE.Mesh(holderGeo, M.holder), new THREE.Mesh(decode(T.blades[T.codes[k]]), M.holder), new THREE.Mesh(decode(T.inserts[k]), M.insert));
  // cabeçote (saída 25×25) e aríete, no sistema da ferramenta
  const head = new THREE.Mesh(new THREE.BoxGeometry(46, 70, 80), M.dark); head.position.set(-4, -4, 58); inner.add(head);
  const ram = new THREE.Mesh(new THREE.BoxGeometry(1500, 150, 150), M.body); ram.position.set(19 + 750, -4, 90); inner.add(ram);
  const g = new THREE.Group(); g.add(inner); g.quaternion.setFromRotationMatrix(TOOL_BASIS); g.visible = false;
  scene.add(g);
  t.group = g; t.code = T.codes[k];
  // silhueta de corte triangulada em peças convexas: s = axial, o = recuo (<= 0)
  const outline = s.outline.map(([x, o]) => new THREE.Vector2(x, o));
  t.tris = THREE.ShapeUtils.triangulateShape(outline, []).map(f => f.map(i => [outline[i].x, outline[i].y]));
}
function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  const h = lo.slice(0, -1).concat(up.slice(0, -1)); h.push(h[0]); return h;
}
// região varrida pela ferramenta entre A e B (posições do TCP em r, y da seção)
function sweep(tool, A, B) {
  const polys = [];
  for (const tri of TOOLS[tool].tris) {
    const pts = [];
    for (const [s, o] of tri) { pts.push([A[0] + o, A[1] + s], [B[0] + o, B[1] + s]); }
    polys.push([hull(pts)]);
  }
  return pc.union(...polys);
}

/* ---------- Caminhos de ferramenta ---------- */
const APP = -8; // folga de aproximação dentro do furo
const cornerArc = (() => {
  // canto externo do pé contorna o R3 do teto até onde o pé não invade o piso da câmara
  const c = G.chamberW / 2, R = G.rCorner, cs = c - R, cd = G.roofD - R, out = [];
  const minD = G.floorD + 3.5;
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * (Math.PI / 2), d = cd + R * Math.cos(a);
    if (d < minD) break;
    out.push([cs + R * Math.sin(a) - 8.4, d]);
  }
  return out;
})();
const PATHS = {
  reto: [[-2.5, APP, 'R'], [-2.5, G.roofD, 'F'], [-2.5, APP, 'R'], [2.5, APP, 'R'], [2.5, G.roofD, 'F'], [2.5, APP, 'R'],
    [-5, APP, 'R'], [-5, G.mouthD, 'F'], [-5, APP, 'R'], [5, APP, 'R'], [5, G.mouthD, 'F'], [5, APP, 'R']],
  redondo: [[0, APP, 'R'], [0, G.depth, 'F'], [0, APP, 'R']],
  esquerdo: [[-3.3, APP, 'R'], [-3.3, G.roofD, 'F'], ...cornerArc.map(([s, d]) => [s, d, 'F']),
    [-3.3, cornerArc[cornerArc.length - 1][1], 'F'], [-3.3, APP, 'R']],
};
PATHS.direito = PATHS.esquerdo.map(([s, d, m]) => [-s, d, m]);
const OPS = [
  { tool: 'reto', title: 'Abertura do canal', text: 'O bedame reto de 6 mm mergulha duas vezes até o teto da câmara, formando o pescoço de 11 mm, e depois alarga a boca para 16 mm.' },
  { tool: 'redondo', title: 'Raio do fundo', text: 'O bedame de ponta redonda mergulha no centro e forma o fundo arredondado do canal.' },
  { tool: 'esquerdo', title: 'Raio R3 · lado superior', text: 'O bedame esquerdo entra pelo pescoço, desloca-se para cima por baixo do ressalto e contorna o raio R3 do teto da câmara.' },
  { tool: 'direito', title: 'Raio R3 · lado inferior', text: 'O bedame direito repete o movimento para baixo e completa a câmara em T.' },
];
const ORDER = [FOCUS, ...Array.from({ length: NG }, (_, k) => k).filter(k => k !== FOCUS)];
const SAFE_Y = Y0 + H + 260, SAFE_R = R0 - 60;
const V_FEED = 3.2, V_RAPID = 40, V_TRAVEL = 260, FAST = 14;

// linha do tempo: movimentos em coordenadas da seção (r, y)
const timeline = [];
let cursor = [SAFE_R, SAFE_Y];
function go(to, v, extra = {}) { const len = Math.hypot(to[0] - cursor[0], to[1] - cursor[1]); timeline.push({ from: cursor, to, dur: Math.max(len / v, 0.05), ...extra }); cursor = to; }
OPS.forEach((op, oi) => {
  go([SAFE_R, SAFE_Y], V_TRAVEL, { op: oi, phase: 'troca' });
  timeline.push({ from: cursor, to: cursor, dur: 1.4, op: oi, phase: 'troca', change: op.tool });
  ORDER.forEach((k, n) => {
    const slow = k === FOCUS, f = slow ? 1 : FAST;
    const path = PATHS[op.tool];
    const first = [R0 + path[0][1], yc(k) + path[0][0]];
    go([SAFE_R, first[1]], V_TRAVEL * (slow ? 1 : 2), { op: oi, groove: k, phase: slow ? 'aprox' : 'rapido' });
    go(first, V_RAPID * f, { op: oi, groove: k, phase: slow ? 'aprox' : 'rapido' });
    for (const [s, d, m] of path.slice(1)) go([R0 + d, yc(k) + s], (m === 'F' ? V_FEED : V_RAPID) * f, { op: oi, groove: k, cut: m === 'F', slow, phase: slow ? 'corte' : 'rapido', n });
    go([SAFE_R, cursor[1]], V_RAPID * f, { op: oi, groove: k, phase: slow ? 'aprox' : 'rapido' });
  });
});
go([SAFE_R, SAFE_Y], V_TRAVEL, { op: 3, phase: 'fim' });
timeline.push({ from: cursor, to: cursor, dur: 6, op: 4, phase: 'fim' });
let acc = 0; for (const s of timeline) { s.t0 = acc; acc += s.dur; }
const TOTAL = acc;

/* ---------- Cavacos ---------- */
function chipGeometry(turns, r0, r1, width) {
  const nu = 18, nw = 3, pos = [], idx = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, th = u * turns * TAU, r = r0 + (r1 - r0) * u;
    for (let j = 0; j <= nw; j++) pos.push(r * Math.cos(th), (j / nw - 0.5) * width + u * 0.8, r * Math.sin(th));
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nw; j++) { const a = i * (nw + 1) + j, b = a + nw + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const chipGeos = [chipGeometry(1.8, 1.4, 0.7, 2.2), chipGeometry(2.4, 1.2, 0.5, 2.8), chipGeometry(1.2, 1.7, 1.0, 1.8)];
const chips = [];
function spawnChip(p) {
  let c = chips.find(c => !c.alive);
  if (!c) { if (chips.length > 70) return; c = { mesh: new THREE.Mesh(chipGeos[chips.length % 3], M.chip) }; scene.add(c.mesh); chips.push(c); }
  c.alive = true; c.life = 2.2; c.mesh.visible = true; c.mesh.position.copy(p);
  c.v = V(-(40 + Math.random() * 60), 10 + Math.random() * 40, (Math.random() - 0.5) * 80);
  c.w = V(Math.random(), Math.random(), Math.random()).multiplyScalar(12);
}
function updateChips(dt) {
  for (const c of chips) {
    if (!c.alive) continue;
    c.life -= dt; c.v.y -= 600 * dt; c.mesh.position.addScaledVector(c.v, dt);
    c.mesh.rotation.x += c.w.x * dt; c.mesh.rotation.y += c.w.y * dt;
    if (c.life <= 0 || c.mesh.position.y < Y0) { c.alive = false; c.mesh.visible = false; }
  }
}

/* ---------- Câmeras ---------- */
const persp = new THREE.PerspectiveCamera(32, 1, 1, 30000);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 5000);
let camera = persp;
const controls = new OrbitControls(persp, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
const state = { t: 0, playing: true, speed: 1, view: 'auto', userCam: false, tool: null, showTarget: true, done: false };
const FOCUS_PT = V(R0 + 9, yc(FOCUS), 0);
const CAMS = {
  geral: { target: V(0, 260, 0), pos: V(1650, 1150, 2250) },
  troca: { target: V(250, 600, 0), pos: V(1250, 1000, 1600) },
  detalhe: { target: FOCUS_PT.clone(), pos: FOCUS_PT.clone().add(V(-58, 26, 118)) },
};
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  const narrow = w <= 860, r = $('panel').getBoundingClientRect();
  const dx = narrow ? 0 : (r.width + 16) / 2, dy = narrow ? h / 2 - (110 + r.top) / 2 : 0;
  persp.aspect = w / h; persp.setViewOffset(w, h, dx, dy, w, h); persp.updateProjectionMatrix();
  const span = narrow ? 70 : 46;
  ortho.top = span / 2; ortho.bottom = -span / 2; ortho.left = (-span / 2) * (w / h); ortho.right = (span / 2) * (w / h);
  ortho.setViewOffset(w, h, dx, dy, w, h); ortho.updateProjectionMatrix();
}
addEventListener('resize', resize);
function setView(v) {
  state.view = v; state.userCam = false;
  camera = v === 'perfil' ? ortho : persp;
  controls.object = camera; controls.enableRotate = v !== 'perfil';
  if (v === 'perfil') { ortho.position.copy(FOCUS_PT).add(V(0, 0, 600)); ortho.up.set(0, 1, 0); controls.target.copy(FOCUS_PT); ortho.lookAt(FOCUS_PT); ortho.zoom = 1; ortho.updateProjectionMatrix(); }
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  resize();
}
controls.addEventListener('start', () => { if (state.view !== 'perfil') state.userCam = true; });

/* ---------- Painel ---------- */
function renderPanel(opIndex) {
  const P = $('panel');
  const list = OPS.map((o, i) => `<li class="${i === opIndex ? 'on' : i < opIndex ? 'done' : ''}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span><b>${o.title}</b><small>${TOOLS[o.tool].name} · ${TOOLS[o.tool].insert}</small></span></li>`).join('')
    + `<li class="${opIndex === 4 ? 'on' : ''}"><span class="n">05</span><span><b>Conferência do perfil</b><small>Corte comparado com o desenho</small></span></li>`;
  const op = OPS[Math.min(opIndex, 3)], t = TOOLS[op.tool];
  P.innerHTML = opIndex === 4 ? `
      <p class="eyebrow">Resultado</p>
      <h2>9 canais prontos</h2>
      <p class="text">A linha azul tracejada é o perfil do desenho. A área hachurada é a peça cortada ao meio, com o canal gerado pelas quatro ferramentas.</p>
      <ol class="ops">${list}</ol>` : `
      <p class="eyebrow">Operação ${String(opIndex + 1).padStart(2, '0')} de 04</p>
      <h2>${op.title}</h2>
      <p class="text">${op.text}</p>
      <dl class="facts">
        <dt>Ferramenta</dt><dd>${t.name}</dd>
        <dt>Suporte</dt><dd>570-40RF-2525N</dd>
        <dt>Lâmina</dt><dd>${t.code}</dd>
        <dt>Pastilha</dt><dd>${t.insert}</dd>
        <dt>Geometria</dt><dd>${t.width}</dd>
      </dl>
      <ol class="ops">${list}</ol>`;
}
let lastOp = -1;

/* ---------- Laço ---------- */
const tmp = V(0, 0, 0), clock = new THREE.Clock();
let lastCommit = null, spin = 0;
function frame(fixedDt) {
  const dt = fixedDt ?? Math.min(clock.getDelta(), 0.05);
  if (state.playing && !state.done) state.t = Math.min(TOTAL, state.t + dt * state.speed);
  if (state.t >= TOTAL) state.done = true;
  // segmento atual
  let seg = timeline[timeline.length - 1];
  for (const s of timeline) if (state.t < s.t0 + s.dur) { seg = s; break; }
  // aplica cortes concluídos até aqui (inclusive ao pular para frente)
  for (const s of timeline) {
    if (s.t0 + s.dur > state.t) break;
    if (s.cut && !s.committed) {
      const b = bands[s.groove]; b.removed = pc.union(b.removed, sweep(OPS[s.op].tool, s.from, s.to)); s.committed = true; b.dirty = true;
    }
  }
  const u = clamp((state.t - seg.t0) / seg.dur);
  const pos = [seg.from[0] + (seg.to[0] - seg.from[0]) * u, seg.from[1] + (seg.to[1] - seg.from[1]) * u];
  // ferramenta ativa
  const opTool = OPS[Math.min(seg.op, 3)].tool;
  const toolKey = seg.change && u < 0.5 ? (seg.op > 0 ? OPS[seg.op - 1].tool : null) : opTool;
  for (const [k, t] of Object.entries(TOOLS)) {
    t.group.visible = k === toolKey;
    if (t.group.visible) t.group.position.set(pos[0], pos[1], 0);
  }
  // material removido: parcial no canal em detalhe, completo nos outros
  for (const b of bands) {
    if (seg.cut && seg.slow && seg.groove === b.k && !seg.committed) {
      if (!lastCommit || Math.hypot(pos[0] - lastCommit[0], pos[1] - lastCommit[1]) > 0.03) {
        rebuildBand(b, sweep(opTool, seg.from, pos)); lastCommit = pos;
      }
    } else if (b.dirty) { rebuildBand(b); b.dirty = false; lastCommit = null; }
  }
  // cavacos e rotação da mesa
  const cutting = seg.cut && state.playing && pos[0] > R0;
  if (cutting && Math.random() < (seg.slow ? 0.5 : 0.15) * state.speed) spawnChip(V(R0 - 1, pos[1], 1.5));
  updateChips(dt * state.speed);
  spin += dt * (state.done ? 0.4 : 1.6) * (state.playing ? 1 : 0); table.rotation.y = -spin;
  fill.position.set(pos[0] - 120, pos[1] + 40, 90);
  // painel e legenda
  const opIdx = seg.op;
  if (opIdx !== lastOp) { renderPanel(opIdx); lastOp = opIdx; }
  const tool = TOOLS[OPS[Math.min(opIdx, 3)].tool];
  const cap = seg.phase === 'troca' ? `Troca de ferramenta: ${tool.name.toLowerCase()}`
    : seg.phase === 'fim' ? 'Canais concluídos: perfil conferido com o desenho'
    : seg.phase === 'rapido' ? `${tool.name} · canais restantes (acelerado)`
    : `${tool.name} · canal ${FOCUS + 1} de ${NG}`;
  $('caption').textContent = cap;
  $('groove').textContent = seg.groove != null ? `Canal ${seg.groove + 1}/${NG}` : '—';
  $('bar').style.width = `${(state.t / TOTAL) * 100}%`;
  target.visible = state.showTarget;
  // câmera automática
  if (state.view === 'auto' && !state.userCam) {
    const want = seg.phase === 'troca' ? CAMS.troca : seg.phase === 'rapido' || (seg.phase === 'fim' && state.t < TOTAL - 4) ? CAMS.geral : CAMS.detalhe;
    const k = 1 - Math.exp(-dt * 2.2);
    persp.position.lerp(want.pos, k); controls.target.lerp(want.target, k);
  } else if ((state.view === 'geral' || state.view === 'detalhe') && !state.userCam) {
    const want = CAMS[state.view], k = 1 - Math.exp(-dt * 3);
    persp.position.lerp(want.pos, k); controls.target.lerp(want.target, k);
  }
  controls.update();
  renderer.render(scene, camera);
  if (!CAPTURE) requestAnimationFrame(() => frame());
}

/* ---------- Controles ---------- */
$('play').onclick = () => { if (state.done) restart(); else state.playing = !state.playing; syncPlay(); };
function syncPlay() { $('play').setAttribute('aria-label', state.playing && !state.done ? 'Pausar' : 'Reproduzir'); $('play').innerHTML = state.playing && !state.done ? '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>'; }
function restart() {
  state.t = 0; state.done = false; state.playing = true; lastCommit = null;
  timeline.forEach(s => (s.committed = false));
  bands.forEach(b => { b.removed = []; rebuildBand(b); });
  syncPlay();
}
$('restart').onclick = restart;
document.querySelectorAll('[data-speed]').forEach(b => (b.onclick = () => {
  state.speed = +b.dataset.speed;
  document.querySelectorAll('[data-speed]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
}));
document.querySelectorAll('[data-view]').forEach(b => (b.onclick = () => setView(b.dataset.view)));
$('bTarget').onclick = () => { state.showTarget = !state.showTarget; $('bTarget').setAttribute('aria-pressed', String(state.showTarget)); };
addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); $('play').click(); } });

persp.position.copy(CAMS.geral.pos); controls.target.copy(CAMS.geral.target);
new ResizeObserver(() => { document.documentElement.style.setProperty('--tb', $('toolbar').offsetHeight + 'px'); resize(); }).observe($('toolbar'));
setView('auto'); syncPlay(); resize();
$('loading').hidden = true;
window.demo = { step: dt => frame(dt), seek: t => { state.t = t; }, state, TOTAL, setView, timeline, bands, sweep, pc, TOOLS };
if (!CAPTURE) frame();
