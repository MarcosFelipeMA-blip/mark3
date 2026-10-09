import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import INSERT from './insert.js';

/*
  Dispenser rotativo de 75 posições (5 níveis × 15 compartimentos), no formato da Linha A5-MAX do catálogo Spinwiser:
  660 × 730 × 730 mm, compartimento 75 × 105 × 250 mm. O mecanismo interno é uma interpretação ilustrativa.
  Unidades em mm. Piso em y = 0, eixo do carrossel em x = z = 0.
*/
const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const CAPTURE = location.hash === '#captura';
const polar = (r, a, y) => V(r * Math.sin(a), y, r * Math.cos(a));
const deg = r => ((((r * 180) / Math.PI) % 360) + 360) % 360;

/* ---------- Renderizador ---------- */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: CAPTURE });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(900, 2200, 1500); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -700, right: 700, top: 900, bottom: -300, near: 800, far: 4500 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 1;
scene.add(key);
scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x223040, 0.6));
const inner = new THREE.PointLight(0xe6f2ff, 0, 900, 1.2);
inner.position.set(0, 560, 0); scene.add(inner);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.45 }));
floor.receiveShadow = true; scene.add(floor);

/* ---------- Materiais ---------- */
const std = (color, metalness, roughness, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
const M = {
  shell: std(0xc8ced4, 0.75, 0.32, { side: THREE.DoubleSide, transparent: true, opacity: 1 }),
  band: std(0x1f242a, 0.4, 0.5, { side: THREE.DoubleSide, transparent: true, opacity: 1 }),
  cap: std(0x23282e, 0.45, 0.45, { transparent: true, opacity: 1 }),
  dark: std(0x22272d, 0.4, 0.5),
  door: std(0x15191d, 0.35, 0.42),
  rotor: std(0x2a2f35, 0.15, 0.62),
  steel: std(0xb8c0c8, 0.95, 0.25),
  gear: std(0x8e979f, 0.9, 0.3),
  brass: std(0xb08d57, 0.9, 0.3),
  motor: std(0x2c5f8a, 0.4, 0.45),
  pcb: std(0x1c5a3a, 0.2, 0.6),
  foam: std(0x1d2126, 0, 0.9),
  insert: std(0x3d4148, 0.85, 0.32),
  card: std(0xf2f5f8, 0.1, 0.5),
  tool: std(0xc5cbd1, 0.95, 0.22),
  carbide: std(0x55606b, 0.8, 0.35),
  ledRed: std(0x501010, 0, 0.4, { emissive: 0xff3030, emissiveIntensity: 1.4 }),
  ledGreen: std(0x103a18, 0, 0.4, { emissive: 0x2fe06a, emissiveIntensity: 1.6 }),
  ledOff: std(0x202428, 0, 0.5),
  highlight: std(0x5cb8ff, 0.2, 0.4, { emissive: 0x5cb8ff, emissiveIntensity: 0.6, transparent: true, opacity: 0, depthWrite: false }),
};
function box(w, h, d, mat, x, y, z, parent = scene, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
function cyl(r, h, mat, x, y, z, parent = scene, seg = 32) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.redraw = (...a) => { draw(c.getContext('2d'), w, h, ...a); t.needsUpdate = true; };
  t.redraw(); return t;
}
// engrenagem de dentes retos (perfil trapezoidal), deitada no plano XZ, espessura em Y
function gearGeo(z, m, th, hole = 0) {
  const rp = (m * z) / 2, ra = rp + m, rf = rp - 1.25 * m, s = new THREE.Shape();
  for (let i = 0; i < z; i++) {
    const a = (i / z) * TAU, p = TAU / z;
    const pts = [[rf, a - p * 0.5], [rf, a - p * 0.28], [ra, a - p * 0.13], [ra, a + p * 0.13], [rf, a + p * 0.28]];
    pts.forEach(([r, q], j) => (i === 0 && j === 0 ? s.moveTo(r * Math.cos(q), r * Math.sin(q)) : s.lineTo(r * Math.cos(q), r * Math.sin(q))));
  }
  s.closePath();
  if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
  return new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2);
}

/* ---------- Dimensões ---------- */
const R = 350, HT = 660;                       // carcaça
const LEVELS = 5, SECT = 15, STEP = TAU / SECT; // 75 posições
const LV_Y = [140, 232, 324, 416, 508];         // piso de cada nível
const COMP = { r0: 80, r1: 330, h: 75 };        // compartimento radial 250 mm
const ALPHA = -0.5;                             // azimute da coluna de portas
const TABLET_A = ALPHA + 0.62;
const TARGET = { level: 2, k: 11 }, START_K = 4;
const rotFor = k => ALPHA - k * STEP;           // rotação do carrossel que alinha o compartimento k com a porta

/* ---------- Base, eixo, rolamentos e acionamento ---------- */
const base = new THREE.Group(); scene.add(base);
cyl(R - 6, 30, M.dark, 0, 15, 0, base, 96);
for (let i = 0; i < 4; i++) { const p = polar(R - 60, i * TAU / 4 + 0.4, 0); cyl(22, 10, M.dark, p.x, -2, p.z, base, 20); }
cyl(70, 12, M.steel, 0, 36, 0, base, 48);                         // mancal inferior
const brg = new THREE.Mesh(new THREE.TorusGeometry(56, 7, 12, 48).rotateX(Math.PI / 2), M.steel); brg.position.y = 46; base.add(brg);

const rotor = new THREE.Group(); rotor.rotation.y = rotFor(START_K); scene.add(rotor);
cyl(22, 560, M.steel, 0, 330, 0, rotor, 24);                      // eixo central
const ring = new THREE.Mesh(gearGeo(56, 5, 14, 30), M.gear); ring.position.y = 88; ring.castShadow = true; rotor.add(ring); // coroa z = 56
// bandeira do sensor de referência (posição zero = compartimento 0)
const flag = box(10, 10, 26, M.brass, 0, 82, 108, rotor);

// motorredutor de rosca sem fim + pinhão z = 14 (relação 4:1 na coroa)
const PIN = polar(175, ALPHA + 1.4, 0);
const drive = new THREE.Group(); drive.position.set(PIN.x, 0, PIN.z); drive.rotation.y = ALPHA + 1.4; drive.position.y = 22; scene.add(drive);
const pinion = new THREE.Mesh(gearGeo(14, 5, 16, 6), M.gear); pinion.position.y = 65; pinion.castShadow = true; drive.add(pinion);
cyl(8, 40, M.steel, 0, 60, 0, drive, 16);
box(70, 46, 70, M.motor, 0, 34, 10, drive);                       // caixa de redução
const mot = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 90, 28).rotateZ(Math.PI / 2), M.motor);
mot.position.set(-75, 34, 10); mot.castShadow = true; drive.add(mot);
const enc = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 2, 24).rotateZ(Math.PI / 2), M.brass); // disco do encoder
enc.position.set(-126, 34, 10); drive.add(enc);
const encFork = box(10, 26, 16, M.dark, -126, 50, 10, drive);
const encLed = box(4, 4, 4, M.ledOff, -126, 64, 19, drive, false);
// sensor indutivo de referência, apontado para a bandeira
const HOME_A = -8 * STEP; // o compartimento 0 passa pelo sensor no meio do giro de C04 para C11
const homeS = cyl(7, 30, M.steel, 0, 0, 0, scene, 16);
{ const p = polar(108, ALPHA + HOME_A, 50); homeS.position.copy(p); homeS.position.y = 62; }
const homeLed = box(6, 4, 6, M.ledOff, homeS.position.x, 79, homeS.position.z, scene, false);

/* ---------- Carrossel: 5 níveis × 15 compartimentos ---------- */
const levelGeo = (() => {
  const parts = [];
  const disc = new THREE.Shape(); disc.absarc(0, 0, COMP.r1, 0, TAU, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, 24, 0, TAU, true); disc.holes.push(hole);
  for (let i = 0; i < 5; i++) { const w = new THREE.Path(); const a = (i / 5) * TAU, c = [48 * Math.cos(a), 48 * Math.sin(a)]; w.absarc(c[0], c[1], 13, 0, TAU, true); disc.holes.push(w); }
  parts.push(new THREE.ExtrudeGeometry(disc, { depth: 5, bevelEnabled: false, curveSegments: 24 }).rotateX(-Math.PI / 2));
  const hub = new THREE.CylinderGeometry(COMP.r0, COMP.r0, COMP.h, 30, 1, true); hub.translate(0, COMP.h / 2 + 5, 0); parts.push(hub);
  for (let i = 0; i < SECT; i++) {
    const a = (i + 0.5) * STEP, fin = new THREE.BoxGeometry(3, COMP.h, COMP.r1 - COMP.r0);
    fin.translate(0, COMP.h / 2 + 5, (COMP.r0 + COMP.r1) / 2); fin.rotateY(a); parts.push(fin);
  }
  // lábio externo baixo que segura os itens
  const lip = new THREE.CylinderGeometry(COMP.r1, COMP.r1, 10, 90, 1, true); lip.translate(0, 10, 0); parts.push(lip);
  return mergeGeometries(parts.map(g => g.toNonIndexed()));
})();
const rotMat = M.rotor.clone(); rotMat.side = THREE.DoubleSide;
LV_Y.forEach(y => { const l = new THREE.Mesh(levelGeo, rotMat); l.position.y = y; l.castShadow = true; l.receiveShadow = true; rotor.add(l); });
// disco de topo
cyl(COMP.r1, 5, M.rotor, 0, LV_Y[4] + COMP.h + 10, 0, rotor, 90);

/* ---------- Conteúdo dos compartimentos ---------- */
const CODES = { 'WNMG 06 04 08': '#2f8fe0', 'CNMG 12 04 08': '#e0902f', 'DNMG 15 06 08': '#3fae6a', 'VBMT 16 04 04': '#b05ad8', 'TNMG 16 04 08': '#d84a4a', 'SNMG 12 04 08': '#c9b23a' };
const BX = { w: 70, h: 23, d: 60 }; // caixa de 10 pastilhas: largura (tangencial) × altura × profundidade (radial)
const labelTex = (code, color) => canvasTex(280, 240, (x, w, h) => {
  x.fillStyle = '#eef1f4'; x.fillRect(0, 0, w, h); x.fillStyle = color; x.fillRect(0, 0, w, 54);
  x.fillStyle = '#fff'; x.font = '700 30px Barlow, Arial'; x.fillText('PASTILHAS', 16, 38);
  x.fillStyle = '#1b232c'; x.font = '700 38px Barlow, Arial'; x.fillText(code, 16, 112);
  x.fillStyle = '#5d6a76'; x.font = '500 22px "IBM Plex Mono", monospace'; x.fillText('10 unidades', 16, 150);
  for (let i = 0; i < 40; i++) { x.fillStyle = '#1b232c'; x.fillRect(16 + i * 6, 172, i % 3 ? 3 : 4, 50); }
});
const endTex = (code, color) => canvasTex(280, 92, (x, w, h) => {
  x.fillStyle = '#eef1f4'; x.fillRect(0, 0, w, h); x.fillStyle = color; x.fillRect(0, 0, 24, h);
  x.fillStyle = '#1b232c'; x.font = '700 34px Barlow, Arial'; x.fillText(code, 36, 58);
});
const boxGeo = new RoundedBoxGeometry(BX.w, BX.h, BX.d, 2, 1.5);
const boxMats = {};
for (const [code, color] of Object.entries(CODES)) {
  const side = std(0xeef1f4, 0, 0.6);
  boxMats[code] = [side, side, new THREE.MeshStandardMaterial({ map: labelTex(code, color), roughness: 0.55 }), side, new THREE.MeshStandardMaterial({ map: endTex(code, color), roughness: 0.55 }), side];
}
// fresas e brocas inteiriças deitadas no compartimento
const shankGeo = new THREE.CylinderGeometry(5, 5, 150, 20).rotateX(Math.PI / 2);
const fluteGeo = new THREE.CylinderGeometry(5, 5, 60, 6, 6).rotateX(Math.PI / 2);
{ const p = fluteGeo.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), a = z * 0.09, x = p.getX(i), y = p.getY(i); p.setXY(i, x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)); } fluteGeo.computeVertexNormals(); }
const compartments = []; // [level][k] → { group, items }
const secPos = (k, r) => polar(r, k * STEP, 0);
for (let lv = 0; lv < LEVELS; lv++) {
  compartments.push([]);
  for (let k = 0; k < SECT; k++) {
    const g = new THREE.Group(); g.position.y = LV_Y[lv] + 5; g.rotation.y = k * STEP; rotor.add(g);
    const kind = (lv * 7 + k * 5) % 9, codes = Object.keys(CODES), code = lv === TARGET.level && k === TARGET.k ? 'WNMG 06 04 08' : codes[(lv * 3 + k) % 6];
    const items = [];
    if (lv === TARGET.level && k === TARGET.k) { /* preenchido abaixo */ }
    else if (kind < 5) {
      const n = 2 + ((lv + k) % 5);
      for (let i = 0; i < n; i++) {
        const b = new THREE.Mesh(boxGeo, boxMats[code]); b.castShadow = true; b.receiveShadow = true;
        b.position.set(0, BX.h / 2 + Math.floor(i / 2) * (BX.h + 1), i % 2 ? 222 : 290); g.add(b); items.push(b);
      }
    } else if (kind < 8) {
      const n = 2 + (k % 3);
      for (let i = 0; i < n; i++) {
        const t = new THREE.Group(); t.position.set((i - (n - 1) / 2) * 14, 6, 248);
        const sh = new THREE.Mesh(shankGeo, M.tool); sh.position.z = -30; const fl = new THREE.Mesh(fluteGeo, kind === 7 ? M.carbide : M.tool); fl.position.z = 75;
        t.add(sh, fl); t.children.forEach(c => (c.castShadow = true)); g.add(t); items.push(t);
      }
    }
    compartments[lv].push({ g, items, code });
  }
}

/* ---------- Caixa detalhada com as pastilhas do arquivo STEP ---------- */
const insertGeo = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(INSERT.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(INSERT.nor, 3));
  g.setIndex(INSERT.idx); g.translate(-5.676, -4.7625, 2.38); g.rotateX(-Math.PI / 2);
  return g;
})();
function makeOpenBox() {
  const ob = new THREE.Group(), wallM = std(0xeef1f4, 0, 0.6), { w, h, d } = BX;
  box(w, 3, d, wallM, 0, 1.5, 0, ob); box(w, h - 3, 2.5, wallM, 0, h / 2, d / 2 - 1.25, ob); box(w, h - 3, 2.5, wallM, 0, h / 2, -d / 2 + 1.25, ob);
  box(2.5, h - 3, d, wallM, w / 2 - 1.25, h / 2, 0, ob); box(2.5, h - 3, d, wallM, -w / 2 + 1.25, h / 2, 0, ob);
  box(w - 6, 8, d - 6, M.foam, 0, 7, 0, ob, false);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(insertGeo, M.insert); m.castShadow = true;
    m.position.set(-25 + (i % 5) * 12.5, 11.4, i < 5 ? -12 : 12); m.rotation.y = (i % 2) * Math.PI / 3; ob.add(m);
  }
  const end = new THREE.Mesh(new THREE.PlaneGeometry(w - 4, h - 4), boxMats['WNMG 06 04 08'][4]); end.position.set(0, h / 2, d / 2 + 0.1); ob.add(end);
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, h, -d / 2); ob.add(lidPivot);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), [wallM, wallM, boxMats['WNMG 06 04 08'][2], wallM, wallM, wallM]);
  lid.position.set(0, 1, d / 2); lid.castShadow = true; lidPivot.add(lid);
  ob.userData.lid = lidPivot; return ob;
}
const TC = compartments[TARGET.level][TARGET.k];
const STOCK_SLOTS = [[0, 290], [0, 222], [1, 290], [1, 222], [2, 290], [2, 222]]; // [camada, raio] — a de fora/topo sai primeiro
const UI = { mode: 'idle', stock: 6, max: 6, min: 3, prog: 0, log: [] };
let pick = null; // caixa que sai
function fillTarget(n) {
  TC.items.forEach(o => o.parent && o.parent.remove(o)); TC.items = [];
  const order = [[0, 222], [0, 290], [1, 222], [1, 290], [2, 222], [2, 290]];
  for (let i = 0; i < n; i++) {
    const [ly, r] = order[i];
    const b = i === n - 1 ? makeOpenBox() : new THREE.Mesh(boxGeo, boxMats['WNMG 06 04 08']);
    if (b.isMesh) { b.castShadow = true; b.position.set(0, BX.h / 2 + ly * (BX.h + 1), r); }
    else b.position.set(0, ly * (BX.h + 1), r);
    TC.g.add(b); TC.items.push(b);
  }
  pick = TC.items[n - 1];
}
fillTarget(UI.stock);
// destaque do compartimento escolhido
const glow = new THREE.Mesh(new THREE.CylinderGeometry(COMP.r1 + 2, COMP.r1 + 2, COMP.h, 16, 1, true, -STEP / 2, STEP), M.highlight);
glow.position.y = COMP.h / 2; TC.g.add(glow);

/* ---------- Carcaça, coluna de portas e tampa ---------- */
const GAP = 0.27; // meia abertura da carcaça atrás da coluna (rad)
const shellG = new THREE.Group(); scene.add(shellG);
const shellGeo = (y0, y1) => { const g = new THREE.CylinderGeometry(R, R, y1 - y0, 120, 1, true, ALPHA + GAP, TAU - 2 * GAP); g.translate(0, (y0 + y1) / 2, 0); return g; };
const shell = new THREE.Mesh(shellGeo(150, 640), M.shell); shell.castShadow = true; shell.receiveShadow = true; shellG.add(shell);
const band = new THREE.Mesh(shellGeo(30, 150), M.band); band.castShadow = true; shellG.add(band);
const cap = new THREE.Mesh(new THREE.CylinderGeometry(R + 4, R + 4, 22, 120), M.cap); cap.position.y = HT - 11; cap.castShadow = true; shellG.add(cap);
// mancal superior e controlador sob a tampa
cyl(40, 20, M.steel, 0, 612, 0, scene, 32);
const ctrl = new THREE.Group(); scene.add(ctrl);
box(150, 10, 100, M.pcb, -120, 612, 120, ctrl); box(40, 14, 30, M.dark, -160, 624, 110, ctrl); box(30, 8, 20, M.steel, -90, 620, 140, ctrl);
const ctrlLed = box(6, 4, 6, M.ledGreen, -70, 620, 100, ctrl, false);

// coluna de acesso com 5 portas
const col = new THREE.Group(); col.rotation.y = ALPHA; scene.add(col);
const CW = 2 * (R + 30) * Math.sin(GAP);
// corpo da coluna em moldura: trilhos laterais + blocos entre os vãos das portas
const CWo = CW + 30, OW = 112, OH = 84, CZ0 = R - 19, CZ1 = R + 27, CZc = (CZ0 + CZ1) / 2, CD = CZ1 - CZ0;
const sideW = (CWo - OW) / 2;
box(sideW, HT - 4, CD, M.door, -(OW + sideW) / 2, (HT - 4) / 2, CZc, col);
box(sideW, HT - 4, CD, M.door, (OW + sideW) / 2, (HT - 4) / 2, CZc, col);
{
  const yo = LV_Y.map(y => y + 5 + COMP.h / 2), cuts = [0, ...yo.flatMap(y => [y - OH / 2, y + OH / 2]), HT - 4];
  for (let i = 0; i < cuts.length; i += 2) { const a = cuts[i], b = cuts[i + 1]; box(OW, b - a, CD, M.door, 0, (a + b) / 2, CZc, col); }
}
const tunM = M.dark.clone(); tunM.side = THREE.DoubleSide;
const doors = [], locks = [];
LV_Y.forEach((y, i) => {
  const yc = y + 5 + COMP.h / 2;
  // túnel até o carrossel
  // túnel aberto nas pontas, do carrossel (r 332) até a face da coluna
  const tz0 = COMP.r1 + 2, tz1 = CZ1, tl = tz1 - tz0, tc = (tz0 + tz1) / 2;
  box(OW, 2, tl, tunM, 0, yc + OH / 2, tc, col, false); box(OW, 2, tl, tunM, 0, yc - OH / 2, tc, col, false);
  box(2, OH, tl, tunM, -OW / 2, yc, tc, col, false); box(2, OH, tl, tunM, OW / 2, yc, tc, col, false);
  const piv = new THREE.Group(); piv.position.set(68, yc, CZ1 + 6); col.add(piv);
  box(136, 86, 12, M.door, -68, 0, 0, piv);
  box(6, 34, 8, M.steel, -124, 0, 8, piv);                          // puxador
  const led = box(16, 4, 3, M.ledRed, -110, 36, 7, piv, false);
  // trava solenoide (corpo + lingueta) dentro da coluna
  const body = box(26, 18, 26, M.dark, -(OW / 2 + 16), yc, CZ1 - 16, col);
  const bolt = box(10, 6, 6, M.steel, -(OW / 2 + 2), yc, CZ1 - 4, col);
  doors.push({ piv, led, yc }); locks.push({ body, bolt });
});
// iluminação do compartimento quando a porta abre
const doorLight = new THREE.PointLight(0xe6f2ff, 0, 500, 1.4);
doorLight.position.copy(polar(R - 60, ALPHA, LV_Y[TARGET.level] + 60)); scene.add(doorLight);
// tablet
const tab = new THREE.Group(); tab.position.copy(polar(R + 34, TABLET_A, 410)); tab.rotation.y = TABLET_A; scene.add(tab);
box(30, 60, 40, M.dark, 0, 0, -22, tab);
box(214, 290, 14, M.dark, 0, 0, 0, tab);
const screenTex = canvasTex(400, 540, drawScreen);
const screen = new THREE.Mesh(new THREE.PlaneGeometry(196, 264), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })); screen.position.z = 7.5; tab.add(screen);
// crachá
const cardTex = canvasTex(108, 172, (x, w, h) => {
  x.fillStyle = '#f2f5f8'; x.fillRect(0, 0, w, h); x.fillStyle = '#2f8fe0'; x.fillRect(0, 0, w, 40);
  x.fillStyle = '#c4ccd4'; x.fillRect(30, 56, 48, 56); x.fillStyle = '#26303a'; x.font = '600 13px Barlow, Arial'; x.fillText('OPERADOR', 20, 134); x.fillText('0347', 38, 152);
});
const card = new THREE.Mesh(new THREE.BoxGeometry(54, 86, 1.5), [M.card, M.card, M.card, M.card, new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.5 }), M.card]);
card.castShadow = true; scene.add(card);

function drawScreen(x, w, h) {
  const m = UI.mode;
  x.fillStyle = '#0c1218'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#16212c'; x.fillRect(0, 0, w, 58);
  x.fillStyle = '#5cb8ff'; x.font = '700 22px Barlow, Arial, sans-serif'; x.fillText('CARROSSEL 75 POSIÇÕES', 20, 37);
  const title = (t, y = 120) => { x.fillStyle = '#e8edf2'; x.font = '700 32px Barlow, Arial, sans-serif'; x.fillText(t, 20, y); };
  const line = (t, y, c = '#b9c4ce', f = '500 20px Barlow, Arial, sans-serif') => { x.fillStyle = c; x.font = f; x.fillText(t, 20, y); };
  if (m === 'idle') {
    title('Retirar ferramenta'); line('Aproxime o crachá', 156);
    x.strokeStyle = '#5cb8ff'; x.lineWidth = 5; x.strokeRect(120, 210, 160, 150);
    x.beginPath(); x.moveTo(200, 230); x.lineTo(200, 315); x.moveTo(165, 282); x.lineTo(200, 317); x.lineTo(235, 282); x.stroke();
    line('leitor ▼', 470, '#8b98a5', '500 18px "IBM Plex Mono", monospace');
  } else if (m === 'login') {
    title('Olá, operador 0347'); line('Centro de custo: Torno 05', 156); line('Acesso liberado', 192, '#7fdcaa');
  } else if (m === 'list') {
    title('Escolha o item', 104);
    [['WNMG 06 04 08', 'N3 · C11', UI.stock], ['CNMG 12 04 08', 'N1 · C04', 5], ['DNMG 15 06 08', 'N4 · C07', 4], ['Broca Ø10 MD', 'N2 · C02', 3]].forEach(([code, pos, q], i) => {
      const y = 130 + i * 78, sel = i === 0;
      x.fillStyle = sel ? '#163450' : '#141c25'; x.fillRect(14, y, w - 28, 66);
      if (sel) { x.strokeStyle = '#5cb8ff'; x.lineWidth = 3; x.strokeRect(14, y, w - 28, 66); }
      x.fillStyle = '#e8edf2'; x.font = '600 22px Barlow, Arial, sans-serif'; x.fillText(code, 28, y + 30);
      x.fillStyle = '#8b98a5'; x.font = '500 15px "IBM Plex Mono", monospace'; x.fillText(`${pos} · ${q} cx`, 28, y + 54);
    });
  } else if (m === 'locate') {
    title('Posicionando…'); line('Nível 3 · compartimento 11', 156);
    x.fillStyle = '#141c25'; x.fillRect(20, 200, w - 40, 22); x.fillStyle = '#5cb8ff'; x.fillRect(20, 200, (w - 40) * UI.prog, 22);
    x.strokeStyle = '#5cb8ff'; x.lineWidth = 4; x.beginPath(); x.arc(200, 360, 70, 0, TAU); x.stroke();
    const a = -Math.PI / 2 + UI.prog * TAU; x.beginPath(); x.moveTo(200, 360); x.lineTo(200 + 70 * Math.cos(a), 360 + 70 * Math.sin(a)); x.stroke();
  } else if (m === 'open') {
    title('Abra a porta 3'); line('WNMG 06 04 08 · retire 1 caixa', 156); line('Porta destravada', 192, '#7fdcaa');
    x.fillStyle = '#7fdcaa'; [0, 1, 2, 3, 4].forEach(i => { x.globalAlpha = i === 2 ? 1 : 0.18; x.fillRect(150, 250 + i * 50, 100, 38); }); x.globalAlpha = 1;
  } else if (m === 'done') {
    title('Retirada registrada'); line('Operador 0347 · Torno 05', 156); line(`Estoque N3·C11: ${UI.stock} de ${UI.max}`, 192);
    if (UI.stock <= UI.min) line('Pedido de reposição enviado', 228, '#ffc58a');
  } else if (m === 'service') {
    title('Modo reposição'); line('Técnico do distribuidor', 156); line('Rota: N3·C11', 192, '#7fdcaa');
  } else if (m === 'restocked') {
    title('Reposição registrada'); line(`N3·C11: ${UI.stock} de ${UI.max} cx`, 156, '#7fdcaa'); line('Pedido PC-1042 concluído', 192);
  }
}

/* ---------- Capítulos ---------- */
const CHAPTERS = [
  { id: 'maquina', name: 'O equipamento', dur: 8 },
  { id: 'interno', name: 'Por dentro', dur: 9 },
  { id: 'pedido', name: 'Pedido', dur: 6 },
  { id: 'giro', name: 'Giro e indexação', dur: 9 },
  { id: 'liberacao', name: 'Liberação', dur: 9 },
  { id: 'fechamento', name: 'Fechamento', dur: 7 },
  { id: 'reposicao', name: 'Reposição', dur: 10 },
  { id: 'explorar', name: 'Explorar', dur: 0 },
];
const TEXT = {
  maquina: ['O equipamento', 'Um dispenser cilíndrico de <b>660 mm de altura e 730 mm de diâmetro</b> fica ao lado das máquinas. Por fora há só uma coluna com <b>5 portas</b>, uma por nível, e a tela para o operador se identificar.'],
  interno: ['Por dentro', 'Dentro gira um <b>carrossel de 5 níveis com 15 compartimentos</b> cada: 75 posições de 75 × 105 × 250 mm. Embaixo, um <b>motorredutor com pinhão</b> gira a coroa presa ao eixo central.'],
  pedido: ['Pedido', 'O operador aproxima o crachá e escolhe a pastilha <b>WNMG 06 04 08</b>. O sistema já sabe onde ela está: <b>nível 3, compartimento 11</b>.'],
  giro: ['Giro e indexação', 'O motor gira o carrossel pelo <b>caminho mais curto</b> (7 compartimentos, 168°). O encoder conta os pulsos e o <b>sensor indutivo de referência</b> confere a posição zero a cada volta.'],
  liberacao: ['Liberação', 'Com o compartimento alinhado, <b>só a trava da porta 3 recua</b>. As outras quatro continuam travadas e cada porta só alcança um compartimento, então o operador pega apenas o que pediu.'],
  fechamento: ['Fechamento e registro', 'Ao fechar a porta, o sensor confirma, a trava volta e o motor é liberado. A retirada vai para o centro de custo do Torno 05 e, no mínimo de estoque, sai o <b>pedido de reposição</b>.'],
  reposicao: ['Reposição', 'O técnico entra com credencial própria. O carrossel leva cada compartimento da rota até a porta, que destrava para ele completar. O estoque fica certo sem contagem manual.'],
  explorar: ['Explore o equipamento', 'Gire, aproxime e alterne entre a visão externa e a interna para ver o carrossel, a coroa, o motorredutor, as travas e o sensor de referência.'],
};
const state = { ch: 0, t: 0, playing: true, auto: true, userCam: false, interiorView: false };

/* ---------- Câmera ---------- */
const camera = new THREE.PerspectiveCamera(32, 1, 10, 20000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 250; controls.maxDistance = 6000; controls.maxPolarAngle = Math.PI * 0.49;
controls.addEventListener('start', () => (state.userCam = true));
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  const narrow = w <= 860, r = $('panel').getBoundingClientRect();
  const dx = narrow ? 0 : (r.width + 16) / 2, dy = narrow ? h / 2 - (110 + r.top) / 2 : 0;
  camera.aspect = w / h; camera.setViewOffset(w, h, dx, dy, w, h); camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
const narrowF = () => (innerWidth / innerHeight < 0.8 ? 1.75 : 1);
const SHOTS = {
  geral: () => [polar(2350, ALPHA + 0.35, 1150), V(0, 330, 0)],
  comando: () => [polar(1150, TABLET_A + 0.25, 640), polar(R, TABLET_A - 0.15, 380)],
  dentro: () => [polar(1800, ALPHA + 1.5, 1450), V(0, 300, 0)],
  base: () => [polar(780, ALPHA + 1.15, 190), polar(140, ALPHA + 1.35, 85)],
  porta: () => [polar(2000, ALPHA - 0.22, 820), polar(R, ALPHA + 0.05, 330)],
  gaveta: () => [polar(1250, ALPHA - 0.38, 700), polar(R + 150, ALPHA, 420)],
};
function shot(name, t = 0) {
  const [p, tg] = SHOTS[name](), f = narrowF();
  const pos = tg.clone().add(p.clone().sub(tg).multiplyScalar(f));
  if (name === 'geral' || name === 'dentro') pos.sub(tg).applyAxisAngle(V(0, 1, 0), Math.sin(t * 0.18) * 0.22).add(tg);
  return [pos, tg];
}

/* ---------- Rótulos ---------- */
const labelsEl = $('labels'), leadersEl = $('leaders');
const mkLabel = (t, p, dx, dy, set) => {
  const el = document.createElement('div'); el.className = 'lbl'; el.textContent = t; labelsEl.appendChild(el);
  const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); leadersEl.appendChild(ln);
  return { el, ln, p, dx, dy, set };
};
const LABELS3D = [
  mkLabel('Tela touch e leitor de crachá', polar(R + 40, TABLET_A, 470), 130, -50, 'ext'),
  mkLabel('Coluna de acesso · 5 portas', polar(R + 34, ALPHA, 540), -150, -40, 'ext'),
  mkLabel('Carcaça Ø730 × 660 mm', polar(R, ALPHA + 1.5, 260), 120, 40, 'ext'),
  mkLabel('Carrossel 5 × 15 = 75 posições', polar(250, ALPHA + 1.6, 420), 140, -60, 'int'),
  mkLabel('Eixo central e mancais', V(0, 600, 0), -120, -50, 'int'),
  mkLabel('Coroa z56', polar(140, ALPHA + 1.9, 95), 120, 50, 'int'),
  mkLabel('Motorredutor + pinhão z14', polar(175, ALPHA + 1.4, 60), -140, 70, 'int'),
  mkLabel('Travas solenoides', polar(R + 20, ALPHA - 0.2, 220), -150, 30, 'int'),
  mkLabel('Controlador Wi-Fi', polar(160, -0.79, 620), 120, -40, 'int'),
];
function updateLabels(set) {
  const s = innerWidth <= 860 ? 0.5 : 1;
  for (const L of LABELS3D) {
    const on = L.set === set;
    const v = L.p.clone().project(camera), x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    const lx = x + L.dx * s, ly = y + L.dy * s, bw = L.el.offsetWidth, bh = L.el.offsetHeight;
    L.el.style.transform = `translate(${(L.dx < 0 ? lx - bw : lx).toFixed(1)}px, ${(ly - bh / 2).toFixed(1)}px)`;
    L.el.classList.toggle('show', on);
    L.ln.setAttribute('x1', x); L.ln.setAttribute('y1', y); L.ln.setAttribute('x2', lx); L.ln.setAttribute('y2', ly);
    L.ln.style.opacity = on ? 1 : 0;
  }
}

/* ---------- Painel lateral, linha do tempo e painel do controlador ---------- */
const chapEl = $('chapters');
chapEl.innerHTML = CHAPTERS.map((c, i) => `<li><button class="chap" type="button" data-ch="${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="nm">${c.name}</span><i class="bar"><b></b></i></button></li>`).join('');
function renderPanel() {
  const c = CHAPTERS[state.ch], [t, txt] = TEXT[c.id];
  $('panel').innerHTML = `
    <p class="eyebrow">Etapa ${String(state.ch + 1).padStart(2, '0')} de ${CHAPTERS.length}</p>
    <h2>${t}</h2>
    <p class="text">${txt}</p>
    ${c.id === 'explorar' ? `<div class="controls">
      <button class="btn" type="button" data-act="ext" aria-pressed="${!state.interiorView}">Visão externa</button>
      <button class="btn" type="button" data-act="int" aria-pressed="${state.interiorView}">Visão interna</button>
      <button class="btn primary" type="button" data-act="replay">Ver o ciclo de novo</button></div>` : ''}
    <dl class="facts">
      <dt>Formato</dt><dd>660 × 730 × 730 mm</dd>
      <dt>Posições</dt><dd>5 níveis × 15 = 75</dd>
      <dt>Compartimento</dt><dd>75 × 105 × 250 mm</dd>
      <dt>Item</dt><dd>WNMG 06 04 08 · N3·C11</dd>
      <dt>Estoque</dt><dd id="stockVal">${UI.stock} de ${UI.max} cx</dd>
    </dl>
    <p class="note">Dimensões do catálogo público da Linha A5-MAX (Spinwiser). O mecanismo interno é uma interpretação ilustrativa, sem vínculo com o fabricante.</p>`;
  chapEl.querySelectorAll('.chap').forEach((b, i) => b.classList.toggle('on', i === state.ch));
}
$('data').innerHTML = `
  <p class="eyebrow">Controlador · em tempo real</p>
  <div class="rows">
    <span>Alvo</span><b id="dTarget">N3 · C11</b>
    <span>Na porta</span><b id="dAt">C04</b>
    <span>Ângulo</span><b id="dAng">0°</b>
    <span>Encoder</span><b id="dEnc">0 pulsos</b>
    <span>Ref. zero</span><b id="dHome">—</b>
    <span>Motor</span><b id="dMotor">parado</b>
    <span>Trava porta 3</span><b id="dLock">travada</b>
    <span>Porta 3</span><b id="dDoor">fechada</b>
  </div>
  <div class="stock"><span>N3·C11 · WNMG 06 04 08</span><b id="dStock">6/6</b></div>
  <div class="meter"><i id="dMeter"></i><em style="left:${(UI.min / UI.max) * 100}%"></em></div>
  <table id="dLog"></table>`;
const dSet = (id, v, cls = '') => { const e = $(id); if (e.textContent !== v) e.textContent = v; e.className = cls; };
function renderLog() {
  $('dLog').innerHTML = UI.log.slice(-4).map(r => `<tr class="${r.cls || ''}"><td>${r.t}</td><td>${r.who}</td><td>${r.what}</td></tr>`).join('');
  const pct = (UI.stock / UI.max) * 100; $('dMeter').style.width = pct + '%'; $('dMeter').className = UI.stock <= UI.min ? 'low' : '';
  $('dStock').textContent = `${UI.stock}/${UI.max}`;
  const s = $('stockVal'); if (s) s.textContent = `${UI.stock} de ${UI.max} cx`;
}

function goTo(i, auto) {
  state.ch = i; state.t = 0; state.auto = auto; state.userCam = false;
  resetScene(i);
  renderPanel(); renderLog(); resize();
}
// estado da cena no início de cada etapa
const ENC_PER_REV = 4 * 500; // 500 pulsos por volta do pinhão × 4 (relação) por volta do carrossel
let rotorAngle = rotFor(START_K), encCount = 0;
function resetScene(i) {
  const id = CHAPTERS[i].id, after = k => i > CHAPTERS.findIndex(c => c.id === k);
  UI.stock = after('fechamento') && !after('reposicao') ? 5 : 6;
  if (id === 'fechamento') UI.stock = 6;
  if (id === 'reposicao') UI.stock = 5;
  UI.log = [{ t: '20:41', who: 'Op. 0212', what: 'CNMG 12 04 08 · 1 cx' }, { t: '20:58', who: 'Op. 0198', what: 'Broca Ø10 · 1 un' }];
  if (after('fechamento')) UI.log.push({ t: '21:14', who: 'Op. 0347 · Torno 05', what: 'WNMG 06 04 08 · 1 cx', cls: 'new' });
  if (after('reposicao')) UI.log.push({ t: '08:05', who: 'Distribuidor', what: 'Reposição N3·C11 · +1 cx', cls: 'ok' });
  fillTarget(id === 'fechamento' ? 5 : UI.stock);
  rotorAngle = ['giro', 'maquina', 'interno', 'pedido'].includes(id) ? rotFor(START_K) : rotFor(TARGET.k);
  encCount = Math.round(((rotorAngle - rotFor(START_K)) / TAU) * ENC_PER_REV);
  UI.mode = { maquina: 'idle', interno: 'idle', pedido: 'idle', giro: 'locate', liberacao: 'open', fechamento: 'open', reposicao: 'done', explorar: 'restocked' }[id];
  screenTex.redraw();
}
const setLed = (m, on) => (m.material = on ? M.ledGreen : M.ledRed);
let fadeK = 0;
function setInterior(k) {
  fadeK = k;
  const o = 1 - 0.88 * k;
  for (const m of [M.shell, M.band, M.cap]) { m.opacity = o; m.depthWrite = o > 0.99; }
  shell.castShadow = band.castShadow = cap.castShadow = k < 0.5;
  inner.intensity = 1.4 * k;
}
function setMode(m) { if (UI.mode !== m) { UI.mode = m; screenTex.redraw(); } }

/* ---------- Laço ---------- */
const clock = new THREE.Clock();
let lastProg = -1;
function frame(fixedDt) {
  const dt = fixedDt ?? Math.min(clock.getDelta(), 0.05);
  if (state.playing) state.t += dt;
  const c = CHAPTERS[state.ch], t = state.t, id = c.id;
  let cam = shot('geral', t), interior = 0, labels = '', motor = 'parado', lockOpen = false, doorOpen = 0, homeOn = false;
  card.visible = false; M.highlight.opacity = 0;
  doors.forEach(d => setLed(d.led, false));
  if (pick) { pick.userData.lid.rotation.x = 0; }
  $('data').hidden = !['giro', 'liberacao', 'fechamento', 'reposicao', 'explorar'].includes(id) || (id === 'explorar' && !state.interiorView);
  const prevAngle = rotorAngle;

  if (id === 'maquina') {
    labels = t > 1.2 ? 'ext' : ''; setMode('idle');
  } else if (id === 'interno') {
    interior = ease(seg(t, 0.5, 2)); cam = shot('dentro', t); labels = t > 2 ? 'int' : '';
    rotorAngle = rotFor(START_K) + Math.sin(seg(t, 2.5, 8.5) * Math.PI) * 0.5; // mostra o giro livre
    if (t > 5.5) cam = shot('base');
  } else if (id === 'pedido') {
    cam = shot('comando'); card.visible = true;
    const k = ease(seg(t, 0.4, 1.8)), back = ease(seg(t, 2.6, 3.4));
    const p = polar(R + 120 - 70 * k, TABLET_A - 0.02, lerp(180, 255, k)); p.add(polar(back * 200, TABLET_A, 0));
    card.position.copy(p); card.rotation.set(-0.2, TABLET_A, 0);
    setMode(t < 2 ? 'idle' : t < 3.2 ? 'login' : 'list');
    if (t > 4) { M.highlight.opacity = 0.2 + 0.15 * Math.sin(t * 6); cam = shot('dentro', 0); interior = ease(seg(t, 4, 5)); }
  } else if (id === 'giro') {
    interior = 1; cam = t < 5.5 ? shot('dentro', 0) : shot('base');
    M.highlight.opacity = 0.25;
    const k = ease(seg(t, 0.8, 6.8));
    rotorAngle = lerp(rotFor(START_K), rotFor(TARGET.k), k);
    motor = k > 0 && k < 1 ? 'girando' : k >= 1 ? 'parado · em posição' : 'parado';
    UI.prog = k; if (Math.abs(UI.prog - lastProg) > 0.04 || (k >= 1 && lastProg < 1)) { lastProg = UI.prog; screenTex.redraw(); }
    setMode(k >= 1 && t > 7.4 ? 'open' : 'locate');
    labels = t > 5.5 ? 'int' : '';
  } else if (id === 'liberacao') {
    cam = shot('porta'); setMode('open'); M.highlight.opacity = 0.18;
    lockOpen = t > 0.8; doorOpen = ease(seg(t, 1.6, 2.8));
    if (pick) {
      const out = ease(seg(t, 3, 4.6)), lift = ease(seg(t, 4.6, 5.6)), open = ease(seg(t, 5.8, 7));
      // a caixa sai em linha reta, no sentido radial, pela porta
      pick.position.set(0, lerp(2 * (BX.h + 1), 2 * (BX.h + 1) + 70, lift), lerp(290, R + 150, out));
      pick.rotation.set(lift * 0.5, 0, 0);
      pick.userData.lid.rotation.x = -open * 1.9;
      if (t > 4.6) cam = shot('gaveta');
    }
  } else if (id === 'fechamento') {
    cam = shot('porta'); setMode(t < 2.4 ? 'open' : 'done');
    if (pick) pick.visible = false;
    doorOpen = 1 - ease(seg(t, 0.4, 1.6)); lockOpen = t < 2;
    if (t > 2.6 && UI.log.length < 3) { UI.stock = 5; UI.log.push({ t: '21:14', who: 'Op. 0347 · Torno 05', what: 'WNMG 06 04 08 · 1 cx', cls: 'new' }); renderLog(); screenTex.redraw(); }
    if (t > 4.2 && UI.log.length < 4 && UI.stock <= 5) { UI.log.push({ t: '21:14', who: 'Sistema', what: 'Pedido PC-1042 ao distribuidor', cls: 'alert' }); renderLog(); }
    if (t > 3.5) cam = shot('geral', 0);
  } else if (id === 'reposicao') {
    cam = shot('porta'); setMode(t < 8.5 ? 'service' : 'restocked');
    const k = ease(seg(t, 0.5, 2.5));
    rotorAngle = lerp(rotFor(TARGET.k - 3), rotFor(TARGET.k), k);
    motor = k > 0 && k < 1 ? 'girando' : 'parado';
    lockOpen = t > 2.8 && t < 8; doorOpen = ease(seg(t, 3, 4)) * (1 - ease(seg(t, 6.8, 7.8)));
    interior = 0.85;
    if (t < 4.5) { if (TC.items.length !== 5) fillTarget(5); }
    else if (TC.items.length < 6) { fillTarget(6); }
    if (TC.items.length === 6) {
      const nb = TC.items[5], p = ease(seg(t, 4.5, 6.2));
      nb.position.z = lerp(R + 160, 290, p); nb.position.y = 2 * (BX.h + 1) + (1 - p) * 30;
    }
    if (t > 6.4 && UI.stock < 6) { UI.stock = 6; UI.log.push({ t: '08:05', who: 'Distribuidor', what: 'Reposição N3·C11 · +1 cx', cls: 'ok' }); renderLog(); }
  } else {
    interior = state.interiorView ? 1 : 0; labels = state.interiorView ? 'int' : 'ext'; setMode('restocked');
  }
  if (pick && id !== 'fechamento') pick.visible = true;

  // carrossel, pinhão, encoder e sensor de referência
  rotor.rotation.y = rotorAngle;
  const dA = rotorAngle - prevAngle;
  encCount += (dA / TAU) * ENC_PER_REV;
  pinion.rotation.y = -(rotorAngle - rotFor(START_K)) * 4 + Math.PI / 14;
  enc.rotation.x += Math.abs(dA) * 4 * 30;
  const flagRel = ((rotorAngle - ALPHA - HOME_A) % TAU + TAU) % TAU;
  homeOn = flagRel < 0.06 || flagRel > TAU - 0.06;
  homeLed.material = homeOn ? M.ledGreen : M.ledOff;
  encLed.material = Math.abs(dA) > 1e-5 && Math.floor(t * 20) % 2 ? M.ledGreen : M.ledOff;
  if (lockOpen && doorOpen > 0) motor = 'bloqueado';
  // portas e travas
  doors.forEach((d, i) => { const me = i === TARGET.level; d.piv.rotation.y = me ? doorOpen * 1.7 : 0; setLed(d.led, me && lockOpen); });
  doorLight.intensity = 2.5 * doorOpen;
  locks.forEach((l, i) => { l.bolt.position.x = i === TARGET.level && lockOpen ? -(OW / 2 + 14) : -(OW / 2 + 2); });

  setInterior(lerp(fadeK, interior, CAPTURE ? 1 : 1 - Math.exp(-dt * 6)));
  if (!$('data').hidden) {
    const atK = ((Math.round((ALPHA - rotorAngle) / STEP) % SECT) + SECT) % SECT;
    dSet('dAt', 'C' + String(atK).padStart(2, '0'), atK === TARGET.k ? 'ok' : '');
    dSet('dAng', deg(rotorAngle - rotFor(0)).toFixed(1) + '°');
    dSet('dEnc', Math.round(((((ALPHA - rotorAngle) / TAU) % 1) + 1) % 1 * ENC_PER_REV) + ' / ' + ENC_PER_REV);
    dSet('dHome', homeOn ? 'detectado' : '—', homeOn ? 'ok' : '');
    dSet('dMotor', motor, motor.startsWith('girando') ? 'run' : motor.startsWith('bloq') ? 'warn' : '');
    dSet('dLock', lockOpen ? 'liberada' : 'travada', lockOpen ? 'ok' : '');
    dSet('dDoor', doorOpen > 0.02 ? 'aberta' : 'fechada', doorOpen > 0.02 ? 'warn' : '');
  }

  if (state.auto && t >= c.dur && c.dur) goTo(state.ch + 1, true);
  chapEl.querySelectorAll('.chap .bar b').forEach((b, i) => (b.style.width = i < state.ch ? '100%' : i === state.ch && c.dur ? `${clamp(t / c.dur) * 100}%` : '0%'));
  $('caption').textContent = c.name;

  if (!state.userCam && id !== 'explorar') {
    const k = CAPTURE && t < 0.05 ? 1 : 1 - Math.exp(-dt * 2.2);
    camera.position.lerp(cam[0], k); controls.target.lerp(cam[1], k);
  }
  controls.update();
  renderer.render(scene, camera);
  updateLabels(labels);
  if (!CAPTURE) requestAnimationFrame(() => frame());
}

/* ---------- Controles ---------- */
chapEl.addEventListener('click', e => { const b = e.target.closest('[data-ch]'); if (b) { goTo(+b.dataset.ch, false); state.playing = true; syncPlay(); } });
$('play').onclick = () => { state.playing = !state.playing; syncPlay(); };
function syncPlay() { $('play').innerHTML = state.playing ? '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>'; $('play').setAttribute('aria-label', state.playing ? 'Pausar' : 'Reproduzir'); }
$('panel').addEventListener('click', e => {
  const a = e.target.closest('[data-act]')?.dataset.act; if (!a) return;
  if (a === 'ext' || a === 'int') { state.interiorView = a === 'int'; renderPanel(); }
  if (a === 'replay') { goTo(0, true); state.playing = true; syncPlay(); }
});
addEventListener('keydown', e => { if (e.key === ' ' && e.target === document.body) { e.preventDefault(); $('play').click(); } });
new ResizeObserver(() => { document.documentElement.style.setProperty('--tb', $('timeline').offsetHeight + 'px'); resize(); }).observe($('timeline'));

const [p0, t0] = shot('geral');
camera.position.copy(p0); controls.target.copy(t0);
goTo(0, true); syncPlay();
$('loading').hidden = true;
window.demo = { step: dt => frame(dt), goTo, state, CHAPTERS };
if (!CAPTURE) frame();
