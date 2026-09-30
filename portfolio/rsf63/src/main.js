import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toCreasedNormals, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import { MeshBVH } from 'three-mesh-bvh';

/*
  Redutor coroa e rosca sem fim RSF-63 (modelo genérico de demonstração), i = 30:1.
  Dimensões no padrão de mercado para redutores de 63 mm entre centros; desempenho ilustrativo.
  Eixo de saída (coroa) = eixo Z na origem. Eixo do sem-fim = eixo X em y = 63 (cota I).
  Base dos pés em y = -72 (cota H). Topo em y = 102 (cota R). Unidades em mm.
*/

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CAPTURE = location.hash === '#captura';
// Modo vitrine (#vitrine): sem painéis, corte A-A, câmera passeando devagar. Usado na abertura do portfólio.
const SHOWCASE = location.hash === '#vitrine';
if (SHOWCASE) document.documentElement.classList.add('vitrine');

/* ---------- Dados do modelo (RSF-63, i = 30) ---------- */
const CAT = {
  I: 63, E: 174, H: 72, R: 102, C: 144, A: 100, G: 95, G1: 112, L: 103, K: 85,
  D: 25, b: 8, t: 28.3, N: 80, M: 95, O: 8.5, S: 8,
  i: 30, n1: 1700, n2: 56.7, Pmot: 1.5, M2M: 140, fs: 1.2, M2Nom: 166, eta: 74, FR2: 3000, peso: 6, oleo: 0.25,
};

/* ---------- Geometria das engrenagens (representativa) ---------- */
const GEAR = (() => {
  const z1 = 1, z2 = 30, r1 = 18.5;
  const R2 = CAT.I - r1;              // raio primitivo da coroa
  const m = (2 * R2) / z2;            // módulo axial
  const p = Math.PI * m;              // passo axial
  const lead = z1 * p;
  const tanG = lead / (TAU * r1);     // ângulo de hélice
  return { z1, z2, r1, R2, m, p, lead, tanG, ra1: r1 + m, rf1: r1 - 1.2 * m, rf2: R2 - 1.2 * m };
})();
const TAN20 = Math.tan(20 * D2R);

/* ---------- Renderizador ---------- */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: CAPTURE });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(260, 420, 340);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 50, far: 1600 });
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.6;
scene.add(key, key.target);
scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b1b8, 0.55));
const rim = new THREE.DirectionalLight(0xe6eeff, 0.8);
rim.position.set(-300, 160, -300);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.4 }));
ground.position.y = -CAT.H - 0.2;
ground.receiveShadow = true;
scene.add(ground);

/* ---------- Materiais com hachura de corte ---------- */
// Faces internas (vistas só quando a peça está cortada) viram hachura, como num desenho técnico.
const CLIP = [];
const allMats = [];
function mat(params, hatch) {
  const m = new THREE.MeshStandardMaterial({ ...params, side: THREE.DoubleSide, clippingPlanes: CLIP, clipShadows: true });
  const hc = new THREE.Color(hatch.color), ang = hatch.angle * D2R, gap = hatch.gap || 7;
  m.onBeforeCompile = sh => {
    sh.uniforms.hatchColor = { value: hc };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 hatchColor;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (!gl_FrontFacing) {
          vec2 q = gl_FragCoord.xy / ${renderer.getPixelRatio().toFixed(2)};
          float h = fract((q.x * ${Math.cos(ang).toFixed(4)} + q.y * ${Math.sin(ang).toFixed(4)}) / ${gap.toFixed(1)});
          float line = smoothstep(0.72, 0.8, h) * (1.0 - smoothstep(0.92, 1.0, h));
          gl_FragColor = vec4(mix(hatchColor, hatchColor * 0.35, line), 1.0);
        }`);
  };
  m.customProgramCacheKey = () => `hatch-${hatch.color}-${hatch.angle}-${gap}`;
  allMats.push(m);
  return m;
}
const M = {
  alu: () => mat({ color: 0x8a939c, metalness: 0.6, roughness: 0.45 }, { color: 0xe7ecef, angle: 45 }),
  cover: () => mat({ color: 0x848e97, metalness: 0.6, roughness: 0.43 }, { color: 0xdfe6ea, angle: -45 }),
  bronze: () => mat({ color: 0xb87a3d, metalness: 1, roughness: 0.3 }, { color: 0xe8b27a, angle: -45, gap: 5 }),
  iron: () => mat({ color: 0x55595e, metalness: 0.75, roughness: 0.42 }, { color: 0x9aa0a6, angle: 45, gap: 5 }),
  steel: () => mat({ color: 0xcfd3d7, metalness: 1, roughness: 0.18 }, { color: 0xb4bcc4, angle: 60, gap: 4 }),
  bearing: () => mat({ color: 0xd9dde0, metalness: 1, roughness: 0.14 }, { color: 0xc3cad0, angle: -30, gap: 3.5 }),
  shield: () => mat({ color: 0x9a2c22, metalness: 0.1, roughness: 0.6 }, { color: 0x9a2c22, angle: 0, gap: 3 }),
  rubber: () => mat({ color: 0x1d1f21, metalness: 0, roughness: 0.75 }, { color: 0x3a3d40, angle: 0, gap: 3 }),
  screw: () => mat({ color: 0x2c2f33, metalness: 0.9, roughness: 0.35 }, { color: 0x6a7076, angle: 30, gap: 3 }),
  paint: () => mat({ color: 0xd4552a, metalness: 0.2, roughness: 0.5 }, { color: 0xf08d66, angle: 45 }),
};

/* ---------- Construção geométrica ---------- */
const evaluator = new Evaluator();
evaluator.attributes = ['position', 'normal'];
evaluator.useGroups = false;
function clean(g) { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; }
function brush(g) { const b = new Brush(clean(g)); b.updateMatrixWorld(); return b; }
function csg(base, adds = [], subs = []) {
  let r = brush(base);
  for (const g of adds) r = evaluator.evaluate(r, brush(g), ADDITION);
  for (const g of subs) r = evaluator.evaluate(r, brush(g), SUBTRACTION);
  return r.geometry;
}
function cylZ(r, z0, z1, x = 0, y = 0, seg = 72) { const g = new THREE.CylinderGeometry(r, r, z1 - z0, seg); g.rotateX(Math.PI / 2); g.translate(x, y, (z0 + z1) / 2); return g; }
function cylX(r, x0, x1, y = 0, z = 0, seg = 72) { const g = new THREE.CylinderGeometry(r, r, x1 - x0, seg); g.rotateZ(Math.PI / 2); g.translate((x0 + x1) / 2, y, z); return g; }
function cylY(r, y0, y1, x = 0, z = 0, seg = 32) { const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg); g.translate(x, (y0 + y1) / 2, z); return g; }
function box(x0, x1, y0, y1, z0, z1) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; }
function rbox(x0, x1, y0, y1, z0, z1, r) { const g = new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 4, r); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; }

// Sólido de revolução fechado com raio externo e interno que podem variar com o ângulo (dentes, rasgos de chaveta).
function revolve({ axis, us, nt, outer, inner }) {
  const pos = [], idx = [];
  const P = (u, r, th) => (axis === 'x' ? [u, r * Math.cos(th), r * Math.sin(th)] : [r * Math.cos(th), r * Math.sin(th), u]);
  const nu = us.length;
  const O = (i, j) => i * nt + j, I = (i, j) => nu * nt + i * nt + j;
  for (const f of [outer, inner]) for (let i = 0; i < nu; i++) for (let j = 0; j < nt; j++) {
    const th = (j / nt) * TAU; pos.push(...P(us[i], f(us[i], th), th));
  }
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nt; j++) {
    const j1 = (j + 1) % nt;
    idx.push(O(i, j), O(i, j1), O(i + 1, j), O(i + 1, j), O(i, j1), O(i + 1, j1));
    idx.push(I(i, j), I(i + 1, j), I(i, j1), I(i + 1, j), I(i + 1, j1), I(i, j1));
  }
  for (const [i, end] of [[0, false], [nu - 1, true]]) {
    const base = pos.length / 3;
    for (let j = 0; j < nt; j++) { const th = (j / nt) * TAU; pos.push(...P(us[i], outer(us[i], th), th)); }
    for (let j = 0; j < nt; j++) { const th = (j / nt) * TAU; pos.push(...P(us[i], inner(us[i], th), th)); }
    for (let j = 0; j < nt; j++) {
      const j1 = (j + 1) % nt, o = base + j, o1 = base + j1, n = base + nt + j, n1 = base + nt + j1;
      if (end) idx.push(o, o1, n, n, o1, n1); else idx.push(o, n, o1, n, n1, o1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return toCreasedNormals(g, 35 * D2R);
}
function samples(a, b, n) { const out = []; for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n); return out; }
function steps(breaks, fine = {}) {
  // pontos em u com os dois lados de cada degrau (ressaltos nítidos); o raio nunca é avaliado no degrau
  const us = [], e = 1e-3, last = breaks.length - 2;
  for (let k = 0; k <= last; k++) {
    const a = breaks[k] + (k > 0 ? e : 0), b = breaks[k + 1] - (k < last ? e : 0), n = fine[k] || 1;
    for (let i = 0; i <= n; i++) us.push(a + ((b - a) * i) / n);
  }
  return us;
}
// Furo com rasgo de chaveta: raio do furo r, meia largura w, fundo do rasgo a distância tk do centro, rasgo no ângulo th0.
function keyedBore(r, w, tk, th0 = Math.PI / 2) {
  const a1 = Math.atan(w / tk), a2 = Math.asin(Math.min(1, w / r));
  return (u, th) => {
    let d = Math.abs(((th - th0 + Math.PI) % TAU + TAU) % TAU - Math.PI);
    if (d < a1) return tk / Math.cos(d);
    if (d < a2) return w / Math.sin(d);
    return r;
  };
}
function latheClosed(pts, axis, seg = 96) {
  const g = new THREE.LatheGeometry(pts.map(([r, u]) => new THREE.Vector2(r, u)), seg);
  if (axis === 'x') g.rotateZ(-Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return toCreasedNormals(g, 40 * D2R);
}
function mesh(g, m) { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; }

// Rolamento rígido de esferas blindado, centrado em u = 0 ao longo do eixo.
function bearing(ri, ro, w, axis) {
  const g = new THREE.Group(), t = (ro - ri) * 0.3, gg = w * 0.16, h = w / 2;
  const ringMat = M.bearing();
  g.add(mesh(latheClosed([[ri, -h], [ri + t, -h], [ri + t, -gg], [ri + t - 0.9, 0], [ri + t, gg], [ri + t, h], [ri, h], [ri, -h]], axis), ringMat));
  g.add(mesh(latheClosed([[ro, -h], [ro, h], [ro - t, h], [ro - t, gg], [ro - t + 0.9, 0], [ro - t, -gg], [ro - t, -h], [ro, -h]], axis), ringMat));
  const rb = (ro - ri - 2 * t) * 0.5 + 0.9, rm = (ri + ro) / 2, n = Math.floor((TAU * rm) / (2.25 * rb));
  const ball = new THREE.SphereGeometry(rb, 20, 14), bm = M.bearing();
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU, s = mesh(ball, bm);
    if (axis === 'x') s.position.set(0, rm * Math.cos(a), rm * Math.sin(a)); else s.position.set(rm * Math.cos(a), rm * Math.sin(a), 0);
    g.add(s);
  }
  const shieldMat = M.shield();
  for (const s of [-1, 1]) {
    const u0 = s * (h - 0.9), u1 = s * (h - 0.3);
    g.add(mesh(latheClosed([[ri + t - 0.1, Math.min(u0, u1)], [ro - t + 0.1, Math.min(u0, u1)], [ro - t + 0.1, Math.max(u0, u1)], [ri + t - 0.1, Math.max(u0, u1)], [ri + t - 0.1, Math.min(u0, u1)]], axis), shieldMat));
  }
  return g;
}
// Retentor de lábio (NBR), face externa em u = w.
function seal(ri, ro, w, axis) {
  return mesh(latheClosed([[ri + 0.6, 0], [ro, 0], [ro, w], [ri + 2.2, w], [ri + 1.4, w * 0.6], [ri, w * 0.42], [ri + 0.2, w * 0.25], [ri + 0.6, 0]], axis), M.rubber());
}
// Parafuso Allen com a cabeça apoiada em 'at', corpo seguindo 'dir'.
function capScrew(d, len, at, dir) {
  const g = new THREE.Group(), hd = d * 1.5, hh = d, sm = M.screw();
  g.add(mesh(latheClosed([[0.001, -hh], [hd / 2 - 0.5, -hh], [hd / 2, -hh + 0.5], [hd / 2, -0.3], [hd / 2 - 0.3, 0], [0.001, 0]], 'y', 40), sm));
  g.add(mesh(latheClosed([[0.001, 0], [d / 2, 0], [d / 2, len - 0.5], [d / 2 - 0.5, len], [0.001, len]], 'y', 24), sm));
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.42, d * 0.42, 0.6, 6), M.rubber());
  socket.position.y = -hh - 0.05;
  g.add(socket);
  g.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
  g.position.copy(at);
  return g;
}

/* ---------- Peças ---------- */
const WY = CAT.I; // altura do eixo do sem-fim
const partsDef = [
  {
    id: 'flScrews', name: 'Parafusos da flange', kind: 'Fixação · 4× M6', side: 'in', out: [260, 0, 0],
    text: 'Prendem a flange de entrada B14 na carcaça. Solte em cruz para não empenar a flange.',
    facts: [['Quantidade', '4'], ['Rosca', 'M6'], ['Cabeça', 'Allen (sextavado interno)']],
    build(g) {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + Math.PI / 4;
        g.add(capScrew(6, 14, V(80.5, WY + 39 * Math.cos(a), 39 * Math.sin(a)), V(-1, 0, 0)));
      }
    },
  },
  {
    id: 'flange', name: 'Flange de entrada B14', kind: 'Acoplamento do motor', side: 'in', out: [200, 0, 0],
    text: 'Recebe o motor elétrico. O eixo do motor entra direto no furo do sem-fim, sem acoplamento. As janelas laterais deixam ver o encaixe da chaveta.',
    facts: [['Tipo', 'B14 (flange tipo C-DIN)'], ['Carcaça do motor', '71 ou 80 (tamanho 063)'], ['Face até o eixo de saída', `${CAT.G} mm (cota G)`]],
    build(g) {
      const geo = csg(cylX(46, 72, 80.5, WY), [cylX(34, 80, 89, WY), cylX(60, 88.5, 95, WY)], [
        cylX(13, 70, 97, WY), cylX(40, 92.5, 97, WY),
        box(81, 87.5, WY - 45, WY - 22, -14, 14), box(81, 87.5, WY + 22, WY + 45, -14, 14),
        ...[0, 1, 2, 3].map(k => { const a = (k / 4) * TAU + Math.PI / 4; return cylX(3.4, 70, 82, WY + 39 * Math.cos(a), 39 * Math.sin(a), 24); }),
        ...[0, 1, 2, 3].map(k => { const a = (k / 4) * TAU; return cylX(3.3, 86, 97, WY + 50 * Math.cos(a), 50 * Math.sin(a), 24); }),
      ]);
      g.add(mesh(geo, M.alu()));
    },
  },
  {
    id: 'sealIn', name: 'Retentor de entrada', kind: 'Vedação · lado do motor', side: 'in', out: [170, 0, 0],
    text: 'Vedação de lábio entre o sem-fim e a carcaça. Segura o óleo dentro do redutor e impede a entrada de poeira pelo lado do motor.',
    facts: [['Material', 'Borracha nitrílica (NBR)'], ['Local', 'Furo de entrada da carcaça']],
    build(g) { const s = seal(15, 21, 7, 'x'); s.position.set(63, WY, 0); g.add(s); },
  },
  {
    id: 'cvScrews', name: 'Parafusos da tampa', kind: 'Fixação · 4× M8', side: 'out', out: [0, 0, 180],
    text: 'Fecham a tampa lateral. É por esse lado que a coroa entra e sai da carcaça.',
    facts: [['Quantidade', '4'], ['Rosca', 'M8'], ['Cabeça', 'Allen']],
    build(g) { for (const [x, y] of [[47, 47], [-47, 47], [47, -47], [-47, -47]]) g.add(capScrew(8, 16, V(x, y, 51), V(0, 0, -1))); },
  },
  {
    id: 'cover', name: 'Tampa lateral', kind: 'Carcaça · lado da coroa', side: 'out', out: [0, 0, 130],
    text: 'Fecha a abertura por onde a coroa é montada e aloja um dos rolamentos de saída. O ressalto de Ø80 centraliza flanges e braços de torque.',
    facts: [['Material', 'Alumínio'], ['Centragem', `ØN ${CAT.N} h8`], ['Furos de fixação', `4× M8 em Ø${CAT.M}`]],
    build(g) {
      const geo = csg(rbox(-59, 59, -59, 59, 45, 51, 5), [cylZ(54.6, 38, 45.5), cylZ(CAT.N / 2, 50.5, 56)], [
        cylZ(34, 35, 50.2), cylZ(26, 49.8, 57),
        ...[[47, 47], [-47, 47], [47, -47], [-47, -47]].map(([x, y]) => cylZ(4.5, 44, 52, x, y, 24)),
        ...[45, 135, 225, 315].map(a => cylZ(3.4, 46, 52, (CAT.M / 2) * Math.cos(a * D2R), (CAT.M / 2) * Math.sin(a * D2R), 24)),
      ]);
      g.add(mesh(geo, M.cover()));
    },
  },
  {
    id: 'sealF', name: 'Retentor de saída (tampa)', kind: 'Vedação · eixo de saída', side: 'out', out: [0, -30, 112],
    text: 'Veda o eixo vazado de saída no lado da tampa. É a peça de desgaste mais comum: troque ao primeiro sinal de vazamento.',
    facts: [['Material', 'NBR'], ['Eixo', 'Ø40 (cubo da coroa)']],
    build(g) { const s = seal(20, 26, 6, 'z'); s.position.z = 50; g.add(s); },
  },
  {
    id: 'bearF', name: 'Rolamento de saída (tampa)', kind: 'Apoio da coroa', side: 'out', out: [0, -30, 92],
    text: 'Rolamento de esferas blindado que apoia o cubo da coroa na tampa. Sai de fábrica lubrificado e não precisa de manutenção.',
    facts: [['Tipo', 'Rígido de esferas, 2 blindagens'], ['Medidas (representativas)', '40 × 68 × 15 mm']],
    build(g) { const b = bearing(20, 34, 14, 'z'); b.position.z = 43; g.add(b); },
  },
  {
    id: 'wheel', name: 'Coroa com eixo vazado', kind: 'Engrenagem de saída', side: 'out', out: [0, -30, 62],
    text: `Aro de bronze com ${GEAR.z2} dentes montado num cubo de ferro fundido. O cubo é o próprio eixo de saída: vazado, Ø${CAT.D} H7 com rasgo de chaveta de ${CAT.b} mm, onde entra o eixo da máquina.`,
    facts: [['Dentes', `${GEAR.z2}`], ['Aro', 'Bronze'], ['Furo de saída', `Ø${CAT.D} H7 · chaveta ${CAT.b}`], ['Rotação de saída', `${CAT.n2.toLocaleString('pt-BR')} rpm`]],
    build(g) {
      const { R2, p, tanG, rf2, m } = GEAR;
      const throatR = GEAR.rf1 + 0.25 * m, tipMax = R2 + 1.4 * m;
      const outer = (z, th) => {
        const a = -R2 * (th - Math.PI / 2);
        const t = (((a + z * GEAR.tanG) / p) % 1 + 1) % 1;
        const d = Math.abs(t - 0.5) * p;
        const r = R2 + (p * 0.22 - d) / TAN20;
        const tip = Math.min(tipMax, CAT.I - Math.sqrt(Math.max(0, throatR * throatR - z * z)));
        return clamp(r, rf2, tip);
      };
      g.add(mesh(revolve({ axis: 'z', us: samples(-13, 13, 26), nt: GEAR.z2 * 28, outer, inner: () => 35.8 }), M.bronze()));
      const hubOuter = z => { const a = Math.abs(z); return a <= 13.05 ? 35.8 : a <= 18 ? 28 : 20; };
      g.add(mesh(revolve({ axis: 'z', us: steps([-56, -18, -13, 13, 18, 56], { 2: 4 }), nt: 180, outer: z => hubOuter(z), inner: keyedBore(CAT.D / 2, CAT.b / 2, CAT.t - CAT.D / 2) }), M.iron()));
    },
  },
  {
    id: 'bearB', name: 'Rolamento de saída (carcaça)', kind: 'Apoio da coroa', side: 'out', out: [0, 0, -70],
    text: 'Segundo apoio do cubo da coroa, alojado direto na carcaça.',
    facts: [['Tipo', 'Rígido de esferas, 2 blindagens'], ['Medidas (representativas)', '40 × 68 × 15 mm']],
    build(g) { const b = bearing(20, 34, 14, 'z'); b.position.z = -43; g.add(b); },
  },
  {
    id: 'sealB', name: 'Retentor de saída (carcaça)', kind: 'Vedação · eixo de saída', side: 'out', out: [0, 0, -92],
    text: 'Veda o eixo de saída do lado oposto à tampa.',
    facts: [['Material', 'NBR'], ['Eixo', 'Ø40 (cubo da coroa)']],
    build(g) { const s = seal(20, 26, 6, 'z'); s.rotation.x = Math.PI; s.position.z = -50; g.add(s); },
  },
  {
    id: 'cap', name: 'Tampa cega do sem-fim', kind: 'Vedação · lado oposto ao motor', side: 'in', out: [-70, 0, 0],
    text: 'Fecha o furo do sem-fim do lado oposto ao motor. Pode ser trocada por um eixo de entrada estendido (opção EE).',
    facts: [['Material', 'Aço estampado'], ['Montagem', 'Por interferência']],
    build(g) { g.add(mesh(csg(cylX(33, -73, -70, WY), [cylX(30.9, -71, -64.5, WY)], [cylX(28, -68, -64, WY)]), M.steel())); },
  },
  {
    id: 'bearWL', name: 'Rolamento do sem-fim (lado cego)', kind: 'Apoio do sem-fim', side: 'in', out: [-48, 0, 0],
    text: 'Apoia a ponta do sem-fim e absorve parte da força axial que nasce no engrenamento.',
    facts: [['Tipo', 'Rígido de esferas, 2 blindagens'], ['Medidas (representativas)', '30 × 62 × 16 mm']],
    build(g) { const b = bearing(15, 31, 16, 'x'); b.position.set(-54, WY, 0); g.add(b); },
  },
  {
    id: 'bearWR', name: 'Rolamento do sem-fim (lado motor)', kind: 'Apoio do sem-fim', side: 'in', out: [150, 0, 0],
    text: 'Apoio do sem-fim no lado do motor. Os dois rolamentos seguram o sem-fim contra a força axial do engrenamento.',
    facts: [['Tipo', 'Rígido de esferas, 2 blindagens'], ['Medidas (representativas)', '30 × 62 × 16 mm']],
    build(g) { const b = bearing(15, 31, 16, 'x'); b.position.set(54, WY, 0); g.add(b); },
  },
  {
    id: 'worm', name: 'Rosca sem-fim', kind: 'Eixo de entrada', side: 'in', out: [120, 0, 0], pivot: [0, WY, 0],
    text: `Eixo de aço com ${GEAR.z1} entrada de rosca, temperado e retificado. É vazado: o eixo do motor entra direto nele, com chaveta. A cada volta do sem-fim a coroa avança 1 dente, daí a redução de ${CAT.i}:1.`,
    facts: [['Entradas', `${GEAR.z1}`], ['Ângulo de hélice', `≈ ${(Math.atan(GEAR.tanG) / D2R).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}°`], ['Furo do motor', 'Ø19 · chaveta 6'], ['Acabamento', 'Temperado e retificado']],
    build(g) {
      const { p, lead, r1, ra1, rf1 } = GEAR;
      const outer = (x, th) => {
        const ax = Math.abs(x);
        if (ax > 36) return 15;
        const fade = clamp((33 - ax) / 5);
        const s = ((((x - (lead * (th - Math.PI)) / TAU) + p / 2) % p) + p) % p - p / 2;
        const rt = clamp(r1 + (p * 0.23 - Math.abs(s)) / TAN20, rf1, ra1);
        return Math.max(15, rf1 + (rt - rf1) * fade);
      };
      const us = [...samples(-66, -36, 6), ...samples(-35.9, 35.9, 240), ...samples(36, 70, 7)];
      const geo = revolve({ axis: 'x', us, nt: 144, outer, inner: keyedBore(9.5, 3, 21.8 - 9.5) });
      geo.translate(0, WY, 0);
      g.add(mesh(geo, M.steel()));
    },
  },
  {
    id: 'housing', name: 'Carcaça', kind: 'Estrutura', side: 'core', out: [0, 0, 0],
    text: 'Corpo quadrado de alumínio: leve e bom para dissipar o calor gerado no engrenamento. Os pés e as faces usinadas permitem montar o redutor em várias posições.',
    facts: [['Material', 'Alumínio'], ['Altura total', `${CAT.E} mm (cota E)`], ['Largura da base', `${CAT.C} mm (cota C)`], ['Furação dos pés', `${CAT.A} × ${CAT.K} mm, Ø${CAT.O}`.replace('.', ',')]],
    build(g) {
      const geo = csg(rbox(-62, 62, -64, 70, -51, 45, 6), [
        cylX(38, -70, 60, WY), cylX(32, 55, 72, WY),
        rbox(-72, 72, -72, -62, -51.5, 51.5, 2),
        cylZ(CAT.N / 2, -56, -50),
      ], [
        cylZ(52, -30, 30), cylZ(55, 28, 46), cylX(24, -46, 46, WY),
        cylX(31, -71, -46, WY), cylX(31, 46, 62.2, WY), cylX(21, 62, 73, WY),
        cylZ(34, -50.2, -29), cylZ(26, -57, -49.8),
        ...[[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => cylY(CAT.O / 2, -73, -60, sx * CAT.A / 2, sz * CAT.K / 2)),
        ...[45, 135, 225, 315].map(a => cylZ(3.4, -57, -44, (CAT.M / 2) * Math.cos(a * D2R), (CAT.M / 2) * Math.sin(a * D2R), 24)),
        ...[[47, 47], [-47, 47], [47, -47], [-47, -47]].map(([x, y]) => cylZ(3.4, 32, 46, x, y, 24)),
      ]);
      g.add(mesh(geo, M.alu()));
    },
  },
];

const assembly = new THREE.Group();
scene.add(assembly);
const parts = [];
for (const def of partsDef) {
  const group = new THREE.Group();
  const holder = new THREE.Group(); // gira (sem-fim, coroa) sem mexer na posição de explosão
  group.add(holder);
  if (def.pivot) holder.position.set(...def.pivot);
  const inner = new THREE.Group();
  if (def.pivot) inner.position.set(...def.pivot.map(v => -v));
  holder.add(inner);
  def.build(inner);
  const p = { ...def, group, holder, out: V(...def.out), t: 0, removed: false, mats: [] };
  group.traverse(o => { if (o.isMesh) { o.userData.pid = def.id; if (!p.mats.includes(o.material)) p.mats.push(o.material); } });
  assembly.add(group);
  parts.push(p);
}
const byId = Object.fromEntries(parts.map(p => [p.id, p]));

// Óleo: volume dentro da cavidade da coroa até perto do centro (0,25 L na posição B3)
const OIL_LEVEL = -6;
const oilMat = new THREE.MeshPhysicalMaterial({ color: 0xc98a1c, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.5, depthWrite: false, clippingPlanes: CLIP, side: THREE.DoubleSide });
const oilGeo = evaluator.evaluate(evaluator.evaluate(brush(cylZ(51.8, -29.8, 29.8)), brush(box(-60, 60, -60, OIL_LEVEL, -40, 40)), INTERSECTION), brush(cylZ(20.3, -40, 40)), SUBTRACTION).geometry;
const oil = new THREE.Mesh(oilGeo, oilMat);
oil.renderOrder = 3;
oil.visible = false;
assembly.add(oil);

/* ---------- Câmeras e vistas ---------- */
const persp = new THREE.PerspectiveCamera(30, 1, 5, 8000);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 8000);
let camera = persp;
const controls = new OrbitControls(persp, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 80;
controls.maxDistance = 3000;
const CENTER = V(10, 15, 0);
const state = { view: '3d', cut: 'none', explode: 0, running: true, selected: null, hovered: null, stack: [], alpha: 0 };
let orthoSpan = 330;
let focusTo = null;

function panelOffsets() {
  if (SHOWCASE) return { dx: 0, dy: 0 };
  const narrow = innerWidth <= 860;
  if (narrow) {
    const r = $('info').getBoundingClientRect();
    return { dx: 0, dy: innerHeight / 2 - (96 + r.top) / 2 };
  }
  const l = $('seq').getBoundingClientRect(), r = $('info').getBoundingClientRect();
  return { dx: ((innerWidth - r.left) - l.right) / 2, dy: 0 };
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  const { dx, dy } = panelOffsets();
  persp.aspect = w / h;
  persp.setViewOffset(w, h, dx, dy, w, h);
  persp.updateProjectionMatrix();
  const span = orthoSpan * (1 + state.explode * 1.1) * (w < 860 ? 2.1 : 1);
  ortho.top = span / 2; ortho.bottom = -span / 2; ortho.left = (-span / 2) * (w / h); ortho.right = (span / 2) * (w / h);
  ortho.setViewOffset(w, h, dx, dy, w, h);
  ortho.updateProjectionMatrix();
}
addEventListener('resize', resize);

const VIEWS = {
  '3d': { cam: 'p', dir: V(1.05, 0.62, 1.25), up: V(0, 1, 0) },
  front: { cam: 'o', dir: V(0, 0, 1), up: V(0, 1, 0) },
  side: { cam: 'o', dir: V(1, 0, 0), up: V(0, 1, 0) },
  top: { cam: 'o', dir: V(0, 1, 0), up: V(0, 0, -1) },
};
function setView(name, keepTarget = false) {
  state.view = name;
  const v = VIEWS[name];
  camera = v.cam === 'p' ? persp : ortho;
  controls.object = camera;
  controls.enableRotate = v.cam === 'p';
  const target = keepTarget ? controls.target.clone() : CENTER.clone();
  const dist = v.cam === 'p' ? (innerWidth < 860 ? 900 : 620) * (1 + state.explode * 1.1) : 1500;
  camera.up.copy(v.up);
  camera.position.copy(target).addScaledVector(v.dir.clone().normalize(), dist);
  controls.target.copy(target);
  if (v.cam === 'o') ortho.zoom = 1;
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  controls.update();
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
  resize();
  updateDims();
}

/* ---------- Cortes ---------- */
const PLANES = {
  none: [],
  aa: [new THREE.Plane(V(0, 0, -1), 0)],
  bb: [new THREE.Plane(V(-1, 0, 0), 0)],
  q: [new THREE.Plane(V(-1, 0, 0), 0), new THREE.Plane(V(0, 0, -1), 0)],
};
function setCut(name) {
  state.cut = name;
  CLIP.length = 0;
  CLIP.push(...PLANES[name]);
  for (const m of [...allMats, oilMat]) { m.clipIntersection = name === 'q'; m.needsUpdate = true; }
  oil.visible = name !== 'none';
  document.querySelectorAll('[data-cut]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cut === name)));
  if (name === 'aa' && state.view !== 'front' && state.view !== '3d') setView('front');
  if (name === 'bb' && state.view !== 'side' && state.view !== '3d') setView('side');
  $('cutNote').innerHTML = CUT_NOTES[name];
}
const CUT_NOTES = {
  none: '',
  aa: '<b>Corte A-A</b> · plano do engrenamento: o sem-fim encaixado nos dentes da coroa e o óleo no fundo.',
  bb: '<b>Corte B-B</b> · pelo eixo da coroa: cubo vazado, rolamentos, retentores e o sem-fim em seção.',
  q: '<b>Corte ¼</b> · um quarto removido para ver os dois eixos ao mesmo tempo.',
};
function isClipped(pt) {
  if (!CLIP.length) return false;
  const neg = CLIP.map(pl => pl.distanceToPoint(pt) < 0);
  return state.cut === 'q' ? neg.every(Boolean) : neg.some(Boolean);
}

/* ---------- Cotas do catálogo ---------- */
const dimsEl = $('dims');
const dimLines = new THREE.Group();
scene.add(dimLines);
const dimMat = new THREE.LineBasicMaterial({ color: 0xc9d4de });
const DIMS = { front: [], side: [] };
function dim(view, a, b, text, tick = V(1, 0, 0)) {
  const t = tick.clone().multiplyScalar(4);
  const pts = [a, b, a.clone().add(t), a.clone().sub(t), b.clone().add(t), b.clone().sub(t)];
  const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), dimMat);
  l.userData.view = view;
  dimLines.add(l);
  const el = document.createElement('span');
  el.className = 'dim';
  el.innerHTML = text;
  dimsEl.appendChild(el);
  DIMS[view].push({ el, at: a.clone().add(b).multiplyScalar(0.5), vertical: Math.abs(b.y - a.y) > Math.abs(b.x - a.x) + Math.abs(b.z - a.z) });
}
const ZF = 70, XS = 110;
dim('front', V(-96, -CAT.H, ZF), V(-96, CAT.R, ZF), `E ${CAT.E}`);
dim('front', V(-82, -CAT.H, ZF), V(-82, 0, ZF), `H ${CAT.H}`);
dim('front', V(-82, 0, ZF), V(-82, CAT.R, ZF), `R ${CAT.R}`);
dim('front', V(116, 0, ZF), V(116, CAT.I, ZF), `I ${CAT.I}`);
dim('front', V(-72, -88, ZF), V(72, -88, ZF), `C ${CAT.C}`, V(0, 1, 0));
dim('front', V(-50, -80, ZF), V(50, -80, ZF), `A ${CAT.A}`, V(0, 1, 0));
dim('front', V(0, 132, ZF), V(CAT.G, 132, ZF), `G ${CAT.G}`, V(0, 1, 0));
dim('front', V(-CAT.H, 132, ZF), V(0, 132, ZF), `H ${CAT.H}`, V(0, 1, 0));
dim('side', V(XS, -104, -56), V(XS, -104, 56), `G1 ${CAT.G1}`, V(0, 1, 0));
dim('side', V(XS, -94, -51.5), V(XS, -94, 51.5), `L ${CAT.L}`, V(0, 1, 0));
dim('side', V(XS, -84, -42.5), V(XS, -84, 42.5), `K ${CAT.K}`, V(0, 1, 0));
dim('side', V(XS, -40, 64), V(XS, 40, 64), `ØN ${CAT.N}`, V(0, 0, 1));
function updateDims() {
  const show = (state.view === 'front' || state.view === 'side') && state.explode < 0.02 && parts.every(p => !p.removed && p.t < 0.02);
  dimLines.children.forEach(l => (l.visible = show && l.userData.view === state.view));
  for (const [v, list] of Object.entries(DIMS)) list.forEach(d => (d.el.hidden = !(show && v === state.view)));
}
const tmp = new THREE.Vector3();
function placeDims() {
  for (const list of Object.values(DIMS)) for (const d of list) {
    if (d.el.hidden) continue;
    tmp.copy(d.at).project(camera);
    const x = (tmp.x * 0.5 + 0.5) * innerWidth, y = (-tmp.y * 0.5 + 0.5) * innerHeight;
    d.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)${d.vertical ? ' rotate(-90deg)' : ''}`;
  }
}

/* ---------- Painéis ---------- */
const listEl = $('list'), infoEl = $('info');
function renderList() {
  const next = parts.find(p => !p.removed && p.id !== 'housing');
  listEl.innerHTML = parts.map((p, i) => `
    <li><button type="button" class="step${p.removed ? ' is-out' : ''}${p === next ? ' is-next' : ''}${p === state.selected ? ' is-sel' : ''}" data-id="${p.id}">
      <span class="n">${String(i + 1).padStart(2, '0')}</span><span class="dot ${p.side}"></span>
      <span class="nm">${p.name}</span><span class="st">${p.removed ? 'fora' : p === next ? 'próxima' : ''}</span>
    </button></li>`).join('');
  $('count').textContent = `${parts.filter(p => p.removed).length}/${parts.length - 1} fora`;
}
const fmt = (n, d = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
function renderInfo() {
  const p = state.selected;
  if (!p) {
    infoEl.innerHTML = `
      <p class="eyebrow">Modelo de demonstração · RSF-63</p>
      <h2>Coroa e rosca sem fim</h2>
      <p class="text">O sem-fim, no alto, gira junto com o motor. Cada volta dele empurra a coroa de bronze em 1 dente. Com ${GEAR.z2} dentes, a saída gira ${CAT.i} vezes mais devagar e com muito mais torque, num ângulo de 90° com a entrada.</p>
      <dl class="facts">
        <dt>Redução</dt><dd><b>${CAT.i}</b>:1</dd>
        <dt>Rotação de saída</dt><dd><b>${fmt(CAT.n2, 1)}</b> rpm</dd>
        <dt>Torque de saída</dt><dd><b>${fmt(CAT.M2M, 1)}</b> Nm</dd>
        <dt>Motor</dt><dd><b>${fmt(CAT.Pmot, 1)}</b> cv</dd>
        <dt>Rendimento</dt><dd><b>${CAT.eta}</b> %</dd>
        <dt>Fator de serviço</dt><dd><b>${fmt(CAT.fs, 1)}</b></dd>
        <dt>Carga radial máx.</dt><dd><b>${fmt(CAT.FR2)}</b> N</dd>
        <dt>Óleo</dt><dd>${fmt(CAT.oleo, 2)} L · sintético VG 320</dd>
        <dt>Massa</dt><dd><b>${fmt(CAT.peso, 1)}</b> kg</dd>
      </dl>
      <p class="note">Projeto de demonstração da Vista Explodida: um redutor genérico, sem marca, com dimensões típicas do tamanho 63. Valores de desempenho ilustrativos, para entrada a 1.700 rpm.</p>`;
    return;
  }
  infoEl.innerHTML = `
    <p class="eyebrow kind"><span class="dot ${p.side}"></span>Peça ${String(parts.indexOf(p) + 1).padStart(2, '0')} · ${p.kind}</p>
    <h2>${p.name}</h2>
    <p class="text">${p.text}</p>
    <dl class="facts">${p.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <div class="actions">
      ${p.id === 'housing' ? '' : `<button class="btn primary" type="button" data-act="toggle">${p.removed ? 'Recolocar peça' : 'Remover peça'}</button>`}
      <button class="btn" type="button" data-act="overview">Ver redutor inteiro</button>
    </div>`;
}
function renderAll() { renderList(); renderInfo(); }
let toastTimer;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2600); }

function partCenter(p, t) {
  const b = new THREE.Box3().setFromObject(p.group);
  return b.getCenter(V()).sub(p.group.position).addScaledVector(p.out, t);
}
function select(p, focus = false) {
  state.selected = p;
  if (focus && p && state.view === '3d') focusTo = partCenter(p, p.removed ? 1 : state.explode);
  renderAll();
}
function removePart(p) { if (p.removed || p.id === 'housing') return; p.removed = true; state.stack.push(p); }
function restorePart(p) { p.removed = false; state.stack = state.stack.filter(x => x !== p); }
function nextStep() {
  const p = parts.find(x => !x.removed && x.id !== 'housing');
  if (!p) return toast('Só sobrou a carcaça. Use “Montar tudo” para recomeçar.');
  removePart(p); select(p); updateDims();
}
function undoStep() {
  const p = state.stack.pop();
  if (!p) return toast('Nenhuma peça fora do redutor.');
  p.removed = false; select(p); updateDims();
}
function assembleAll() {
  parts.forEach(p => (p.removed = false)); state.stack = [];
  setExplode(0); renderAll();
}
function setExplode(v) {
  state.explode = v;
  $('explode').value = Math.round(v * 100);
  resize(); updateDims();
}

/* ---------- Interação ---------- */
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  for (const h of raycaster.intersectObjects(parts.map(p => p.group), true)) {
    if (isClipped(h.point)) continue;
    return byId[h.object.userData.pid] || null;
  }
  return null;
}
let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', e => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
  if (moved > 6) return;
  select(pick(e));
});
canvas.addEventListener('dblclick', e => { const p = pick(e); if (p && p.id !== 'housing') { p.removed ? restorePart(p) : removePart(p); select(p); updateDims(); } });
canvas.addEventListener('pointermove', e => {
  const tip = $('tip');
  if (e.pointerType !== 'mouse' || down) { tip.hidden = true; return; }
  const p = pick(e);
  state.hovered = p;
  canvas.style.cursor = p ? 'pointer' : 'grab';
  if (p) { tip.textContent = p.name + (p.removed ? ' · fora' : ''); tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; }
  tip.hidden = !p;
});
canvas.addEventListener('pointerleave', () => { state.hovered = null; $('tip').hidden = true; });
controls.addEventListener('start', () => (focusTo = null));

listEl.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) select(byId[b.dataset.id], true); });
infoEl.addEventListener('click', e => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'toggle' && state.selected) { const p = state.selected; p.removed ? restorePart(p) : removePart(p); renderAll(); updateDims(); }
  if (act === 'overview') { select(null); focusTo = CENTER.clone(); }
});
$('bNext').onclick = nextStep;
$('bUndo').onclick = undoStep;
$('bAll').onclick = () => { assembleAll(); focusTo = CENTER.clone(); };
$('bRun').onclick = () => { state.running = !state.running; $('bRun').setAttribute('aria-pressed', String(state.running)); $('readout').hidden = !state.running; };
$('explode').addEventListener('input', e => setExplode(e.target.value / 100));
document.querySelectorAll('[data-view]').forEach(b => (b.onclick = () => setView(b.dataset.view)));
document.querySelectorAll('[data-cut]').forEach(b => (b.onclick = () => setCut(b.dataset.cut)));
$('bParts').onclick = () => { const o = $('seq').classList.toggle('open'); $('bParts').setAttribute('aria-pressed', String(o)); };
addEventListener('keydown', e => {
  if (e.target.matches('input:not([type=range]), textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'd') nextStep();
  else if (k === 'r') undoStep();
  else if (k === 'm') assembleAll();
  else if (k === ' ') { e.preventDefault(); $('bRun').click(); }
  else if (k === '1') setView('3d'); else if (k === '2') setView('front'); else if (k === '3') setView('side'); else if (k === '4') setView('top');
  else if (k === 'escape') select(null);
});

/* ---------- Laço ---------- */
const ACCENT = new THREE.Color(0x2f8fe0);
const clock = new THREE.Clock();
function frame(fixedDt) {
  const dt = fixedDt ?? Math.min(clock.getDelta(), 0.05);
  const ease = 1 - Math.exp(-dt * (reduceMotion ? 14 : 5));
  for (const p of parts) {
    const target = p.removed ? 1 : state.explode;
    p.t += (target - p.t) * ease;
    if (Math.abs(target - p.t) < 1e-4) p.t = target;
    p.group.position.copy(p.out).multiplyScalar(p.t);
    const hl = p === state.selected ? 0.35 : p === state.hovered ? 0.2 : 0;
    for (const m of p.mats) { m.emissive.copy(ACCENT); m.emissiveIntensity = hl; }
  }
  oil.position.copy(byId.housing.group.position);
  // sem-fim 1.700 rpm mostrado a 1:40; a coroa segue na relação exata 30:1
  if (state.running) state.alpha += ((CAT.n1 / 60) * TAU / 40) * dt;
  byId.worm.holder.rotation.x = state.alpha;
  byId.wheel.holder.rotation.z = state.alpha / CAT.i;
  if (focusTo) {
    const before = controls.target.clone();
    controls.target.lerp(focusTo, 1 - Math.exp(-dt * 4));
    camera.position.add(controls.target.clone().sub(before));
    if (controls.target.distanceTo(focusTo) < 0.05) focusTo = null;
  }
  if (SHOWCASE) {
    // passeia pela frente do corte (±45°), sem nunca mostrar o lado fechado
    showT += dt;
    const az = 0.45 + Math.sin(showT * 0.22) * 0.75, el = 0.3 + Math.sin(showT * 0.13) * 0.1, dist = innerWidth < innerHeight ? 500 : 440;
    persp.position.set(SHOW_TARGET.x + Math.sin(az) * Math.cos(el) * dist, SHOW_TARGET.y + Math.sin(el) * dist, SHOW_TARGET.z + Math.cos(az) * Math.cos(el) * dist);
    controls.target.copy(SHOW_TARGET);
  }
  controls.update();
  renderer.render(scene, camera);
  if (state.view === 'front' || state.view === 'side') updateDims(); // cotas aparecem quando as peças terminam de voltar
  placeDims();
  if (!CAPTURE) requestAnimationFrame(() => frame());
}

renderAll();
setCut(SHOWCASE ? 'aa' : 'none');
setView('3d');
let showT = 0;
const SHOW_TARGET = V(34, 12, 0);
if (SHOWCASE) { controls.enabled = false; }
new ResizeObserver(() => { document.documentElement.style.setProperty('--tb', $('toolbar').offsetHeight + 'px'); resize(); }).observe($('toolbar'));
$('loading').hidden = true;
window.redutor = {
  setView, setCut, setExplode, nextStep, assembleAll, select: id => select(byId[id] || null), step: dt => frame(dt),
  // usado pela extração do desenho 2D (tools/extract2d.mjs)
  internals: { THREE, assembly, parts, renderer, mergeVertices, MeshBVH, CAT, state, get camera() { return camera; } },
};
if (!CAPTURE) frame();
