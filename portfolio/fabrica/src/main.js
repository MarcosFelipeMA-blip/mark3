import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import EIXO from './eixo.js';

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
const ZONE_COLORS = { 1: 0x5cb8ff, 2: 0x5cb8ff, 3: 0x5cb8ff, 4: 0x5cb8ff, 5: 0x5cb8ff, 6: 0x6fd39a };
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
  x.fillStyle = '#5cb8ff'; x.font = '700 40px Barlow, Arial'; x.fillText('EIXO SAE 4140 · OP20 TORNO', 36, 62);
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
cnc(cellX + 0.6, -5.4, 'lathe');
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
const eixoGeo = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(EIXO.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(EIXO.nor, 3)); g.setIndex(EIXO.idx); return g; })();
for (const [x, z] of [[8.6, 3.2], [10, 3.2], [8.6, 4.8]]) {
  box(1.1, 0.14, 1.1, M.wood, x, 0.07, z, scene); box(1.0, 0.12, 1.0, M.clay2, x, 0.2, z, scene, 0.02);
  for (let i = 0; i < 10; i++) { const e = new THREE.Mesh(eixoGeo, M.part); e.scale.setScalar(0.001 * 2.2); e.position.set(x - 0.2, 0.29, z - 0.42 + i * 0.093); e.castShadow = true; scene.add(e); }
}


/* ---------- Janela de detalhe: o eixo SAE 4140 em escala real (mm) ---------- */
const dScene = new THREE.Scene(); dScene.environment = scene.environment;
{ const l = new THREE.DirectionalLight(0xffffff, 2.2); l.position.set(120, 260, 220); dScene.add(l); const r = new THREE.DirectionalLight(0x9fd4ff, 0.7); r.position.set(-200, 60, -150); dScene.add(r); dScene.add(new THREE.HemisphereLight(0xf2f5f8, 0x2a3440, 0.6)); }
const dCam = new THREE.PerspectiveCamera(26, 1.7, 5, 5000);
const DM = {
  raw: std(0x6c747c, 0.7, 0.55), mach: std(0xd2d8de, 0.92, 0.22), dark: std(0x23282e, 0.4, 0.45), insert: std(0x3a3f46, 0.8, 0.3),
  chuck: std(0x8e979f, 0.85, 0.32), jaw: std(0x5e666e, 0.8, 0.35), mill: std(0xc9d0d6, 0.95, 0.2), chip: std(0x8e7457, 0.85, 0.35),
  vise: std(0x2f6fa8, 0.4, 0.45), ruby: std(0xc0304a, 0.2, 0.2, { emissive: 0x501020, emissiveIntensity: 0.4 }), ok: std(0x1d5a33, 0, 0.4, { emissive: 0x2fe06a, emissiveIntensity: 1.2 }),
};
const holder = new THREE.Group(); dScene.add(holder);          // gira 180° para virar a peça
const inner = new THREE.Group(); inner.position.x = -90; holder.add(inner);
// perfil final de torneamento (do STEP: chanfros, degraus e canais de alívio)
function rFinal(x) {
  if (x < 1) return 9 + x; if (x < 40) return 10; if (x < 40.5) return 12 + (x - 40); if (x < 63) return 12.5; if (x < 65) return 12.2;
  if (x < 65.3) return 14.7 + (x - 65); if (x < 154.7) return 15; if (x < 155) return 15 - (x - 154.7); if (x < 157) return 12.2; if (x < 179) return 12.5; return 12.5 - (x - 179);
}
const BPS = [1, 40, 40.5, 63, 65, 65.3, 154.7, 155, 157, 179];
const XS = (() => { const a = []; for (let x = -2; x <= 182; x += 0.5) a.push(x); BPS.forEach(b => a.push(b - 0.001, b + 0.001)); [0, 180].forEach(b => a.push(b - 0.001, b + 0.001)); return [...new Set(a)].sort((p, q) => p - q); })();
const RSTOCK = 16;
const lathe = new THREE.Mesh(new THREE.BufferGeometry(), DM.mach); inner.add(lathe);
let latheKey = '';
function setLathe(fa, fb) {
  // fa: fração do lado A torneada (x de 0 até 110); fb: lado B (x de 180 até 110). Facear remove os 2 mm de sobremetal de cada ponta.
  const key = fa.toFixed(3) + ',' + fb.toFixed(3); if (key === latheKey) return; latheKey = key;
  const xa = fa > 0 ? 0 : -2, xb = fb > 0 ? 180 : 182, frontA = 110 * fa, frontB = 180 - 70 * fb;
  const pts = [new THREE.Vector2(0, xa)];
  for (const x of XS) { if (x < xa || x > xb) continue; const turned = (fa > 0 && x <= frontA) || (fb > 0 && x >= frontB); pts.push(new THREE.Vector2(turned && x >= 0 && x <= 180 ? rFinal(x) : RSTOCK, x)); }
  pts.push(new THREE.Vector2(0, xb));
  const g = new THREE.LatheGeometry(pts, 72); g.rotateZ(-Math.PI / 2); g.computeVertexNormals();
  lathe.geometry.dispose(); lathe.geometry = g;
}
// eixo final (malha real do STEP) e a "tampa" de material do rasgo de chaveta que a fresa remove
const finalG = new THREE.Group(); inner.add(finalG);
finalG.add(new THREE.Mesh(eixoGeo, DM.mach));
function keyCover(x0, x1) {
  const sh = new THREE.Shape(), a = Math.asin(0.3);
  sh.moveTo(-3, 6.5); sh.lineTo(3, 6.5); sh.lineTo(3, 10.03 * Math.cos(a)); sh.absarc(0, 0, 10.03, Math.PI / 2 - a, Math.PI / 2 + a, false); sh.lineTo(-3, 6.5);
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.01, x1 - x0), bevelEnabled: false, curveSegments: 8 });
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, x0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1)); return g;
}
const cover = new THREE.Mesh(keyCover(5, 35), DM.mach); finalG.add(cover); let coverKey = '';
// placa de 3 castanhas (fica à direita)
const chuck = new THREE.Group(); chuck.position.x = 70; dScene.add(chuck);
const chuckBody = new THREE.Mesh(new THREE.CylinderGeometry(48, 48, 38, 48).rotateZ(Math.PI / 2), DM.chuck); chuckBody.position.x = 39; chuck.add(chuckBody);
const jaws = new THREE.Group(); chuck.add(jaws);
const jawM = [0, 1, 2].map(i => { const j = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 12), DM.jaw); j.userData.a = (i / 3) * TAU; jaws.add(j); return j; });
function setJaws(open) { jawM.forEach(j => { const r = RSTOCK + 7 + open * 14; j.position.set(9, r * Math.cos(j.userData.a), r * Math.sin(j.userData.a)); j.rotation.x = -j.userData.a; }); }
// ferramenta de tornear (suporte + pastilha rômbica), ponta na origem do grupo
const tTool = new THREE.Group(); dScene.add(tTool);
{ const b = new THREE.Mesh(new THREE.BoxGeometry(20, 80, 20), DM.dark); b.position.set(14, 48, 0); tTool.add(b);
  const ins = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 4.8, 4), DM.insert); ins.scale.set(0.62, 1, 1); ins.rotation.set(Math.PI / 2, 0, Math.PI / 4); ins.position.set(5, 6, 0); tTool.add(ins); }
// fresa de topo Ø6 (eixo vertical, ponta na origem)
const mTool = new THREE.Group(); dScene.add(mTool);
{ const fl = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 14, 6, 8), DM.mill); const p = fl.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = y * 0.25, x = p.getX(i), z = p.getZ(i); p.setX(i, x * Math.cos(a) - z * Math.sin(a)); p.setZ(i, x * Math.sin(a) + z * Math.cos(a)); } fl.geometry.computeVertexNormals(); fl.position.y = 7; mTool.add(fl);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 40, 20), DM.mill); sh.position.y = 34; mTool.add(sh);
  const hd = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 30, 28), DM.dark); hd.position.y = 66; mTool.add(hd); }
// morsa para o fresamento
const vise = new THREE.Group(); dScene.add(vise);
[-1, 1].forEach(sz => { const j = new THREE.Mesh(new THREE.BoxGeometry(110, 18, 12), DM.vise); j.position.set(10, -6, sz * 21); vise.add(j); });
{ const b = new THREE.Mesh(new THREE.BoxGeometry(130, 12, 70), DM.vise); b.position.set(10, -21, 0); vise.add(b); }
// garra do robô (carga da barra)
const grip = new THREE.Group(); dScene.add(grip);
{ const b = new THREE.Mesh(new THREE.BoxGeometry(40, 22, 30), std(0xf0a24a, 0.2, 0.45)); b.position.y = 38; grip.add(b);
  [-1, 1].forEach(sz => { const f = new THREE.Mesh(new THREE.BoxGeometry(14, 30, 6), DM.dark); f.position.set(0, 18, sz * 19); grip.add(f); }); }
// apalpador da medição
const probeD = new THREE.Group(); dScene.add(probeD);
{ const st = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 30, 10), DM.mill); st.position.y = 17; probeD.add(st); const ball = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), DM.ruby); ball.position.y = 2.4; probeD.add(ball);
  const hd = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 26, 20), DM.dark); hd.position.y = 44; probeD.add(hd); }
// kit de ferramentas (logística)
const kit = new THREE.Group(); dScene.add(kit);
{ const tray = new THREE.Mesh(new RoundedBoxGeometry(200, 6, 70, 2, 2), std(0x1d2126, 0, 0.9)); tray.position.set(0, -3, -6); kit.add(tray);
  const t1 = tTool.clone(); t1.rotation.z = Math.PI / 2; t1.position.set(-55, 14, -12); kit.add(t1);
  const t2 = mTool.clone(); t2.rotation.z = Math.PI / 2; t2.position.set(75, 14, -6); kit.add(t2);
  for (let i = 0; i < 3; i++) { const ins = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 4.8, 4), DM.insert); ins.scale.set(0.62, 1, 1); ins.position.set(-10 + i * 18, 2.5, 18); kit.add(ins); } }
// cavacos
const chipGeoD = (() => { const c = new THREE.Curve(); c.getPoint = (t, o = V()) => o.set(2.2 * Math.cos(t * 10), t * 8, 2.2 * Math.sin(t * 10)); return new THREE.TubeGeometry(c, 30, 0.5, 5, false); })();
const chipsD = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(chipGeoD, DM.chip); m.visible = false; dScene.add(m); return m; });
// cotas
const detailEl = $('detail'), dimsEl = $('dims'), dcapEl = $('dcap'), dstepEl = $('dstep');
const DIMS = [['Ø20', 20, 10], ['Ø25', 52, 12.5], ['Ø30', 110, 15], ['Ø25', 168, 12.5], ['Rasgo 6 × 3,5', 20, -10], ['180 mm', 110, -15]].map(([t, x, r, top]) => {
  const e = document.createElement('span'); e.className = 'dim'; e.textContent = t; dimsEl.appendChild(e); return { e, x, r, top };
});
const dTmp = V();
function placeDims(on, okMark) {
  const rc = detailEl.getBoundingClientRect();
  DIMS.forEach(d => {
    d.e.classList.toggle('show', on); if (!on) return;
    inner.localToWorld(dTmp.set(d.x, d.top ? 0 : d.r, d.top ? d.r : 0)); if (!d.top) dTmp.y += d.r > 0 ? 9 : -9;
    dTmp.project(dCam);
    d.e.style.transform = `translate(${((dTmp.x * 0.5 + 0.5) * rc.width).toFixed(1)}px, ${((-dTmp.y * 0.5 + 0.5) * rc.height).toFixed(1)}px) translate(-50%, -100%)`;
    d.e.classList.toggle('ok', !!okMark);
  });
}
function chipsAt(p, on, t) {
  chipsD.forEach((m, i) => {
    m.visible = on; if (!on) return;
    const life = 0.9, u = ((t * 1.3 + i / chipsD.length) % 1) * life, a = i * 2.4;
    m.position.set(p.x + Math.cos(a) * 6 + u * 30 * Math.cos(a), p.y + 4 + 70 * u - 90 * u * u, p.z + 10 + u * 50);
    m.rotation.set(u * 9 + i, a, u * 5);
  });
}
let dSpin = 0;
function detailFrame(id, t, dt) {
  let cam = [V(20, 95, 255), V(0, 0, 0)], dims = false, ok = false, step = '';
  [lathe, finalG, chuck, tTool, mTool, vise, grip, probeD, kit].forEach(o => (o.visible = false));
  holder.rotation.set(0, 0, 0); holder.position.set(0, 0, 0); inner.rotation.set(0, 0, 0);
  const showFinal = (keyUp = true) => { finalG.visible = true; inner.rotation.x = keyUp ? -Math.PI / 2 : 0; if (coverKey !== 'none') { cover.visible = false; coverKey = 'none'; } };
  dSpin += dt;
  if (id === 'fabrica' || id === 'p2' || id === 'desafio') {
    showFinal(); holder.rotation.y = Math.sin(dSpin * 0.4) * 0.5; inner.rotation.x = -Math.PI / 2 + Math.sin(dSpin * 0.6) * 0.6;
    step = id === 'p2' ? 'OP20 · ciclo de 4 min (exemplo)' : 'SAE 4140 · Ø30 × 180 mm';
  } else if (id === 'p1') {
    showFinal(); dims = true; step = 'Cotas do desenho';
  } else if (id === 'p3') {
    lathe.visible = true; setLathe(0, 0); kit.visible = true; holder.position.set(0, 20, 40); cam = [V(20, 190, 300), V(0, 10, 10)];
    step = 'Barra Ø32 × 184 + kit da OP20/OP40';
  } else if (id === 'p4') {
    lathe.visible = true; setLathe(0, 0); chuck.visible = true; grip.visible = true;
    const k = ease(seg(t, 1.0, 5.0)), close = ease(seg(t, 5.2, 6.2)), back = ease(seg(t, 6.6, 8.6));
    holder.position.set(lerp(-260, 0, k), lerp(60, 0, ease(seg(t, 3.5, 5.0))), 0); setJaws(1 - close);
    grip.position.set(holder.position.x - 30, holder.position.y + RSTOCK - 2 + back * 80, 0);
    step = close < 1 ? 'Robô leva a barra até a placa' : 'Castanhas fecham · ciclo inicia';
  } else if (id === 'p5') {
    const A = seg(t, 0.6, 5.6), flip = ease(seg(t, 5.9, 7.3)), B = seg(t, 7.6, 11.6), toMill = t > 12.2;
    if (!toMill) {
      lathe.visible = true; chuck.visible = true; setJaws(flip > 0 && flip < 1 ? 1 : 0); setLathe(A, B);
      holder.rotation.y = flip * Math.PI; jaws.rotation.x += dt * (A > 0 && A < 1 || B > 0 && B < 1 ? 18 : 0);
      const cutting = (A > 0 && A < 1) || (B > 0 && B < 1);
      const lx = B > 0 ? 180 - 70 * B : 110 * A, tip = inner.localToWorld(V(lx, rFinal(clamp(lx, 0, 180)), 0));
      tTool.visible = flip === 0 || flip === 1; tTool.position.copy(tip); if (!cutting) tTool.position.y += 30;
      chipsAt(tip, cutting, t);
      step = t < 5.9 ? 'OP20 · torneamento do lado A' : t < 7.6 ? 'Virando a peça na placa' : 'OP30 · torneamento do lado B';
    } else {
      // OP40: rasgo de chaveta na morsa, fresa entra e avança de x = 8 a 32
      chipsAt(V(), false, t);
      finalG.visible = true; vise.visible = true; mTool.visible = true; holder.rotation.y = Math.PI; inner.rotation.x = -Math.PI / 2;
      const plunge = ease(seg(t, 12.6, 13.4)), feed = ease(seg(t, 13.5, 16.6)), lift = ease(seg(t, 16.8, 17.5));
      const cx = lerp(8, 32, feed), x0 = plunge < 1 ? 5 : cx + 3, key = x0.toFixed(2);
      if (coverKey !== key) { cover.geometry.dispose(); cover.geometry = keyCover(x0, 35); coverKey = key; }
      cover.visible = x0 < 34.9;
      const p = inner.localToWorld(V(cx, 0, 6.5 + (1 - plunge) * 8 + lift * 20));
      mTool.position.copy(p); mTool.rotation.y += dt * 30; vise.position.set(-10, 0, 0);
      chipsAt(p, plunge > 0.5 && lift === 0, t);
      cam = [V(p.x * 0.5 + 40, 150, 230), V(p.x * 0.5, 0, 0)];
      step = 'OP40 · fresando o rasgo de chaveta';
    }
  } else if (id === 'medicao') {
    showFinal(); dims = t > 1; ok = t > 5;
    const pts = [[20, 10], [52, 12.5], [110, 15], [168, 12.5]], k = Math.min(3, Math.floor(t / 1.2)), ph = (t / 1.2) % 1;
    probeD.visible = t < 5.2; const [px, pr] = pts[k]; inner.localToWorld(dTmp.set(px, 0, pr)); probeD.position.copy(dTmp); probeD.position.y += 2 + Math.abs(Math.sin(ph * Math.PI)) * 18;
    step = ok ? 'Aprovada ✓' : 'Medindo diâmetros…';
  }
  if (id !== 'p5') chipsAt(V(), false, t);
  dcapEl.textContent = DCAP[id] || ''; dstepEl.textContent = step; detailEl.classList.toggle('ok', ok);
  const k = CAPTURE ? 1 : 1 - Math.exp(-dt * 3);
  dCam.position.lerp(cam[0], k); dTarget.lerp(cam[1], k); dCam.lookAt(dTarget);
  return { dims, ok };
}
const dTarget = V(0, 0, 0); dCam.position.set(30, 120, 330);
function renderDetail(id, t, dt) {
  const info = detailFrame(id, t, dt), rc = detailEl.getBoundingClientRect();
  if (rc.width < 10 || getComputedStyle(detailEl).display === 'none') return;
  dCam.aspect = rc.width / rc.height; dCam.updateProjectionMatrix();
  const y = innerHeight - rc.bottom;
  renderer.setScissorTest(true); renderer.setViewport(rc.left, y, rc.width, rc.height); renderer.setScissor(rc.left, y, rc.width, rc.height);
  renderer.setClearColor(0x0f151c, 1); renderer.clear(); renderer.render(dScene, dCam);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight); renderer.setClearColor(0x000000, 0);
  placeDims(info.dims, info.ok);
}

/* ---------- Zonas e marcadores ---------- */
const ZONES = [
  { n: 1, name: 'Prioridades', c: V(-9.2, 0, -3.6), w: 5.2, d: 5.2, cam: [V(-2.5, 7.5, 6.5), V(-9.2, 0.9, -3.8)] },
  { n: 2, name: 'Dados', c: V(-9.2, 0, -5.6), w: 4.0, d: 1.6, cam: [V(-6.5, 3.6, 1.8), V(-9.2, 1.6, -6.4)] },
  { n: 3, name: 'Logística', c: V(-8.3, 0, 3.6), w: 5.8, d: 6.0, cam: [V(-1.5, 7.0, 11.5), V(-8.4, 0.8, 3.5)] },
  { n: 4, name: 'Automação', c: V(9.4, 0, -3.8), w: 5.0, d: 5.6, cam: [V(15.5, 7.0, 4.5), V(9.0, 0.9, -3.8)] },
  { n: 5, name: 'Usinagem', c: V(1.5, 0, -4.2), w: 9.6, d: 4.4, cam: [V(5.5, 6.5, 6.5), V(1.4, 1.0, -4.4)] },
  { n: 6, sym: '✓', name: 'Medição', c: V(4.2, 0, 4.7), w: 5.0, d: 3.2, cam: [V(9.5, 5.8, 12.5), V(4.0, 0.9, 4.6)] },
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
  b.innerHTML = `<b>${z.sym || z.n}</b><span>${z.name}</span>`; b.setAttribute('aria-label', z.sym ? z.name : `Passo ${z.n}: ${z.name}`);
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
  { id: 'p5', name: '5 · Usinagem', dur: 18, zone: 5 },
  { id: 'medicao', name: 'Medição', dur: 9, zone: 6 },
  { id: 'desafio', name: 'Seu desafio', dur: 0, zone: 0 },
];
const TEXT = {
  fabrica: ['Onde está o custo da sua fábrica?', `A ferramenta é cerca de <b>3% do custo</b> de uma peça. Baixar 1% no preço dela pouco muda o resultado. Melhorar o processo pode reduzir até <b>15% do custo total</b>. Acompanhe um <b>eixo de SAE 4140</b> passando por cada etapa.${SRC}`, 'Explore a fábrica'],
  p1: ['1. Defina as prioridades', 'Antes de trocar ferramenta, mapeie onde o custo nasce: projeto, planejamento, operações, logística, usinagem e verificação. A cadeia inteira importa, não só o preço da pastilha.', '<b>Estudo de processo em 3D:</b> cada operação simulada antes de produzir, para decidir com dados.'],
  p2: ['2. Linha de produção transparente', 'Dados da máquina em tempo real (OEE, paradas e refugo) mostram onde o tempo e o dinheiro se perdem. O que não se mede, não melhora.', '<b>Apresentações 3D interativas</b> para treinar a equipe e alinhar produção, compras e engenharia.'],
  p3: ['3. Logística de ferramentas', 'Ferramenta certa no ponto de uso, inventário controlado e reposição automática. Máquina parada esperando ferramenta é o custo mais caro da fábrica.', '<b>Armário e carrossel em 3D</b>, por dentro e por fora, para mostrar ao cliente como funciona o controle.'],
  p4: ['4. Foco na automação', 'O robô carrega a máquina, a esteira alimenta a célula e a produção segue mesmo sem operador por perto. O ganho está em horas produtivas por turno.', '<b>Simulação da célula em 3D</b> e <b>realidade aumentada</b> para ver o layout no chão da fábrica antes de investir.'],
  p5: ['5. Processo de usinagem estável', `Ferramenta e estratégia certas, dados de corte ajustados e menos paradas. Num caso real da Sandvik, o custo de produção caiu <b>37%</b>.${SRC}`, '<b>Animação do processo de usinagem</b> e <b>AR da usinagem</b> para validar o caminho da ferramenta com o cliente.'],
  medicao: ['Medição e liberação', 'A peça é conferida antes de seguir: diâmetros, comprimentos e o rasgo de chaveta. Medir no fim fecha o ciclo de dados e evita que um erro vire refugo em lote.', '<b>Relatório visual da peça</b>, com as cotas no próprio modelo 3D.'],
  desafio: ['Traga o seu desafio', 'Já pensou em ver a sua usinagem em <b>realidade aumentada</b>? Ou em ter um <b>estudo de processo com animação 3D</b> para a sua peça, como fizemos com este eixo? Mande o desenho ou o STEP e a gente transforma o seu problema em uma solução visual.', 'Fale conosco: <b>traga o seu desafio</b>.'],
};
const ROTEIRO = [['OP10', 'Serra', 'barra Ø32 × 184 mm'], ['OP20', 'Torno · lado A', 'facear, centrar, Ø20, Ø25 e canal'], ['OP30', 'Torno · lado B', 'virar, Ø30, Ø25 e canal'], ['OP40', 'Centro de usinagem', 'rasgo de chaveta 6 × 3,5'], ['OP50', 'Medição', 'cotas e liberação']];
const EIXO_TXT = {
  fabrica: 'Aço SAE 4140, Ø30 × 180 mm, com degraus Ø20 e Ø25, dois canais de alívio e rasgo de chaveta de 6 mm.',
  p1: `Roteiro definido antes do primeiro cavaco:<table class="rot">${ROTEIRO.map(r => `<tr><td>${r[0]}</td><td><b>${r[1]}</b><br>${r[2]}</td></tr>`).join('')}</table>`,
  p2: 'Cada operação do eixo gera dados. O painel da parede acompanha a OP20 no torno: OEE, paradas e refugo.',
  p3: 'Barra Ø32 × 184 mm já cortada e o kit no ponto de uso: pastilhas de desbaste e acabamento, bedame para os canais e fresa de topo Ø6.',
  p4: 'O robô pega a barra na esteira e coloca na placa do torno. O operador só abastece a esteira.',
  p5: '<b>OP20</b>: tornear Ø20, Ø25 e o canal. <b>OP30</b>: virar a peça e tornear Ø30 e Ø25. <b>OP40</b>: fresar o rasgo de chaveta 6 × 3,5 mm.',
  medicao: 'Ø20, Ø25, Ø30, comprimento de 180 mm e rasgo de chaveta conferidos. Peça aprovada e rastreada até a barra.',
};
const DCAP = { fabrica: 'A peça', p1: 'Desenho e cotas', p2: 'OP20 em produção', p3: 'Barra e kit de ferramentas', p4: 'Carga automática na placa', p5: 'Usinagem', medicao: 'Peça aprovada', desafio: 'A sua peça aqui' };
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
    <p class="eyebrow">${c.zone === 6 ? 'Fechando o ciclo' : c.zone ? `Passo ${c.zone} de 5` : c.id === 'desafio' ? 'Vamos conversar' : 'Cortar custos na fonte'}</p>
    <h2>${t}</h2>
    <p class="text">${txt}</p>
    ${EIXO_TXT[c.id] ? `<div class="eixo"><small>O eixo nesta etapa</small><div>${EIXO_TXT[c.id]}</div></div>` : ''}
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
  renderDetail(c.id, t, dt);
  // marcadores
  const s = innerWidth <= 860;
  ZONES.forEach(z => {
    const v = z.anchor.clone().project(camera), x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    z.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    const dr = detailEl.getBoundingClientRect(), overD = x > dr.left - 30 && x < dr.right + 30 && y > dr.top && y < dr.bottom + 40;
    z.el.style.visibility = v.z < 1 && !overD ? 'visible' : 'hidden';
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
