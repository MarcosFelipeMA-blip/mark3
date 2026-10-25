import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import INSERT from './insert.js';

/*
  Máquina de vending de ferramentas (genérica) — ciclo completo de retirada e reposição de pastilhas.
  Unidades em mm. Piso em y = 0, frente da máquina em z = +375.
*/
const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CAPTURE = location.hash === '#captura';

/* ---------- Renderizador ---------- */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: CAPTURE });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
const key = new THREE.DirectionalLight(0xffffff, 1.7);
key.position.set(1600, 3200, 2400); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -1400, right: 1400, top: 2200, bottom: -400, near: 500, far: 7000 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 1.5;
scene.add(key);
scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x223040, 0.55));
const inner = new THREE.PointLight(0xe6f2ff, 0, 1600, 1.2); // iluminação interna (LED)
inner.position.set(-150, 1650, 200); scene.add(inner);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.45 }));
floor.receiveShadow = true; scene.add(floor);

/* ---------- Materiais ---------- */
const std = (color, metalness, roughness, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
const M = {
  body: std(0xc9cfd5, 0.35, 0.45),
  dark: std(0x262c33, 0.4, 0.5),
  frame: std(0x3a424b, 0.6, 0.35),
  tray: std(0x9aa3ab, 0.8, 0.35),
  coil: std(0xdfe4e8, 1, 0.22),
  motor: std(0x1b1f24, 0.5, 0.5),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xbfd8ea, metalness: 0, roughness: 0.04, transmission: 0.92, transparent: true, opacity: 0.22, thickness: 6, depthWrite: false }),
  accent: std(0x5cb8ff, 0.2, 0.4, { emissive: 0x2f8fe0, emissiveIntensity: 0.9 }),
  ledRed: std(0x501010, 0, 0.4, { emissive: 0xff3030, emissiveIntensity: 1.4 }),
  ledGreen: std(0x103a18, 0, 0.4, { emissive: 0x2fe06a, emissiveIntensity: 1.6 }),
  beam: new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }),
  foam: std(0x1d2126, 0, 0.9),
  insert: std(0x3d4148, 0.85, 0.32),
  card: std(0xf2f5f8, 0.1, 0.5),
  highlight: std(0x5cb8ff, 0.2, 0.4, { emissive: 0x5cb8ff, emissiveIntensity: 0, transparent: true, opacity: 0, depthWrite: false }),
};
function box(w, h, d, mat, x, y, z, parent = scene, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.redraw = (...a) => { draw(c.getContext('2d'), w, h, ...a); t.needsUpdate = true; };
  t.redraw(); return t;
}

/* ---------- Gabinete ---------- */
const W = 900, D = 750, H = 1850, ZF = D / 2;
const cab = new THREE.Group(); scene.add(cab);
box(W, 80, D - 40, M.dark, 0, 40, 0, cab);                         // rodapé
const sideL = box(20, H - 80, D, M.body, -W / 2 + 10, 80 + (H - 80) / 2, 0, cab);
const sideR = box(20, H - 80, D, M.body, W / 2 - 10, 80 + (H - 80) / 2, 0, cab);
box(W, H - 80, 20, M.body, 0, 80 + (H - 80) / 2, -ZF + 10, cab);    // fundo
box(W, 50, D, M.body, 0, H - 25, 0, cab);                           // teto
box(W - 40, 12, D - 40, M.frame, 0, 86, 0, cab);                    // base interna
// coluna direita (painel de comando)
const COLX0 = 170, COLX1 = W / 2;
box(COLX1 - COLX0, H - 130, 30, M.body, (COLX0 + COLX1) / 2, 80 + (H - 130) / 2, ZF - 15, cab);
box(8, H - 130, D - 40, M.frame, COLX0 + 4, 80 + (H - 130) / 2, 0, cab); // divisória interna
// faixa de destaque
box(W + 2, 14, D + 2, M.accent, 0, H - 72, 0, cab, false);
// painel inferior frontal com a gaveta de retirada
const BIN = { x0: -330, x1: 60, y0: 200, y1: 400 };
const lowFront = new THREE.Group(); cab.add(lowFront);
box(-450 - BIN.x0 + 0, 400, 30, M.body, (-450 + BIN.x0) / 2, 80 + 200, ZF - 15, lowFront);
box(COLX0 - BIN.x1, 400, 30, M.body, (BIN.x1 + COLX0) / 2, 80 + 200, ZF - 15, lowFront);
box(BIN.x1 - BIN.x0, BIN.y0 - 80, 30, M.body, (BIN.x0 + BIN.x1) / 2, (80 + BIN.y0) / 2, ZF - 15, lowFront);
box(BIN.x1 - BIN.x0, 480 - BIN.y1, 30, M.body, (BIN.x0 + BIN.x1) / 2, (BIN.y1 + 480) / 2, ZF - 15, lowFront);
// cavidade da gaveta
box(BIN.x1 - BIN.x0, 10, 130, M.dark, (BIN.x0 + BIN.x1) / 2, BIN.y0 + 5, ZF - 65, cab);
box(BIN.x1 - BIN.x0, BIN.y1 - BIN.y0, 10, M.dark, (BIN.x0 + BIN.x1) / 2, (BIN.y0 + BIN.y1) / 2, ZF - 130, cab);
// funil: recebe a caixa que cai das prateleiras
const funnel = new THREE.Mesh(new THREE.BoxGeometry(600, 8, 150), M.tray);
funnel.position.set(-140, 470, ZF - 75); funnel.rotation.x = -0.25; cab.add(funnel);
// porta da gaveta (desliza para cima quando liberada)
const flap = box(BIN.x1 - BIN.x0 - 12, BIN.y1 - BIN.y0 - 12, 10, M.glass, (BIN.x0 + BIN.x1) / 2, (BIN.y0 + BIN.y1) / 2, ZF + 4, cab, false);
const flapFrame = box(BIN.x1 - BIN.x0 + 16, 14, 14, M.frame, (BIN.x0 + BIN.x1) / 2, BIN.y1 + 10, ZF + 6, cab);
const binLed = box(120, 10, 6, M.ledRed, (BIN.x0 + BIN.x1) / 2, BIN.y1 + 32, ZF + 4, cab, false);

// porta de vidro com moldura, articulada à esquerda
const DOOR = { x0: -440, x1: 160, y0: 490, y1: H - 90 };
const doorPivot = new THREE.Group(); doorPivot.position.set(DOOR.x0, 0, ZF); cab.add(doorPivot);
const dw = DOOR.x1 - DOOR.x0, dh = DOOR.y1 - DOOR.y0, dyc = (DOOR.y0 + DOOR.y1) / 2;
box(dw, 26, 30, M.frame, dw / 2, DOOR.y1 - 13, 0, doorPivot);
box(dw, 26, 30, M.frame, dw / 2, DOOR.y0 + 13, 0, doorPivot);
box(26, dh, 30, M.frame, 13, dyc, 0, doorPivot);
box(26, dh, 30, M.frame, dw - 13, dyc, 0, doorPivot);
const glass = box(dw - 52, dh - 52, 8, M.glass, dw / 2, dyc, 0, doorPivot, false);
glass.renderOrder = 5;
box(16, 220, 30, M.dark, dw - 40, dyc, 22, doorPivot);              // puxador / trava
const lockLed = box(8, 30, 4, M.ledRed, dw - 40, dyc + 140, 34, doorPivot, false);

/* ---------- Painel de comando: tela touch e leitor de crachá ---------- */
const UI = { mode: 'idle', stock: 4, max: 7, min: 3, log: [] };
const screenTex = canvasTex(420, 600, drawScreen);
function drawScreen(x, w, h) {
  const m = UI.mode;
  x.fillStyle = '#0c1218'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#16212c'; x.fillRect(0, 0, w, 64);
  x.fillStyle = '#5cb8ff'; x.font = '700 24px Barlow, Arial, sans-serif'; x.fillText('ARMÁRIO DE FERRAMENTAS', 22, 40);
  x.fillStyle = '#8b98a5'; x.font = '500 16px "IBM Plex Mono", monospace'; x.fillText('Célula de usinagem 2', 22, 92);
  const title = (t, y = 160) => { x.fillStyle = '#e8edf2'; x.font = '700 34px Barlow, Arial, sans-serif'; x.fillText(t, 22, y); };
  const line = (t, y, c = '#b9c4ce', f = '500 20px Barlow, Arial, sans-serif') => { x.fillStyle = c; x.font = f; x.fillText(t, 22, y); };
  if (m === 'idle') {
    title('Aproxime o crachá'); line('para retirar ferramentas', 196);
    x.strokeStyle = '#5cb8ff'; x.lineWidth = 4; x.strokeRect(140, 260, 140, 200); x.fillStyle = '#5cb8ff'; x.fillRect(165, 290, 90, 14);
  } else if (m === 'login') {
    title('Olá, operador 0347'); line('Centro de custo: Torno 05', 196); line('Acesso liberado', 232, '#7fdcaa');
  } else if (m === 'list' || m === 'confirm') {
    title('Escolha o item', 140);
    const items = [['WNMG 06 04 08', 'C3', UI.stock], ['CNMG 12 04 08', 'B2', 6], ['DNMG 15 06 08', 'D4', 5], ['VBMT 16 04 04', 'A1', 4]];
    items.forEach(([code, pos, q], i) => {
      const y = 170 + i * 82, sel = i === 0 && m === 'confirm';
      x.fillStyle = sel ? '#163450' : '#141c25'; x.fillRect(16, y, w - 32, 70);
      if (sel) { x.strokeStyle = '#5cb8ff'; x.lineWidth = 3; x.strokeRect(16, y, w - 32, 70); }
      x.fillStyle = '#e8edf2'; x.font = '600 22px Barlow, Arial, sans-serif'; x.fillText(code, 30, y + 32);
      x.fillStyle = '#8b98a5'; x.font = '500 15px "IBM Plex Mono", monospace'; x.fillText(`posição ${pos} · ${q} cx`, 30, y + 56);
    });
    if (m === 'confirm') { x.fillStyle = '#5cb8ff'; x.fillRect(16, 510, w - 32, 64); x.fillStyle = '#07121c'; x.font = '700 24px Barlow, Arial, sans-serif'; x.fillText('Liberando posição C3…', 34, 551); }
  } else if (m === 'take') {
    title('Retire seu item'); line('WNMG 06 04 08 · 1 caixa', 196); line('A gaveta está destravada', 232, '#7fdcaa');
  } else if (m === 'done') {
    title('Retirada registrada'); line('Operador 0347 · Torno 05', 196); line(`Estoque C3: ${UI.stock} de ${UI.max}`, 232);
    if (UI.stock <= UI.min) line('Pedido de reposição enviado', 268, '#ffc58a');
  } else if (m === 'service') {
    title('Modo reposição'); line('Técnico do distribuidor', 196); line('Porta destravada', 232, '#7fdcaa');
  } else if (m === 'restocked') {
    title('Reposição registrada'); line(`C3: +4 caixas · ${UI.stock} de ${UI.max}`, 196, '#7fdcaa'); line('Pedido PC-1042 concluído', 232);
  }
}
const screen = new THREE.Mesh(new THREE.PlaneGeometry(210, 300), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
screen.position.set(310, 1330, ZF + 3); cab.add(screen);
box(230, 320, 12, M.dark, 310, 1330, ZF - 4, cab);
const readerTex = canvasTex(128, 80, (x, w, h) => {
  x.fillStyle = '#1b2128'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#8b98a5'; x.lineWidth = 3;
  for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(44, 40, 10 + i * 9, -0.9, 0.9); x.stroke(); }
  x.fillStyle = '#8b98a5'; x.font = '600 13px Barlow, Arial'; x.fillText('RFID', 78, 46);
});
const reader = new THREE.Mesh(new THREE.BoxGeometry(130, 80, 16), [M.dark, M.dark, M.dark, M.dark, new THREE.MeshStandardMaterial({ map: readerTex, roughness: 0.6 }), M.dark]);
reader.position.set(310, 1080, ZF + 6); cab.add(reader);
const readerLed = box(70, 6, 4, M.ledRed, 310, 1130, ZF + 4, cab, false);
// crachá do operador
const cardTex = canvasTex(108, 172, (x, w, h) => {
  x.fillStyle = '#f2f5f8'; x.fillRect(0, 0, w, h); x.fillStyle = '#2f8fe0'; x.fillRect(0, 0, w, 40);
  x.fillStyle = '#c4ccd4'; x.fillRect(30, 56, 48, 56); x.fillStyle = '#26303a'; x.font = '600 13px Barlow, Arial'; x.fillText('OPERADOR', 20, 134); x.fillText('0347', 38, 152);
});
const card = new THREE.Mesh(new THREE.BoxGeometry(54, 86, 1.5), [M.card, M.card, M.card, M.card, new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.5 }), M.card]);
card.castShadow = true; scene.add(card);

/* ---------- Interior: bandejas, espirais e motores ---------- */
const ROWS = ['A', 'B', 'C', 'D', 'E'], TRAY_Y = [1520, 1280, 1040, 800, 560], COL_X = [-370, -245, -120, 5, 130];
const COIL = { r: 52, pitch: 90, z0: -320, z1: 300, wire: 4 };
const SLOTS = 7, slotZ = k => COIL.z1 - COIL.pitch * (k + 0.5);
const coilGeo = (() => {
  const turns = (COIL.z1 - COIL.z0) / COIL.pitch;
  const curve = new THREE.Curve(); curve.getPoint = (t, out = new THREE.Vector3()) => { const a = t * turns * TAU; return out.set(COIL.r * Math.cos(a), COIL.r * Math.sin(a), COIL.z0 + t * (COIL.z1 - COIL.z0)); };
  return new THREE.TubeGeometry(curve, 420, COIL.wire, 8, false);
})();
const LABELS = { 'WNMG 06 04 08': '#2f8fe0', 'CNMG 12 04 08': '#e0902f', 'DNMG 15 06 08': '#3fae6a', 'VBMT 16 04 04': '#b05ad8', 'TNMG 16 04 08': '#d84a4a', 'SNMG 12 04 08': '#c9b23a' };
const boxGeo = new RoundedBoxGeometry(90, 70, 26, 2, 2);
const boxMats = {};
for (const [code, color] of Object.entries(LABELS)) {
  const t = canvasTex(180, 140, (x, w, h) => {
    x.fillStyle = '#eef1f4'; x.fillRect(0, 0, w, h); x.fillStyle = color; x.fillRect(0, 0, w, 34);
    x.fillStyle = '#fff'; x.font = '700 18px Barlow, Arial'; x.fillText('PASTILHAS', 10, 24);
    x.fillStyle = '#1b232c'; x.font = '700 21px Barlow, Arial'; x.fillText(code, 10, 68);
    x.fillStyle = '#5d6a76'; x.font = '500 13px "IBM Plex Mono", monospace'; x.fillText('10 unidades', 10, 94);
    for (let i = 0; i < 26; i++) { x.fillStyle = '#1b232c'; x.fillRect(10 + i * 4.5, 106, i % 3 ? 2 : 3, 24); }
  });
  const side = std(0xeef1f4, 0, 0.6);
  boxMats[code] = [side, side, side, side, new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }), side];
}
const coils = [];
const interior = new THREE.Group(); cab.add(interior);
ROWS.forEach((row, ri) => {
  const ty = TRAY_Y[ri];
  box(600, 8, COIL.z1 - COIL.z0 + 20, M.tray, -120, ty - 4, (COIL.z0 + COIL.z1) / 2, interior);
  COL_X.forEach((cx, ci) => {
    const id = `${row}${ci + 1}`;
    const pivot = new THREE.Group(); pivot.position.set(cx, ty + COIL.r + 2, 0); interior.add(pivot);
    const coilMesh = new THREE.Mesh(coilGeo, M.coil); coilMesh.castShadow = true; pivot.add(coilMesh);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 60, 24).rotateX(Math.PI / 2), M.motor);
    motor.position.set(cx, ty + COIL.r + 2, COIL.z0 - 34); interior.add(motor);
    // etiqueta de posição na frente da bandeja
    const tagTex = canvasTex(96, 48, (x, w, h) => { x.fillStyle = '#16212c'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8edf2'; x.font = '700 30px Barlow, Arial'; x.fillText(id, 22, 36); });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(48, 24), new THREE.MeshBasicMaterial({ map: tagTex, toneMapped: false }));
    tag.position.set(cx, ty - 16, COIL.z1 + 12); interior.add(tag);
    const code = id === 'C3' ? 'WNMG 06 04 08' : Object.keys(LABELS)[(ri * 5 + ci * 3) % 6];
    const count = id === 'C3' ? UI.stock : 3 + ((ri * 7 + ci * 3) % 5);
    const boxes = [];
    for (let k = 0; k < count; k++) {
      const b = new THREE.Mesh(boxGeo, boxMats[code]); b.castShadow = true; b.receiveShadow = true;
      b.position.set(cx, ty + 36, slotZ(k)); interior.add(b); boxes.push(b);
    }
    coils.push({ id, row: ri, col: ci, pivot, boxes, code, ty, cx });
  });
});
const C3 = coils.find(c => c.id === 'C3');
// destaque da posição escolhida
const glow = new THREE.Mesh(new THREE.BoxGeometry(118, 120, COIL.z1 - COIL.z0 + 20), M.highlight);
glow.position.set(C3.cx, C3.ty + 56, (COIL.z0 + COIL.z1) / 2); interior.add(glow);

// cortina de luz (sensor óptico de queda)
const curtain = new THREE.Group(); interior.add(curtain);
box(14, 40, 14, M.dark, -440 + 8, 520, 335, curtain); box(14, 40, 14, M.dark, COLX0 - 10, 520, 335, curtain);
for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(COLX0 + 420, 1.4, 1.4), M.beam); b.position.set((COLX0 - 440) / 2, 505 + i * 6, 335); curtain.add(b); }

/* ---------- Caixa detalhada com as pastilhas (retirada) ---------- */
const insertGeo = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(INSERT.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(INSERT.nor, 3));
  g.setIndex(INSERT.idx); g.translate(-5.676, -4.7625, 2.38); g.rotateX(-Math.PI / 2);
  return g;
})();
const openBox = new THREE.Group(); openBox.visible = false; scene.add(openBox);
{
  const wallM = std(0xeef1f4, 0, 0.6);
  box(90, 4, 70, wallM, 0, 2, 0, openBox); box(90, 26, 3, wallM, 0, 13, 33.5, openBox); box(90, 26, 3, wallM, 0, 13, -33.5, openBox);
  box(3, 26, 70, wallM, 43.5, 13, 0, openBox); box(3, 26, 70, wallM, -43.5, 13, 0, openBox);
  box(84, 10, 64, M.foam, 0, 9, 0, openBox, false);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(insertGeo, M.insert); m.castShadow = true;
    m.position.set(-32 + (i % 5) * 16, 14.5, i < 5 ? -13 : 13); m.rotation.y = (i % 2) * Math.PI / 3; openBox.add(m);
  }
}
const lidPivot = new THREE.Group(); lidPivot.position.set(0, 26, -35); openBox.add(lidPivot);
const lid = new THREE.Mesh(new THREE.BoxGeometry(90, 3, 70), boxMats['WNMG 06 04 08'][4]); lid.position.set(0, 1.5, 35); lid.castShadow = true; lidPivot.add(lid);
// pastilha em destaque, ampliada, para mostrar a geometria real do arquivo STEP
const hero = new THREE.Mesh(insertGeo, M.insert); hero.visible = false; hero.castShadow = true; scene.add(hero);

/* ---------- Estado e linha do tempo ---------- */
const CHAPTERS = [
  { id: 'maquina', name: 'A máquina', dur: 9 },
  { id: 'cracha', name: 'Identificação', dur: 6 },
  { id: 'escolha', name: 'Escolha', dur: 6 },
  { id: 'liberacao', name: 'Liberação', dur: 9 },
  { id: 'retirada', name: 'Retirada', dur: 8 },
  { id: 'registro', name: 'Registro', dur: 8 },
  { id: 'reposicao', name: 'Reabastecimento', dur: 10 },
  { id: 'explorar', name: 'Explorar', dur: 0 },
];
const TEXT = {
  maquina: ['A máquina', 'Um armário de ferramentas fica ao lado das máquinas e entrega pastilhas, brocas e fresas 24 horas por dia. Só retira quem tem crachá, e cada retirada fica registrada no centro de custo certo.'],
  cracha: ['Identificação', 'O operador aproxima o crachá do leitor RFID. A máquina confere quem é e em qual centro de custo ele trabalha antes de liberar qualquer item.'],
  escolha: ['Escolha da pastilha', 'Na tela, ele escolhe a pastilha WNMG 06 04 08. A máquina mostra a posição C3 e quantas caixas ainda há em estoque.'],
  liberacao: ['Liberação', 'Por dentro: o motor da posição C3 gira a espiral uma volta. A caixa da frente avança, cai, passa pela cortina de luz que confirma a entrega e chega à gaveta pelo funil.'],
  retirada: ['Retirada', 'A trava da gaveta libera, o LED fica verde e o operador retira a caixa. Dentro dela estão as 10 pastilhas WNMG 06 04 08, modeladas a partir do arquivo 3D original.'],
  registro: ['Registro e reposição automática', 'O consumo vai para o centro de custo do Torno 05. Como o estoque da posição C3 chegou ao mínimo, a máquina envia sozinha um pedido de reposição ao distribuidor.'],
  reposicao: ['Reabastecimento', 'O técnico do distribuidor entra com credencial própria, a porta destrava e ele completa a espiral C3. A reposição fica registrada e o pedido é encerrado.'],
  explorar: ['Explore a máquina', 'Gire, aproxime e alterne entre a visão externa e a interna para ver as espirais, os motores, a cortina de luz e o funil.'],
};
const state = { ch: 0, t: 0, playing: true, auto: true, userCam: false, interiorView: false };
let lastCh = -1;

/* ---------- Câmera ---------- */
const camera = new THREE.PerspectiveCamera(32, 1, 10, 40000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 300; controls.maxDistance = 9000; controls.maxPolarAngle = Math.PI * 0.49;
controls.addEventListener('start', () => (state.userCam = true));
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  const narrow = w <= 860, r = $('panel').getBoundingClientRect();
  const dx = narrow ? 0 : (r.width + 16) / 2, dy = narrow ? h / 2 - (110 + r.top) / 2 : 0;
  camera.aspect = w / h; camera.setViewOffset(w, h, dx, dy, w, h); camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
const narrowF = () => (innerWidth / innerHeight < 0.8 ? 1.7 : 1);
const SHOTS = {
  geral: [V(1700, 1500, 4300), V(40, 930, 0)],
  comando: [V(900, 1400, 1300), V(250, 1220, ZF)],
  dentro: [V(1900, 1300, 1150), V(-120, 900, 120)],
  gaveta: [V(450, 650, 1350), V(-130, 380, ZF)],
  porta: [V(1100, 1200, 2300), V(-150, 1050, ZF)],
};
function shot(name, t = 0) {
  const [p, tg] = SHOTS[name], f = narrowF();
  const pos = tg.clone().add(p.clone().sub(tg).multiplyScalar(f));
  if (name === 'geral') pos.applyAxisAngle(V(0, 1, 0), Math.sin(t * 0.15) * 0.25);
  return [pos, tg];
}

/* ---------- Rótulos com linha de chamada ---------- */
const labelsEl = $('labels'), leadersEl = $('leaders');
const LABELS3D = [
  ['Tela touch', V(310, 1430, ZF), 120, -40],
  ['Leitor de crachá RFID', V(370, 1080, ZF), 130, 30],
  ['Porta de vidro com trava', V(-150, 1600, ZF), -160, -60],
  ['Espirais com motor', V(-245, 1330, 200), -170, 20],
  ['Gaveta de retirada', V(-130, 300, ZF), -150, 60],
].map(([t, p, dx, dy]) => {
  const el = document.createElement('div'); el.className = 'lbl'; el.textContent = t; labelsEl.appendChild(el);
  const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); leadersEl.appendChild(ln);
  return { el, ln, p, dx, dy };
});
function updateLabels(on) {
  const s = innerWidth <= 860 ? 0.55 : 1;
  for (const L of LABELS3D) {
    const v = L.p.clone().project(camera), x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    const lx = x + L.dx * s, ly = y + L.dy * s, bw = L.el.offsetWidth, bh = L.el.offsetHeight;
    L.el.style.transform = `translate(${(L.dx < 0 ? lx - bw : lx).toFixed(1)}px, ${(ly - bh / 2).toFixed(1)}px)`;
    L.el.classList.toggle('show', on);
    L.ln.setAttribute('x1', x); L.ln.setAttribute('y1', y); L.ln.setAttribute('x2', lx); L.ln.setAttribute('y2', ly);
    L.ln.style.opacity = on ? 1 : 0;
  }
}

/* ---------- Painel lateral, linha do tempo e painel de dados ---------- */
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
      <dt>Item</dt><dd>WNMG 06 04 08</dd>
      <dt>Posição</dt><dd>C3 · espiral 5 × 5</dd>
      <dt>Estoque</dt><dd id="stockVal">${UI.stock} de ${UI.max} cx</dd>
      <dt>Mínimo</dt><dd>${UI.min} cx</dd>
    </dl>`;
  chapEl.querySelectorAll('.chap').forEach((b, i) => b.classList.toggle('on', i === state.ch));
}
function renderData() {
  const pct = (UI.stock / UI.max) * 100, low = UI.stock <= UI.min;
  $('data').innerHTML = `
    <p class="eyebrow">Painel de consumo · em tempo real</p>
    <div class="stock"><span>C3 · WNMG 06 04 08</span><b>${UI.stock}/${UI.max}</b></div>
    <div class="meter"><i style="width:${pct}%" class="${low ? 'low' : ''}"></i><em style="left:${(UI.min / UI.max) * 100}%"></em></div>
    <table>${UI.log.map(r => `<tr class="${r.cls || ''}"><td>${r.t}</td><td>${r.who}</td><td>${r.what}</td></tr>`).join('')}</table>`;
}
function setStock(n) { UI.stock = n; const s = $('stockVal'); if (s) s.textContent = `${n} de ${UI.max} cx`; }

function goTo(i, auto) {
  state.ch = i; state.t = 0; state.auto = auto; state.userCam = false;
  resetScene(i);
  renderPanel(); renderData(); resize();
}
// estado da cena no início de cada etapa (permite pular para qualquer etapa)
function resetScene(i) {
  const id = CHAPTERS[i].id, before = k => i > CHAPTERS.findIndex(c => c.id === k);
  UI.stock = before('liberacao') || id === 'reposicao' ? 3 : 4;
  if (before('reposicao')) UI.stock = 7;
  UI.log = [{ t: '20:41', who: 'Op. 0212 · Fresa 02', what: 'CNMG 12 04 08 · 1 cx' }, { t: '20:58', who: 'Op. 0198 · Torno 03', what: 'DNMG 15 06 08 · 1 cx' }];
  if (before('retirada')) UI.log.push({ t: '21:14', who: 'Op. 0347 · Torno 05', what: 'WNMG 06 04 08 · 1 cx', cls: 'new' });
  if (before('registro')) UI.log.push({ t: '21:14', who: 'Sistema', what: 'Pedido PC-1042 ao distribuidor', cls: 'alert' });
  if (before('reposicao')) UI.log.push({ t: '08:05', who: 'Distribuidor', what: 'Reposição C3 · +4 cx', cls: 'ok' });
  // caixas na espiral C3
  C3.boxes.forEach(b => b.parent && b.parent.remove(b));
  C3.boxes = [];
  for (let k = 0; k < UI.stock; k++) {
    const b = new THREE.Mesh(boxGeo, boxMats[C3.code]); b.castShadow = true;
    b.position.set(C3.cx, C3.ty + 36, slotZ(k)); interior.add(b); C3.boxes.push(b);
  }
  C3.pivot.rotation.z = 0; dropBox.visible = false; openBox.visible = false; hero.visible = false;
  UI.mode = { maquina: 'idle', cracha: 'idle', escolha: 'login', liberacao: 'confirm', retirada: 'take', registro: 'done', reposicao: 'done', explorar: 'restocked' }[id];
  screenTex.redraw();
}
const dropBox = new THREE.Mesh(boxGeo, boxMats['WNMG 06 04 08']); dropBox.castShadow = true; dropBox.visible = false; interior.add(dropBox);
const setLed = (m, on) => (m.material = on ? M.ledGreen : M.ledRed);

/* ---------- Laço ---------- */
const clock = new THREE.Clock();
let mode = '', tmp = V(0, 0, 0);
function setMode(m) { if (UI.mode !== m) { UI.mode = m; screenTex.redraw(); } }
function frame(fixedDt) {
  const dt = fixedDt ?? Math.min(clock.getDelta(), 0.05);
  if (state.playing) state.t += dt;
  const c = CHAPTERS[state.ch], t = state.t, id = c.id;
  if (state.ch !== lastCh) { lastCh = state.ch; }
  let cam = shot('geral', t), interiorOpen = false, labelsOn = false;
  card.visible = false; setLed(readerLed, false); setLed(binLed, false); setLed(lockLed, false);
  flap.position.y = (BIN.y0 + BIN.y1) / 2; doorPivot.rotation.y = 0;
  M.highlight.opacity = 0; M.highlight.emissiveIntensity = 0; M.beam.opacity = 0;
  inner.intensity = 1.6;

  if (id === 'maquina') {
    labelsOn = t > 1.5; setMode('idle');
  } else if (id === 'cracha') {
    cam = shot('comando'); card.visible = true;
    const k = ease(seg(t, 0.6, 2.4)), back = ease(seg(t, 4, 5.4));
    card.position.set(lerp(560, 310, k), lerp(900, 1080, k), lerp(900, ZF + 30, k) + back * 300);
    card.rotation.set(0, lerp(-0.6, 0, k), 0);
    const ok = t > 2.5; setLed(readerLed, ok); setMode(ok ? 'login' : 'idle');
  } else if (id === 'escolha') {
    cam = shot('comando'); setLed(readerLed, true);
    setMode(t < 1.5 ? 'login' : t < 3 ? 'list' : 'confirm');
    if (t > 3) { const p = 0.5 + 0.5 * Math.sin((t - 3) * 5); M.highlight.opacity = 0.18 + 0.12 * p; M.highlight.emissiveIntensity = 0.6 + 0.4 * p; }
    if (t > 4) { cam = shot('porta'); }
  } else if (id === 'liberacao') {
    cam = shot('dentro'); interiorOpen = true; setMode('confirm');
    M.highlight.opacity = 0.12; M.highlight.emissiveIntensity = 0.5;
    const turn = ease(seg(t, 0.8, 3.6));
    C3.pivot.rotation.z = -turn * TAU;
    // as caixas avançam um passo; a da frente cai pelo vão e passa pela cortina de luz
    C3.boxes.forEach((b, k) => { b.position.z = slotZ(k) + turn * COIL.pitch; b.visible = k > 0 || turn < 0.55; });
    const first = C3.boxes[0];
    if (turn >= 0.55) {
      dropBox.visible = true;
      const ft = Math.max(0, t - (0.8 + 0.55 * 2.8)), y0 = C3.ty + 36, yLand = BIN.y0 + 40;
      const y = Math.max(yLand, y0 - 0.5 * 2200 * ft * ft);
      const landed = y <= yLand + 0.1, tz = landed ? Math.min(1, (ft - Math.sqrt(2 * (y0 - yLand) / 2200)) * 2.5) : 0;
      dropBox.position.set(lerp(C3.cx, (BIN.x0 + BIN.x1) / 2, clamp((y0 - y) / (y0 - 480))), y, lerp(slotZ(0) + COIL.pitch, ZF - 60, clamp((y0 - y) / (y0 - 480))));
      dropBox.rotation.set(Math.min(1, ft * 1.6) * -0.6, 0, Math.sin(ft * 6) * 0.15 * (landed ? 0 : 1));
      if (Math.abs(y - 515) < 70) M.beam.opacity = 0.95; else if (y < 515) M.beam.opacity = Math.max(0, 0.6 - (515 - y) / 200);
      if (landed && t > 6.5) setLed(binLed, true);
    }
  } else if (id === 'retirada') {
    cam = shot('gaveta'); setLed(binLed, true); setMode('take');
    const up = ease(seg(t, 0.5, 1.5));
    flap.position.y = (BIN.y0 + BIN.y1) / 2 + up * 190;
    const out = ease(seg(t, 1.6, 3.4)), lift = ease(seg(t, 3.4, 4.6)), open = ease(seg(t, 4.6, 6));
    openBox.visible = true; dropBox.visible = false;
    openBox.position.set(lerp((BIN.x0 + BIN.x1) / 2, -40, out), lerp(BIN.y0 + 8, 560, lift) , lerp(ZF - 60, ZF + 260, out));
    openBox.rotation.set(lerp(-Math.PI / 2, 0, lift), lerp(0, 0.35, lift), 0);
    lidPivot.rotation.x = -open * 1.9;
    if (t > 4.6) { cam = [V(-40 + 160, 560 + 230, ZF + 260 + 260), V(-40, 575, ZF + 260)]; }
    hero.visible = t > 6; hero.position.set(70, 610, ZF + 300); hero.scale.setScalar(2.4 * ease(seg(t, 6, 7))); hero.rotation.set(-0.5, t * 0.8, 0.25);
  } else if (id === 'registro') {
    cam = shot('geral', t); setMode('done');
    if (t > 1 && UI.log.length < 3) { UI.log.push({ t: '21:14', who: 'Op. 0347 · Torno 05', what: 'WNMG 06 04 08 · 1 cx', cls: 'new' }); setStock(3); renderData(); screenTex.redraw(); }
    if (t > 3.5 && UI.log.length < 4) { UI.log.push({ t: '21:14', who: 'Sistema', what: 'Pedido PC-1042 ao distribuidor', cls: 'alert' }); renderData(); }
  } else if (id === 'reposicao') {
    cam = shot('porta'); setMode(t < 8.5 ? 'service' : 'restocked');
    const open = ease(seg(t, 1, 2.6)) * (1 - ease(seg(t, 7, 8.4)));
    doorPivot.rotation.y = -open * 1.75; setLed(lockLed, t > 0.8 && t < 8.4);
    for (let k = C3.boxes.length; k < 7 && t > 2.8 + (k - 3) * 0.9; k++) {
      const b = new THREE.Mesh(boxGeo, boxMats[C3.code]); b.castShadow = true; b.userData.t0 = 2.8 + (k - 3) * 0.9; b.userData.k = k; interior.add(b); C3.boxes.push(b);
    }
    C3.boxes.forEach(b => {
      if (b.userData.t0 == null) return;
      const p = ease(seg(t, b.userData.t0, b.userData.t0 + 0.8));
      b.position.set(C3.cx, C3.ty + 36 + (1 - p) * 40, lerp(ZF + 260, slotZ(b.userData.k), p));
    });
    if (t > 6.6 && UI.stock < 7) { setStock(7); UI.log.push({ t: '08:05', who: 'Distribuidor', what: 'Reposição C3 · +4 cx', cls: 'ok' }); renderData(); }
    M.highlight.opacity = t > 2.6 && t < 7 ? 0.14 : 0; M.highlight.emissiveIntensity = 0.5;
  } else {
    interiorOpen = state.interiorView; setMode('restocked');
  }
  // visão interna: tira a lateral direita e a divisória para ver espirais, motores e o funil
  sideR.visible = !interiorOpen;
  glass.material.opacity = interiorOpen ? 0.08 : 0.22;
  $('data').hidden = !(id === 'registro' || id === 'reposicao');

  if (state.auto && t >= c.dur && c.dur) goTo(state.ch + 1, true);
  chapEl.querySelectorAll('.chap .bar b').forEach((b, i) => (b.style.width = i < state.ch ? '100%' : i === state.ch && c.dur ? `${clamp(t / c.dur) * 100}%` : '0%'));
  $('caption').textContent = c.name;

  if (!state.userCam && id !== 'explorar') {
    const k = 1 - Math.exp(-dt * 2.2);
    camera.position.lerp(cam[0], k); controls.target.lerp(cam[1], k);
  }
  controls.update();
  renderer.render(scene, camera);
  updateLabels(labelsOn);
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
addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); $('play').click(); } });
new ResizeObserver(() => { document.documentElement.style.setProperty('--tb', $('timeline').offsetHeight + 'px'); resize(); }).observe($('timeline'));

const [p0, t0] = shot('geral');
camera.position.copy(p0); controls.target.copy(t0);
goTo(0, true); syncPlay();
$('loading').hidden = true;
window.demo = { step: dt => frame(dt), goTo, state, CHAPTERS };
if (!CAPTURE) frame();
