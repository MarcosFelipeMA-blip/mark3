import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/*
  Fábrica genérica em isométrico, no estilo "maquete de argila": cada área mostra um dos 5 passos para cortar custos.
  Unidades em metros. Piso em y = 0; paredes ao fundo (z = −7) e à esquerda (x = −12).
*/
const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const CAPTURE = location.hash === '#captura';

/* ---------- Renderizador ---------- */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: CAPTURE });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(14, 26, 18); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 14, bottom: -14, near: 5, far: 70 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun);
scene.add(new THREE.HemisphereLight(0xf2f5f8, 0x3a4552, 0.7));

/* ---------- Materiais (argila clara + detalhes escuros) ---------- */
const std = (color, metalness = 0.05, roughness = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
const M = {
  floor: std(0xe9ecef, 0, 0.9), slab: std(0xc9cfd5, 0, 0.85), wall: std(0xf3f5f7, 0, 0.9), line: std(0xd3d8dd, 0, 0.9),
  clay: std(0xdfe3e7, 0.05, 0.6), clay2: std(0xc7cdd3, 0.1, 0.55), dark: std(0x2a3038, 0.3, 0.5), steel: std(0xb8c0c8, 0.85, 0.3),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x9fb4c6, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.45, depthWrite: false }),
  screen: std(0x10161d, 0.2, 0.4, { emissive: 0x2f8fe0, emissiveIntensity: 0.35 }),
  person: std(0xd9cfc3, 0, 0.75), person2: std(0xb9c3cc, 0, 0.75),
  wood: std(0xd8c7a8, 0, 0.8), robot: std(0xf0a24a, 0.2, 0.45), fence: std(0xf2c230, 0.2, 0.5, { transparent: true, opacity: 0.85 }),
  green: std(0x1d5a33, 0, 0.4, { emissive: 0x2fe06a, emissiveIntensity: 1.2 }), amber: std(0x5a4010, 0, 0.4, { emissive: 0xffb020, emissiveIntensity: 1.0 }),
  red: std(0x501010, 0, 0.4, { emissive: 0xff3030, emissiveIntensity: 0.6 }), off: std(0x30353b, 0, 0.6),
  part: std(0x9aa3ab, 0.85, 0.3), granite: std(0x3a3f45, 0.1, 0.6),
};
const ZONE_COLORS = { 1: 0x5cb8ff, 2: 0x5cb8ff, 3: 0x5cb8ff, 4: 0x5cb8ff, 5: 0x5cb8ff };
function box(w, h, d, mat, x, y, z, parent = scene, r = 0) {
  const g = r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cyl(rt, rb, h, mat, x, y, z, parent = scene, s = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.redraw = (...a) => { draw(c.getContext('2d'), w, h, ...a); t.needsUpdate = true; }; t.redraw(); return t;
}

/* ---------- Piso e paredes ---------- */
const FW = 24, FD = 14;
box(FW + 0.6, 0.35, FD + 0.6, M.slab, 0, -0.175, 0);
const floor = box(FW, 0.02, FD, M.floor, 0, 0.01, 0); floor.castShadow = false;
// faixas de circulação
for (const [x, z, w, d] of [[0, 0.9, FW - 1, 0.08], [0, 1.9, FW - 1, 0.08], [-4.1, 0, 0.08, FD - 1]]) { const m = box(w, 0.005, d, M.line, x, 0.025, z); m.castShadow = false; }
box(FW, 3.2, 0.25, M.wall, 0, 1.6, -FD / 2 - 0.12);
box(0.25, 3.2, FD, M.wall, -FW / 2 - 0.12, 1.6, 0);
// janelas altas na parede do fundo
for (let i = 0; i < 6; i++) { const m = box(2.4, 0.7, 0.05, M.glass, -9 + i * 3.8, 2.5, -FD / 2 + 0.02); m.castShadow = false; }

/* ---------- Pessoas (figuras de argila) ---------- */
const people = [];
function person(x, z, rot = 0, mat = M.person, pose = 'stand') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.75, 6, 14), mat); body.position.y = pose === 'sit' ? 0.85 : 1.0; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), mat); head.position.y = pose === 'sit' ? 1.48 : 1.65; head.castShadow = true; g.add(head);
  if (pose !== 'sit') { [-0.1, 0.1].forEach(dx => { const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.45, 4, 8), mat); l.position.set(dx, 0.32, 0); l.castShadow = true; g.add(l); }); }
  people.push({ g, head, body, ph: Math.random() * TAU }); return g;
}

/* ---------- Zona 1 e 2: planejamento e dados (escritório) ---------- */
const office = new THREE.Group(); scene.add(office);
function desk(x, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; office.add(g);
  box(1.6, 0.05, 0.8, M.wood, 0, 0.75, 0, g); [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]].forEach(([a, b]) => box(0.05, 0.75, 0.05, M.dark, a, 0.375, b, g));
  box(0.62, 0.38, 0.03, M.dark, 0, 1.0, -0.25, g); const s = box(0.56, 0.32, 0.01, M.screen, 0, 1.0, -0.233, g); s.castShadow = false;
  box(0.06, 0.2, 0.06, M.dark, 0, 0.85, -0.27, g);
  // cadeira
  box(0.5, 0.06, 0.5, M.dark, 0, 0.48, 0.55, g); box(0.5, 0.5, 0.06, M.dark, 0, 0.75, 0.8, g); cyl(0.03, 0.03, 0.45, M.steel, 0, 0.23, 0.55, g, 8);
  return g;
}
desk(-10.2, -4.6); desk(-8.2, -4.6); desk(-10.2, -2.4, Math.PI); desk(-8.2, -2.4, Math.PI);
person(-10.2, -4.05, Math.PI, M.person, 'sit'); person(-8.2, -2.95, 0, M.person2, 'sit');
// painel de dados na parede (KPIs ao vivo)
const KPI = { oee: 71, dt: 18, scrap: 3.4 };
const dashTex = canvasTex(1024, 512, (x, w, h) => {
  x.fillStyle = '#0c1218'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#5cb8ff'; x.font = '700 40px Barlow, Arial'; x.fillText('PAINEL DA PRODUÇÃO', 36, 62);
  const tile = (i, label, val, unit, pct, col) => {
    const X = 36 + i * 325, Y = 100; x.fillStyle = '#141c25'; x.fillRect(X, Y, 300, 190);
    x.fillStyle = '#8b98a5'; x.font = '500 26px "IBM Plex Mono", monospace'; x.fillText(label, X + 20, Y + 44);
    x.fillStyle = '#e8edf2'; x.font = '700 78px Barlow, Arial'; x.fillText(val, X + 20, Y + 130); x.font = '500 30px Barlow, Arial'; x.fillStyle = '#8b98a5'; x.fillText(unit, X + 22 + x.measureText(val).width * 2.6, Y + 130);
    x.fillStyle = '#26303a'; x.fillRect(X + 20, Y + 155, 260, 12); x.fillStyle = col; x.fillRect(X + 20, Y + 155, 260 * pct, 12);
  };
  tile(0, 'OEE', KPI.oee.toFixed(0), '%', KPI.oee / 100, '#6fd39a');
  tile(1, 'PARADAS', KPI.dt.toFixed(0), 'min', KPI.dt / 60, '#f0a24a');
  tile(2, 'REFUGO', KPI.scrap.toFixed(1), '%', KPI.scrap / 10, '#5cb8ff');
  x.strokeStyle = '#5cb8ff'; x.lineWidth = 4; x.beginPath();
  for (let i = 0; i <= 40; i++) { const X = 36 + i * 23.5, Y = 440 - (Math.sin(i * 0.45 + KPI.oee * 0.05) * 30 + i * 1.6); i ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke();
  x.fillStyle = '#8b98a5'; x.font = '500 22px "IBM Plex Mono", monospace'; x.fillText('produção por hora · últimas 8 h', 36, 492);
});
box(3.3, 1.75, 0.08, M.dark, -9.2, 1.75, -FD / 2 + 0.06);
const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.55), new THREE.MeshBasicMaterial({ map: dashTex, toneMapped: false })); dash.position.set(-9.2, 1.75, -FD / 2 + 0.11); scene.add(dash);
// quadro de planejamento (cadeia de valor)
const planTex = canvasTex(1024, 360, (x, w, h) => {
  x.fillStyle = '#f7f8fa'; x.fillRect(0, 0, w, h); x.fillStyle = '#17202a'; x.font = '700 38px Barlow, Arial'; x.fillText('CADEIA DE VALOR', 30, 52);
  ['Projeto', 'Planejamento', 'Operações', 'Logística', 'Usinagem', 'Verificação'].forEach((s, i) => {
    const X = 30 + i * 165; x.fillStyle = i === 4 ? '#5cb8ff' : '#d3d8dd'; x.fillRect(X, 110, 150, 120);
    x.fillStyle = '#17202a'; x.font = '600 24px Barlow, Arial'; x.fillText(s, X + 10, 260); if (i < 5) { x.fillStyle = '#8b98a5'; x.fillText('›', X + 152, 180); }
  });
});
box(0.06, 1.1, 3.0, M.wall, -FW / 2 + 0.05, 1.5, -2.8);
const plan = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.0), new THREE.MeshBasicMaterial({ map: planTex, toneMapped: false })); plan.position.set(-FW / 2 + 0.1, 1.5, -2.8); plan.rotation.y = Math.PI / 2; scene.add(plan);

/* ---------- Zona 3: logística de ferramentas ---------- */
function rack(x, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  [[-1, -0.3], [1, -0.3], [-1, 0.3], [1, 0.3]].forEach(([a, b]) => box(0.06, 2.2, 0.06, M.dark, a, 1.1, b, g));
  for (let i = 0; i < 4; i++) {
    box(2.06, 0.04, 0.64, M.clay2, 0, 0.25 + i * 0.6, 0, g);
    for (let k = 0; k < 4; k++) if ((i + k + Math.round(x)) % 3) box(0.38, 0.28, 0.45, i % 2 ? M.clay : M.wood, -0.72 + k * 0.48, 0.42 + i * 0.6, 0, g, 0.02);
  }
  return g;
}
rack(-10.6, 2.0, Math.PI / 2); rack(-10.6, 4.6, Math.PI / 2); rack(-8.3, 6.3, 0);
// carrossel de ferramentas (75 posições, simplificado)
const carousel = new THREE.Group(); carousel.position.set(-7.6, 0, 3.0); scene.add(carousel);
cyl(0.36, 0.36, 0.05, M.dark, 0, 0.02, 0, carousel, 40);
const drum = cyl(0.35, 0.35, 0.62, M.clay, 0, 0.36, 0, carousel, 48);
cyl(0.37, 0.37, 0.03, M.dark, 0, 0.68, 0, carousel, 40);
box(0.2, 0.66, 0.06, M.dark, 0, 0.34, 0.36, carousel);
const carSpin = new THREE.Group(); carSpin.position.y = 0.36; carousel.add(carSpin);
for (let i = 0; i < 15; i++) { const f = box(0.004, 0.55, 0.25, M.dark, 0, 0, 0, carSpin); f.position.set(Math.sin((i / 15) * TAU) * 0.2, 0, Math.cos((i / 15) * TAU) * 0.2); f.rotation.y = (i / 15) * TAU; }
// máquina de vending de ferramentas
const vend = new THREE.Group(); vend.position.set(-6.2, 0, 4.9); vend.rotation.y = -Math.PI / 2; scene.add(vend);
box(0.9, 1.85, 0.75, M.clay, 0, 0.925, 0, vend, 0.03); const vg = box(0.55, 1.15, 0.02, M.glass, -0.12, 1.15, 0.38, vend); vg.castShadow = false;
const vs = box(0.2, 0.28, 0.02, M.screen, 0.3, 1.35, 0.38, vend); vs.castShadow = false;
// pré-setter de ferramentas na bancada
box(1.6, 0.9, 0.7, M.clay2, -8.8, 0.45, 0.7, scene, 0.03); box(0.4, 0.6, 0.35, M.dark, -9.2, 1.2, 0.6); box(0.3, 0.22, 0.03, M.screen, -8.6, 1.15, 0.5);
person(-8.8, 1.35, Math.PI, M.person2);
// AGV que leva as ferramentas até as máquinas
const agv = new THREE.Group(); scene.add(agv);
box(0.9, 0.25, 0.6, M.dark, 0, 0.15, 0, agv, 0.04); box(0.6, 0.3, 0.45, M.wood, 0, 0.43, 0, agv, 0.02); const agvLed = box(0.9, 0.03, 0.02, M.green, 0, 0.2, 0.31, agv);
const AGV_PATH = new THREE.CatmullRomCurve3([V(-6.8, 0, 1.4), V(-2, 0, 1.4), V(3, 0, 1.4), V(6.5, 0, 1.4), V(6.5, 0, 1.4)].map(p => p), false);

/* ---------- Zona 5: usinagem (centros CNC e torno) ---------- */
const machines = [];
function cnc(x, z, kind = 'mill') {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const w = kind === 'lathe' ? 2.8 : 2.2;
  box(w, 2.1, 1.8, M.clay, 0, 1.05, 0, g, 0.06);
  box(w + 0.05, 0.25, 1.85, M.clay2, 0, 0.12, 0, g, 0.03);
  const win = box(w * 0.55, 0.9, 0.02, M.glass, -w * 0.12, 1.3, 0.91, g); win.castShadow = false;
  box(w * 0.6, 1.25, 0.03, M.clay2, -w * 0.12, 1.2, 0.905, g).renderOrder = -1;
  // interior visível pela janela
  const inner = new THREE.Group(); inner.position.set(-w * 0.12, 0, 0.3); g.add(inner);
  const spindle = kind === 'lathe' ? cyl(0.18, 0.18, 0.4, M.steel, -0.4, 1.25, 0, inner, 20) : cyl(0.09, 0.12, 0.45, M.steel, 0, 1.5, 0, inner, 16);
  if (kind === 'lathe') spindle.rotation.z = Math.PI / 2;
  const part = kind === 'lathe' ? cyl(0.08, 0.08, 0.5, M.part, 0, 1.25, 0, inner, 16) : box(0.4, 0.2, 0.3, M.part, 0, 1.0, 0, inner);
  if (kind === 'lathe') part.rotation.z = Math.PI / 2;
  // painel CNC
  box(0.5, 0.65, 0.08, M.dark, w / 2 - 0.35, 1.45, 0.94, g); const scr = box(0.38, 0.26, 0.01, M.screen, w / 2 - 0.35, 1.6, 0.985, g); scr.castShadow = false;
  // torre de sinalização
  cyl(0.02, 0.02, 0.3, M.dark, w / 2 - 0.15, 2.25, -0.6, g, 8);
  const lights = [M.red, M.amber, M.green].map((m, i) => cyl(0.06, 0.06, 0.09, M.off, w / 2 - 0.15, 2.42 + i * 0.1, -0.6, g, 16));
  // esteira de cavacos
  box(0.5, 0.5, 1.2, M.clay2, w / 2 + 0.3, 0.25, 0.1, g, 0.03); box(0.5, 0.4, 0.5, M.dark, w / 2 + 0.3, 0.5, 0.9, g);
  machines.push({ g, spindle, part, lights, kind, ph: Math.random() * 10 });
  return g;
}
cnc(-2.0, -4.8); cnc(1.2, -4.8); cnc(4.5, -4.8, 'lathe');
person(-2.4, -3.3, Math.PI); person(1.6, -3.3, Math.PI, M.person2);
// bancada de ferramentas ao lado das máquinas
box(1.4, 0.9, 0.6, M.clay2, -2.2, 0.45, -1.2, scene, 0.03); box(0.25, 0.08, 0.25, M.steel, -2.5, 0.94, -1.2);

/* ---------- Zona 4: automação (célula robotizada) ---------- */
const cellX = 9.3, cellZ = -3.6;
cnc(cellX + 0.6, -5.4);
// cerca de proteção
for (const [x, z, w, d] of [[cellX - 2.1, cellZ + 1.1, 0.04, 2.6], [cellX + 0.4, cellZ + 2.4, 5.0, 0.04]]) { const f = box(w, 1.6, d, M.fence, x, 0.8, z); f.castShadow = false; }
// esteira com peças
const conv = new THREE.Group(); conv.position.set(cellX - 1.3, 0, cellZ + 1.2); scene.add(conv);
box(0.6, 0.8, 2.4, M.clay2, 0, 0.4, 0, conv, 0.03); const belt = box(0.5, 0.02, 2.4, M.dark, 0, 0.81, 0, conv);
const convParts = Array.from({ length: 5 }, (_, i) => cyl(0.1, 0.1, 0.16, M.part, 0, 0.9, -1 + i * 0.5, conv, 18));
// robô articulado
const robot = new THREE.Group(); robot.position.set(cellX - 0.2, 0, cellZ + 0.8); scene.add(robot);
cyl(0.32, 0.38, 0.3, M.dark, 0, 0.15, 0, robot, 28);
const rBase = new THREE.Group(); rBase.position.y = 0.3; robot.add(rBase);
cyl(0.26, 0.28, 0.35, M.robot, 0, 0.17, 0, rBase, 28);
const rShoulder = new THREE.Group(); rShoulder.position.y = 0.45; rBase.add(rShoulder);
box(0.22, 1.0, 0.22, M.robot, 0, 0.5, 0, rShoulder, 0.05);
const rElbow = new THREE.Group(); rElbow.position.y = 1.0; rShoulder.add(rElbow);
cyl(0.14, 0.14, 0.3, M.dark, 0, 0, 0, rElbow, 18).rotation.x = Math.PI / 2;
box(0.18, 0.85, 0.18, M.robot, 0, 0.42, 0, rElbow, 0.05);
const rWrist = new THREE.Group(); rWrist.position.y = 0.85; rElbow.add(rWrist);
cyl(0.08, 0.08, 0.16, M.dark, 0, 0.08, 0, rWrist, 14);
box(0.22, 0.05, 0.08, M.dark, 0, 0.18, 0, rWrist);
const held = cyl(0.1, 0.1, 0.16, M.part, 0, 0.3, 0, rWrist, 18); held.visible = false;
// operador fora da célula
person(cellX + 2.2, cellZ + 3.4, Math.PI * 0.85, M.person2);

/* ---------- Verificação (máquina de medição) ---------- */
const cmm = new THREE.Group(); cmm.position.set(3.4, 0, 4.4); scene.add(cmm);
box(2.0, 0.75, 1.3, M.clay2, 0, 0.375, 0, cmm, 0.03); box(1.9, 0.25, 1.2, M.granite, 0, 0.87, 0, cmm);
const bridge = new THREE.Group(); bridge.position.y = 1.0; cmm.add(bridge);
box(0.08, 1.0, 0.12, M.clay, -0.85, 0.5, 0, bridge); box(0.08, 1.0, 0.12, M.clay, 0.85, 0.5, 0, bridge); box(1.8, 0.12, 0.16, M.clay, 0, 1.0, 0, bridge);
const probe = new THREE.Group(); bridge.add(probe); box(0.12, 0.6, 0.12, M.dark, 0, 0.7, 0, probe); cyl(0.02, 0.02, 0.15, M.steel, 0, 0.33, 0, probe, 8);
box(0.5, 0.15, 0.4, M.part, 0, 1.07, 0, cmm);
person(3.4, 5.6, Math.PI, M.person);
box(1.0, 0.9, 0.6, M.clay2, 5.6, 0.45, 5.2, scene, 0.03); box(0.5, 0.32, 0.03, M.screen, 5.6, 1.15, 5.0);
// paletes de peças prontas
for (const [x, z] of [[8.6, 3.2], [10, 3.2], [8.6, 4.8]]) { box(1.1, 0.14, 1.1, M.wood, x, 0.07, z, scene); for (let i = 0; i < 4; i++) cyl(0.12, 0.12, 0.2, M.part, x - 0.27 + (i % 2) * 0.54, 0.24, z - 0.27 + Math.floor(i / 2) * 0.54, scene, 16); }

/* ---------- Zonas e marcadores ---------- */
const ZONES = [
  { n: 1, name: 'Prioridades', c: V(-9.2, 0, -3.6), w: 5.2, d: 5.2, cam: [V(-2.5, 7.5, 6.5), V(-9.2, 0.9, -3.8)] },
  { n: 2, name: 'Dados', c: V(-9.2, 0, -5.6), w: 4.0, d: 1.6, cam: [V(-6.5, 3.6, 1.8), V(-9.2, 1.6, -6.4)] },
  { n: 3, name: 'Logística', c: V(-8.3, 0, 3.6), w: 5.8, d: 6.0, cam: [V(-1.5, 7.0, 11.5), V(-8.4, 0.8, 3.5)] },
  { n: 4, name: 'Automação', c: V(9.4, 0, -3.8), w: 5.0, d: 5.6, cam: [V(15.5, 7.0, 4.5), V(9.0, 0.9, -3.8)] },
  { n: 5, name: 'Usinagem', c: V(1.5, 0, -4.2), w: 9.6, d: 4.4, cam: [V(5.5, 6.5, 6.5), V(1.4, 1.0, -4.4)] },
];
const zoneMat = n => new THREE.MeshBasicMaterial({ color: ZONE_COLORS[n], transparent: true, opacity: 0, depthWrite: false });
ZONES.forEach(z => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(z.w, z.d).rotateX(-Math.PI / 2), zoneMat(z.n)); m.position.set(z.c.x, 0.03, z.c.z); scene.add(m); z.plate = m;
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(z.w, z.d).rotateX(-Math.PI / 2)), new THREE.LineBasicMaterial({ color: ZONE_COLORS[z.n], transparent: true, opacity: 0 }));
  edge.position.set(z.c.x, 0.035, z.c.z); scene.add(edge); z.edge = edge;
});
const markersEl = $('markers');
ZONES.forEach(z => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'mk'; b.dataset.zone = z.n;
  b.innerHTML = `<b>${z.n}</b><span>${z.name}</span>`; b.setAttribute('aria-label', `Passo ${z.n}: ${z.name}`);
  markersEl.appendChild(b); z.el = b; z.anchor = V(z.c.x, 2.9, z.c.z);
});
ZONES[1].anchor = V(-9.2, 2.95, -6.6); ZONES[0].anchor = V(-9.2, 2.2, -3.2);

/* ---------- Capítulos ---------- */
const SRC = '<span class="src">Fonte dos números: Sandvik Coromant, e-book “Corte os custos na fonte”.</span>';
const CHAPTERS = [
  { id: 'fabrica', name: 'A fábrica', dur: 10, zone: 0 },
  { id: 'p1', name: '1 · Prioridades', dur: 9, zone: 1 },
  { id: 'p2', name: '2 · Dados', dur: 9, zone: 2 },
  { id: 'p3', name: '3 · Logística', dur: 10, zone: 3 },
  { id: 'p4', name: '4 · Automação', dur: 10, zone: 4 },
  { id: 'p5', name: '5 · Usinagem', dur: 10, zone: 5 },
  { id: 'desafio', name: 'Seu desafio', dur: 0, zone: 0 },
];
const TEXT = {
  fabrica: ['Onde está o custo da sua fábrica?', `A ferramenta é cerca de <b>3% do custo</b> de uma peça. Baixar 1% no preço dela pouco muda o resultado. Melhorar o processo pode reduzir até <b>15% do custo total</b>. Clique em cada área para ver os 5 passos.${SRC}`, 'Explore a fábrica'],
  p1: ['1. Defina as prioridades', 'Antes de trocar ferramenta, mapeie onde o custo nasce: projeto, planejamento, operações, logística, usinagem e verificação. A cadeia inteira importa, não só o preço da pastilha.', '<b>Estudo de processo em 3D:</b> cada operação simulada antes de produzir, para decidir com dados.'],
  p2: ['2. Linha de produção transparente', 'Dados da máquina em tempo real (OEE, paradas e refugo) mostram onde o tempo e o dinheiro se perdem. O que não se mede, não melhora.', '<b>Apresentações 3D interativas</b> para treinar a equipe e alinhar produção, compras e engenharia.'],
  p3: ['3. Logística de ferramentas', 'Ferramenta certa no ponto de uso, inventário controlado e reposição automática. Máquina parada esperando ferramenta é o custo mais caro da fábrica.', '<b>Armário e carrossel em 3D</b>, por dentro e por fora, para mostrar ao cliente como funciona o controle.'],
  p4: ['4. Foco na automação', 'O robô carrega a máquina, a esteira alimenta a célula e a produção segue mesmo sem operador por perto. O ganho está em horas produtivas por turno.', '<b>Simulação da célula em 3D</b> e <b>realidade aumentada</b> para ver o layout no chão da fábrica antes de investir.'],
  p5: ['5. Processo de usinagem estável', `Ferramenta e estratégia certas, dados de corte ajustados e menos paradas. Num caso real da Sandvik, o custo de produção caiu <b>37%</b>.${SRC}`, '<b>Animação do processo de usinagem</b> e <b>AR da usinagem</b> para validar o caminho da ferramenta com o cliente.'],
  desafio: ['Traga o seu desafio', 'Já pensou em ver a sua usinagem em <b>realidade aumentada</b>? Ou em ter um <b>estudo de processo com animação 3D</b> para a sua peça? A gente transforma o seu problema em uma solução visual.', 'Fale conosco: <b>traga o seu desafio</b>.'],
};
const state = { ch: 0, t: 0, playing: true, auto: true, userCam: false };

/* ---------- Câmera ---------- */
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 300);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 4; controls.maxDistance = 80; controls.maxPolarAngle = Math.PI * 0.46;
controls.addEventListener('start', () => (state.userCam = true));
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
  const narrow = w <= 860, r = $('panel').getBoundingClientRect();
  const dx = narrow ? 0 : (r.width + 16) / 2, dy = narrow ? h / 2 - (110 + r.top) / 2 : 0;
  camera.aspect = w / h; camera.setViewOffset(w, h, dx, dy, w, h); camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
const narrowF = () => (innerWidth / innerHeight < 0.8 ? 1.9 : 1);
function shot(zone, t = 0) {
  let p, tg;
  if (!zone) { tg = narrowF() > 1 ? V(1.0, 0, -0.5) : V(0, 0, 0.5); p = tg.clone().add(V(21, 25, 29.5)); p.sub(tg).applyAxisAngle(V(0, 1, 0), Math.sin(t * 0.12) * 0.18).add(tg); }
  else { const z = ZONES[zone - 1]; tg = z.cam[1].clone(); p = tg.clone().add(z.cam[0].clone().sub(tg).multiplyScalar(1.5)); }
  return [tg.clone().add(p.sub(tg).multiplyScalar(narrowF() * (!zone && narrowF() > 1 ? 1.25 : 1))), tg];
}

/* ---------- Painel ---------- */
const chapEl = $('chapters');
chapEl.innerHTML = CHAPTERS.map((c, i) => `<li><button class="chap" type="button" data-ch="${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="nm">${c.name}</span><i class="bar"><b></b></i></button></li>`).join('');
function renderPanel() {
  const c = CHAPTERS[state.ch], [t, txt, sol] = TEXT[c.id];
  $('panel').innerHTML = `
    <p class="eyebrow">${c.zone ? `Passo ${c.zone} de 5` : c.id === 'desafio' ? 'Vamos conversar' : 'Cortar custos na fonte'}</p>
    <h2>${t}</h2>
    <p class="text">${txt}</p>
    ${c.zone ? `<div class="sol"><small>Como mostramos isso</small><p>${sol}</p></div>` : c.id === 'desafio' ? `<div class="sol cta"><p>${sol}</p></div>
      <div class="controls"><button class="btn primary" type="button" data-act="replay">Ver os 5 passos de novo</button></div>` : `<p class="hint">${sol}: toque nos números ou use a linha do tempo.</p>`}
    <p class="note">Fábrica, máquinas e peças são genéricas, criadas para demonstração. Não representam nenhum cliente.</p>`;
  chapEl.querySelectorAll('.chap').forEach((b, i) => b.classList.toggle('on', i === state.ch));
}
function goTo(i, auto) { state.ch = i; state.t = 0; state.auto = auto; state.userCam = false; renderPanel(); resize(); }

/* ---------- Laço ---------- */
const clock = new THREE.Clock();
let T = 0, lastDash = 0;
function frame(fixedDt) {
  const dt = fixedDt ?? Math.min(clock.getDelta(), 0.05);
  if (state.playing) state.t += dt;
  T += dt;
  const c = CHAPTERS[state.ch], t = state.t, active = c.zone;

  // destaque da zona ativa
  ZONES.forEach(z => {
    const on = z.n === active, pulse = 0.5 + 0.5 * Math.sin(T * 3);
    z.plate.material.opacity = lerp(z.plate.material.opacity, on ? 0.16 + 0.08 * pulse : 0, 0.15);
    z.edge.material.opacity = lerp(z.edge.material.opacity, on ? 0.9 : 0, 0.15);
    z.el.classList.toggle('on', on);
  });

  // animações da fábrica
  machines.forEach((m, i) => {
    const cyc = (T + m.ph) % 12, running = cyc < 9.5;
    m.lights.forEach((l, k) => (l.material = k === 2 ? (running ? M.green : M.off) : k === 1 ? (!running ? M.amber : M.off) : M.off));
    if (m.kind === 'lathe') m.part.rotation.x += dt * (running ? 25 : 0);
    else { m.spindle.rotation.y += dt * (running ? 30 : 0); m.spindle.position.x = running ? Math.sin(T * 0.9 + i) * 0.18 : 0; m.spindle.position.y = 1.5 + (running ? -0.05 : 0.1); }
  });
  carSpin.rotation.y = Math.floor(T / 3) * ((TAU / 15) * 4) + ease(seg(T % 3, 0, 1.2)) * ((TAU / 15) * 4);
  // AGV: vai e volta entre almoxarifado e máquinas
  const ac = (T % 16) / 16, au = ac < 0.45 ? ease(ac / 0.45) : ac < 0.55 ? 1 : 1 - ease((ac - 0.55) / 0.45);
  const ap = AGV_PATH.getPointAt(au * 0.999); agv.position.copy(ap); agv.rotation.y = ac < 0.5 ? 0 : Math.PI;
  agvLed.material = Math.floor(T * 3) % 2 ? M.green : M.off;
  // célula: esteira, robô pega e coloca na máquina
  const rc = (T % 6) / 6;
  convParts.forEach((p, i) => { p.position.z = ((-1 + i * 0.5 + rc * 0.5 + 1.25) % 2.5) - 1.25; p.visible = !(rc > 0.15 && rc < 0.9 && i === 4); });
  const pick = ease(seg(rc, 0.05, 0.2)), swing = ease(seg(rc, 0.25, 0.55)), place = ease(seg(rc, 0.55, 0.7)), back = ease(seg(rc, 0.75, 0.98));
  rBase.rotation.y = lerp(lerp(Math.PI * 0.5, -Math.PI * 0.35, swing), Math.PI * 0.5, back);
  rShoulder.rotation.x = 0.35 + 0.35 * (pick * (1 - swing) + place * (1 - back));
  rElbow.rotation.x = 1.3 - 0.4 * (pick * (1 - swing) + place * (1 - back));
  held.visible = rc > 0.18 && rc < 0.68;
  // medição: ponte e apalpador
  bridge.position.z = Math.sin(T * 0.6) * 0.35; probe.position.x = Math.sin(T * 0.9) * 0.55; probe.position.y = -0.08 * (0.5 + 0.5 * Math.sin(T * 2.4));
  // painel de dados com variação
  if (T - lastDash > 1.5) { lastDash = T; KPI.oee = 71 + Math.sin(T * 0.3) * 4 + (active === 2 ? ease(seg(t, 1, 7)) * 9 : 0); KPI.dt = Math.max(6, 18 - (active === 2 ? ease(seg(t, 1, 7)) * 10 : 0) + Math.sin(T) * 2); KPI.scrap = 3.4 + Math.cos(T * 0.4) * 0.4 - (active === 2 ? 1.2 * ease(seg(t, 1, 7)) : 0); dashTex.redraw(); }
  people.forEach(p => { p.head.position.x = Math.sin(T * 0.8 + p.ph) * 0.02; p.body.rotation.z = Math.sin(T * 0.6 + p.ph) * 0.02; });

  if (state.auto && t >= c.dur && c.dur) goTo(state.ch + 1, true);
  chapEl.querySelectorAll('.chap .bar b').forEach((b, i) => (b.style.width = i < state.ch ? '100%' : i === state.ch && c.dur ? `${clamp(t / c.dur) * 100}%` : '0%'));
  $('caption').textContent = c.name;

  if (!state.userCam) {
    const [p, tg] = shot(active, T), k = CAPTURE && t < 0.05 ? 1 : 1 - Math.exp(-dt * 1.8);
    camera.position.lerp(p, k); controls.target.lerp(tg, k);
  }
  controls.update();
  renderer.render(scene, camera);
  // marcadores
  const s = innerWidth <= 860;
  ZONES.forEach(z => {
    const v = z.anchor.clone().project(camera), x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    z.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    z.el.style.visibility = v.z < 1 ? 'visible' : 'hidden';
    z.el.classList.toggle('compact', s && z.n !== active);
  });
  if (!CAPTURE) requestAnimationFrame(() => frame());
}

/* ---------- Controles ---------- */
chapEl.addEventListener('click', e => { const b = e.target.closest('[data-ch]'); if (b) { goTo(+b.dataset.ch, false); state.playing = true; syncPlay(); } });
markersEl.addEventListener('click', e => { const b = e.target.closest('[data-zone]'); if (b) { goTo(CHAPTERS.findIndex(c => c.zone === +b.dataset.zone), false); state.playing = true; syncPlay(); } });
$('play').onclick = () => { state.playing = !state.playing; syncPlay(); };
function syncPlay() { $('play').innerHTML = state.playing ? '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>'; $('play').setAttribute('aria-label', state.playing ? 'Pausar' : 'Reproduzir'); }
$('panel').addEventListener('click', e => { if (e.target.closest('[data-act="replay"]')) { goTo(0, true); state.playing = true; syncPlay(); } });
addEventListener('keydown', e => { if (e.key === ' ' && e.target === document.body) { e.preventDefault(); $('play').click(); } });
new ResizeObserver(() => { document.documentElement.style.setProperty('--tb', $('timeline').offsetHeight + 'px'); resize(); }).observe($('timeline'));

const [p0, t0] = shot(0);
camera.position.copy(p0); controls.target.copy(t0);
goTo(0, true); syncPlay();
$('loading').hidden = true;
window.demo = { step: dt => frame(dt), goTo, state, CHAPTERS };
if (!CAPTURE) frame();
