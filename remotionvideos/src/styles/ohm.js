// Ohm's law (NCERT Class 10 Science, Chapter 11 Electricity) in the Soft Clay style from prompt.txt.
// Story (script.txt, 30 s): a bulb switches on in the dark -> the circuit is revealed and charge flows ->
// a resistor is swapped in and the current drops -> V = I x R -> the resistor comes out and the numbers fit.
//
// Physics kept honest (owner rule: facts must match the NCERT chapter):
//  - the 4 ohm in the final numbers is the BULB's resistance (12 V / 4 ohm = 3 A); the extra resistor is
//    swapped in for the "resistance opposes current" beat (total 8 ohm -> 1.5 A, bulb power drops to 1/4)
//  - the beads are electrons: they leave the battery's negative end and return to its positive end
//  - current is the same all round a series loop, so every bead slows down together, not only at the resistor
//  - the circuit is never open: the resistor and the plain wire swap on the same pose
import { staticFile } from 'remotion';
import '../kit';
import { clay, lumpy, part } from './clay.js';

const K = window.K, THREE = window.THREE;

// ---------------------------------------------------------------- content (change this for a new topic)
const VOLTS = 12;                                  // the battery
const R_BULB = 4;                                  // the bulb's resistance, ohms
const R_EXTRA = 4;                                 // the resistor swapped in for beat 3
const I_ON = VOLTS / R_BULB;                       // 3 A
const I_LOW = VOLTS / (R_BULB + R_EXTRA);          // 1.5 A
const num = (x) => String(Math.round(x * 10) / 10);
const AMPS = { zero: '0 A', on: num(I_ON) + ' A', low: num(I_LOW) + ' A' };
const TITLE = "OHM'S LAW";
const FORMULA = [['V', 'yellow'], ['=', 'cream'], ['I', 'cyan'], ['×', 'cream'], ['R', 'orange']];
const EQUATION = [[VOLTS + ' V', 'yellow'], ['=', 'cream'], [num(I_ON) + ' A', 'cyan'], ['×', 'cream'], [R_BULB + ' Ω', 'orange']];
const CAPTIONS = [
  { text: 'VOLTAGE → CURRENT', from: 5.6, to: 10.9 },
  { text: 'RESISTANCE OPPOSES CURRENT', from: 11.6, to: 16.9 },
  { text: 'Voltage = Current × Resistance', from: 19.6, to: 23.9 },
];
const ENDCARD = { line1: 'EXPLORE PHYSICS. DISCOVER THE UNSEEN.', line2: 'VigyanVerse AI', from: 28.0 };
const DURATION = 30;

// the box of clay: electric cyan for charge, yellow for voltage,
// orange for resistance, copper wire
const BOX = {
  cream: ['#f3e6cd', '#eec78c'], yellow: ['#f4ad08', '#ee7f14'], cyan: ['#13a9c8', '#79dcef'], orange: ['#e8571c', '#f5943f'],
  copper: ['#9a5531', '#c4865a'], navy: ['#253677', '#4467b8'], grey: ['#5a5f68', '#7d838d'],
  // the room
  sage: ['#5f8f55', '#93c07a'], coral: ['#c8463a', '#ec8a62'], plank: ['#7a4a2c', '#a8714a'], pot: ['#b65a35', '#d98a5e'],
};
// a student's study at night: a wooden desk against a plum wall, a window with the moon, a shelf of books
const ROOM = { wall: '#4f3d57', wood: '#9a6a45', woodDark: '#6e4529', sky: '#16234a' };
const FONT = '700 200px "Fredoka"';

// ---------------------------------------------------------------- stop-motion time (as in the reference)
const POSES = 15;
const pose = (t) => Math.floor(t * POSES + 1e-3) / POSES;
const snap = (t) => Math.round(t * POSES) / POSES;
const since = (tq, t0) => Math.round((tq - t0) * POSES);
const nudge = (id, tq, amt) => (K.hash(id, Math.round(tq * POSES)) - 0.5) * 2 * amt;

// one schedule for picture (and later sound)
const T = {
  on: snap(1.2),            // the bulb switches on
  lights: [1.7, 3.4],       // the room lamp comes up
  title: snap(-2),          // OHM'S LAW is already on the wall in the first frame
  volts: snap(7.0),         // the 12 V card lands by the battery
  swapIn: snap(12.6),       // the resistor lands in the gap, the plain wire flies off
  titleOff: snap(8.4),      // title peeled off while the camera is down at the battery
  formula: snap(18.0),      // V = I x R, one glyph after another
  swapOut: snap(24.6),      // the plain wire lands back, the resistor flies off
  ohms: snap(25.6),         // the 4 ohm card lands by the bulb
  equation: snap(26.5),     // 12 V = 3 A x 4 ohm under the formula
};
// current steps (A): what an ammeter would read after each event
const STEPS = [[T.on, I_ON], [T.swapIn, I_LOW - I_ON], [T.swapOut, I_ON - I_LOW]];

// sound cues on the same schedule as the picture: [time s, file in public/sfx, volume]. Kept gentle.
export const SOUND_CUES = (() => {
  const c = [];
  c.push([T.on, 'switch', 0.45]);                                                              // the bulb switches on
    for (const t of [2.7, 5.0, 9.9, 16.2]) c.push([t, 'whoosh', 0.12]);                          // the big camera moves
  c.push([T.volts, 'page-turn', 0.3]);                                                         // 12 V card lands
  c.push([T.swapIn - 5 / POSES, 'whoosh', 0.1], [T.swapIn, 'mouse-click', 0.3]);               // resistor hops in
  for (let k = 0; k < 5; k++) c.push([snap(T.formula + 0.27 * k), 'mouse-click', 0.22]);       // V = I x R
  c.push([T.swapOut - 5 / POSES, 'whoosh', 0.1], [T.swapOut, 'mouse-click', 0.3]);             // resistor hops out
  c.push([T.ohms, 'page-turn', 0.3]);                                                          // 4 ohm card lands
  for (let k = 0; k < 5; k++) c.push([snap(T.equation + 0.2 * k), 'mouse-click', 0.2]);        // 12 V = 3 A x 4 ohm
  c.push([snap(T.equation + 1.1), 'ding', 0.22]);                                              // it adds up
  return c;
})();

// ---------------------------------------------------------------- the set (top view: x right, z toward camera)
const XL = -3.4, XR = 3.4, ZB = -0.7, ZF = 1.5;   // the wire loop on the table
const WR = 0.055;                                  // wire radius
const BAT = { x0: -2.5, x1: -0.84, cx: -1.7 };      // battery: negative end left, positive end right
const AMM_X = 1.5;                                 // ammeter on the front wire
const SLOT = [-0.1, 0.9];                          // gap on the right wire: plain wire or resistor
const FLOOR_BACK = -1.4, COVE = 1.2, WALL = FLOOR_BACK - COVE;
// electron path: out of the negative end, round the loop, into the positive end, then through the battery
const LOOP = [[BAT.x0, ZF], [XL, ZF], [XL, ZB], [XR, ZB], [XR, ZF], [BAT.x1, ZF]];

export const ohmStyle = {
  id: 'soft-clay-ohms-law',
  name: 'Soft Clay: Ohm\'s law',
  topic: 'Ohm\'s law: V = I x R (Class 10, Chapter 11 Electricity)',
  duration: DURATION,
  fonts: [FONT, '600 50px "Fredoka"'],
  render: { samples: 32, shutter: 0, tone: 'neutral', exposure: 1.0, bloom: 0.1, bloomThreshold: 1.05, vignette: 0.3, grain: 0.014, fov: 28, background: '#121518' },

  async build(S) {
    const { scene, camera } = S;
    const rnd = K.rng(11);
    const M = {};
    for (const k of Object.keys(BOX)) if (k !== 'card') M[k] = clay(BOX[k], { marbleAmount: k === 'cream' ? 0.15 : 0.35, marbleSize: 0.3 });

    // ---- light: one big soft lamp from the upper left, sky light with real occlusion, a pale environment
    const KEY = 1400;
    K.env(S, { top: '#f2efe9', horizon: '#c9b9b0', bottom: '#5a3e2c', intensity: 0.22, panels: [{ pos: [-9, 12, 10], size: [16, 12], color: '#fff2df', power: 2.4 }] });
    const key = K.spot(S, { pos: [-7.5, 11, 9.5], target: [0.2, 1.0, -0.4], color: '#fff0dc', power: KEY, angle: 0.55, penumbra: 1, soft: 1.3, near: 6, far: 40, bias: -0.0003 });
    const sky = K.skyLight(S, { color: '#e2f2ff', power: 0.75, size: 9.5, center: [0, 1.2, 0], spread: 0.85 });
    // moonlight through the window: cool and low, so the first frame already shows the room
    const moonLight = new THREE.DirectionalLight('#8fa8ff', 0.9); moonLight.position.set(7, 6, 3); moonLight.target.position.set(0, 0.6, -0.5); scene.add(moonLight, moonLight.target);
    const logo = await new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = staticFile('logo.png'); });

    // ---- the room: a wooden desk top, a painted wall with a skirting board, a night window, a shelf and a plant
    {
      const tooth = (rx, ry) => K.canvasTex(256, 256, (ctx) => { const im = ctx.createImageData(256, 256), r = K.rng(9); for (let i = 0; i < im.data.length; i += 4) { im.data[i] = im.data[i + 1] = im.data[i + 2] = 128 + r.range(-60, 60); im.data[i + 3] = 255; } ctx.putImageData(im, 0, 0); }, { data: true, repeat: [rx, ry] });
      // desk: planks running left to right, each a slightly different tone, with wavy grain and dark seams
      const wood = K.canvasTex(1024, 1024, (ctx, w, h) => {
        const r = K.rng(21), PL = 6, base = new THREE.Color(ROOM.wood), dark = new THREE.Color(ROOM.woodDark);
        for (let k = 0; k < PL; k++) {
          const y0 = (k * h) / PL, c = base.clone().lerp(dark, r.range(0, 0.35));
          ctx.fillStyle = '#' + c.getHexString(); ctx.fillRect(0, y0, w, h / PL);
          for (let g = 0; g < 26; g++) {
            const gy = y0 + r.range(4, h / PL - 4), amp = r.range(1, 5), ph = r.range(0, 6.3), fr = r.range(0.004, 0.012);
            ctx.strokeStyle = `rgba(60,32,16,${r.range(0.08, 0.25)})`; ctx.lineWidth = r.range(0.8, 2.2); ctx.beginPath();
            for (let x = 0; x <= w; x += 8) { const y = gy + amp * Math.sin(x * fr + ph); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(40,20,10,0.55)'; ctx.fillRect(0, y0, w, 3);
        }
      }, { repeat: [4, 2] });
      const desk = new THREE.Mesh(new THREE.PlaneGeometry(40, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.72, bumpMap: tooth(30, 15), bumpScale: 0.15 }));
      desk.position.set(0, 0, WALL + 10); desk.receiveShadow = true; scene.add(desk);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshStandardMaterial({ color: ROOM.wall, roughness: 0.95, bumpMap: tooth(40, 16), bumpScale: 0.3 }));
      wall.position.set(0, 8, WALL); wall.receiveShadow = true; scene.add(wall);
      const skirt = part(lumpy(K.roundedBox(40, 0.24, 0.1, 0.04, 3), { amount: 0.01, size: 0.5, seed: 201 }), M.cream); skirt.position.set(0, 0.12, WALL + 0.05); scene.add(skirt);

      // the window on the right: a night sky, the moon and a few stars behind a clay frame, curtains either side
      const WX = 4.7, WY = 2.7, WW = 2.0, WH = 2.0;
      const skyMat = new THREE.MeshStandardMaterial({ color: ROOM.sky, roughness: 1, emissive: '#1f3478', emissiveIntensity: 0.55 });
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(WW, WH), skyMat); pane.position.set(WX, WY, WALL + 0.01); scene.add(pane);
      const glowMat = new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: '#fff0c2', emissiveIntensity: 1.6 });
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 20), glowMat); moon.position.set(WX + 0.42, WY + 0.45, WALL + 0.03); scene.add(moon);
      const bite = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20), skyMat); bite.position.set(WX + 0.53, WY + 0.52, WALL + 0.1); scene.add(bite);
      const sr = K.rng(31);
      for (let i = 0; i < 9; i++) { const st = new THREE.Mesh(new THREE.SphereGeometry(sr.range(0.018, 0.035), 10, 8), glowMat); st.position.set(WX + sr.range(-0.85, 0.85), WY + sr.range(-0.8, 0.85), WALL + 0.03); if (Math.hypot(st.position.x - WX - 0.45, st.position.y - WY - 0.48) > 0.35) scene.add(st); }
      const bar = (w, h, x, y, seed) => { const b = part(lumpy(K.roundedBox(w, h, 0.16, 0.05, 4), { amount: 0.012, size: 0.4, seed }), M.cream); b.position.set(x, y, WALL + 0.08); scene.add(b); };
      bar(WW + 0.28, 0.16, WX, WY + WH / 2 + 0.06, 211); bar(WW + 0.28, 0.16, WX, WY - WH / 2 - 0.06, 212);
      bar(0.16, WH + 0.2, WX - WW / 2 - 0.06, WY, 213); bar(0.16, WH + 0.2, WX + WW / 2 + 0.06, WY, 214);
      bar(0.09, WH, WX, WY, 215); bar(WW, 0.09, WX, WY, 216);
      { const sill = part(lumpy(K.roundedBox(WW + 0.6, 0.12, 0.34, 0.05, 4), { amount: 0.012, size: 0.4, seed: 217 }), M.cream); sill.position.set(WX, WY - WH / 2 - 0.18, WALL + 0.17); scene.add(sill); }
      for (const s of [-1, 1]) { const c = part(lumpy(K.roundedBox(0.5, WH + 0.6, 0.16, 0.08, 5), { amount: 0.05, size: 0.3, seed: 220 + s, dents: 4, dentSize: 0.2, dentDepth: 0.03 }), M.sage); c.position.set(WX + s * (WW / 2 + 0.38), WY - 0.1, WALL + 0.14); c.rotation.z = s * 0.02; scene.add(c); }

      // the shelf on the left: a plank, a row of books (one leaning) and a plant in a pot
      const SX = -4.7, SY = 2.25;
      { const p = part(lumpy(K.roundedBox(2.5, 0.12, 0.46, 0.04, 4), { amount: 0.01, size: 0.5, seed: 231 }), M.plank); p.position.set(SX, SY, WALL + 0.23); scene.add(p); }
      [[0.24, 0.78, 'navy'], [0.18, 0.66, 'yellow'], [0.26, 0.86, 'coral'], [0.2, 0.7, 'cyan'], [0.22, 0.6, 'cream']].forEach(([w, h, c], i) => {
        const bk = part(lumpy(K.roundedBox(w, h, 0.36, 0.04, 4), { amount: 0.012, size: 0.3, seed: 240 + i }), M[c]);
        const lean = i === 4 ? 0.3 : 0;
        bk.position.set(SX - 1.0 + i * 0.27 + (lean ? 0.12 : 0), SY + 0.06 + h / 2 - (lean ? 0.04 : 0), WALL + 0.25); bk.rotation.z = -lean; scene.add(bk);
      });
      { const pot = part(lumpy(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 28, 4), { amount: 0.012, size: 0.3, seed: 251 }), M.pot); pot.position.set(SX + 0.85, SY + 0.22, WALL + 0.25); scene.add(pot); }
      for (let i = 0; i < 6; i++) {
        const a = -0.9 + i * 0.36, leaf = part(lumpy(new THREE.SphereGeometry(0.11, 16, 12), { amount: 0.02, size: 0.1, seed: 260 + i }), M.sage);
        leaf.scale.set(0.7, 1.9, 0.5); leaf.position.set(SX + 0.85 + Math.sin(a) * 0.17, SY + 0.55 + Math.cos(a) * 0.12, WALL + 0.25); leaf.rotation.z = -a * 0.8; scene.add(leaf);
      }
    }

    // ---- wires: rolled snakes of copper clay, a lump at every corner
    const wire = (a, b, seed) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]); return part(lumpy(K.tube([[a[0], WR, a[1]], [b[0], WR, b[1]]], WR, { segments: Math.max(8, Math.ceil(len * 24)), radial: 12 }), { amount: 0.006, size: 0.25, seed }), M.copper); };
    [[[BAT.x0, ZF], [XL, ZF]], [[XL, ZF], [XL, ZB]], [[XL, ZB], [-0.27, ZB]], [[0.27, ZB], [XR, ZB]], [[XR, ZB], [XR, SLOT[0]]],
      [[XR, SLOT[1]], [XR, ZF]], [[XR, ZF], [AMM_X + 0.5, ZF]], [[AMM_X - 0.5, ZF], [BAT.x1, ZF]]].forEach(([a, b], i) => scene.add(wire(a, b, 30 + i)));
    const cornerGeo = lumpy(new THREE.SphereGeometry(WR * 1.5, 16, 12), { amount: 0.008, size: 0.1, seed: 5 });
    for (const [x, z] of [[XL, ZF], [XL, ZB], [XR, ZB], [XR, ZF]]) { const c = part(cornerGeo, M.copper); c.position.set(x, WR, z); scene.add(c); }
    // the piece of plain wire in the gap (it swaps with the resistor)
    const slotWire = wire([0, SLOT[0] - 0.4], [0, SLOT[1] - 0.4], 50);   // built around z = 0.4 so it can hop and spin
    const slotHome = [XR, 0, 0.4];
    scene.add(slotWire);

    // ---- the battery (cell): yellow body, navy band at the negative end, a nub on the positive end
    const battery = new THREE.Group(); battery.position.set(BAT.cx, 0.32, ZF); scene.add(battery);
    battery.add(part(lumpy(new THREE.CylinderGeometry(0.32, 0.32, 1.58, 48, 10).rotateZ(Math.PI / 2), { amount: 0.012, size: 0.4, seed: 61, dents: 3, dentSize: 0.25, dentDepth: 0.02 }), M.yellow));
    { const b = part(lumpy(new THREE.CylinderGeometry(0.328, 0.328, 0.5, 48, 4).rotateZ(Math.PI / 2), { amount: 0.008, size: 0.3, seed: 62 }), M.navy); b.position.x = -0.55; battery.add(b); }
    { const n = part(lumpy(new THREE.CylinderGeometry(0.11, 0.12, 0.1, 24, 2).rotateZ(Math.PI / 2), { amount: 0.006, size: 0.2, seed: 63 }), M.grey); n.position.x = 0.83; battery.add(n); }
    const flat = (txt, size, mat, seed) => { const g = K.text3d(txt, { font: FONT, size, depth: size * 0.22, bevel: size * 0.06, bevelSegments: 3 }); g.rotateX(-Math.PI / 2); return part(lumpy(g, { amount: 0.004, size: 0.2, seed }), mat); };
    { const plus = flat('+', 0.34, M.navy, 64); plus.position.set(0.48, 0.33, 0); battery.add(plus); }
    { const minus = flat('-', 0.34, M.cream, 65); minus.position.set(-0.55, 0.335, 0); battery.add(minus); }

    // ---- the bulb: clay socket, glass, a coiled filament that glows
    const bulb = new THREE.Group(); bulb.position.set(0, 0, ZB); scene.add(bulb);
    { const sk = part(lumpy(new THREE.CylinderGeometry(0.27, 0.3, 0.42, 40, 6), { amount: 0.01, size: 0.3, seed: 71, dents: 2, dentSize: 0.15, dentDepth: 0.015 }), M.grey); sk.position.y = 0.21; bulb.add(sk); }
    for (const y of [0.16, 0.3]) { const r = part(new THREE.TorusGeometry(0.285, 0.022, 10, 48).rotateX(Math.PI / 2), M.grey); r.position.y = y; bulb.add(r); }
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#fff4dc', roughness: 0.15, metalness: 0, transparent: true, opacity: 0.24, depthWrite: false, emissive: '#ffcf7a', emissiveIntensity: 0 });
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), glassMat); glass.position.y = 0.98; glass.scale.set(1, 1.08, 1); bulb.add(glass);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.24, 40, 2, true), glassMat); neck.position.y = 0.54; bulb.add(neck);
    for (const s of [-1, 1]) bulb.add(part(K.tube([[s * 0.08, 0.42, 0], [s * 0.1, 0.7, 0], [s * 0.115, 0.93, 0]], 0.014, { segments: 16, radial: 8 }), M.copper));
    const coilPts = []; for (let i = 0; i <= 160; i++) { const u = i / 160, a = u * 2 * Math.PI * 7; coilPts.push([-0.115 + 0.23 * u, 0.95 + 0.035 * Math.sin(a), 0.035 * Math.cos(a)]); }
    const filMat = new THREE.MeshStandardMaterial({ color: '#d9a35c', roughness: 0.5, emissive: '#ffb347', emissiveIntensity: 0 });
    bulb.add(new THREE.Mesh(K.tube(coilPts, 0.011, { segments: 320, radial: 6 }), filMat));
    const bulbLight = new THREE.PointLight('#ffc46b', 0, 0, 2); bulbLight.position.set(0, 0.98, 0); bulb.add(bulbLight);

    // ---- the ammeter: navy box, cream dial, a cyan needle and the reading pressed on below
    const amm = new THREE.Group(); amm.position.set(AMM_X, 0.45, ZF); scene.add(amm);
    amm.add(part(lumpy(K.roundedBox(1.1, 0.9, 0.42, 0.13, 6), { amount: 0.02, size: 0.6, seed: 81, dents: 3, dentSize: 0.25, dentDepth: 0.02 }), M.navy));
    { const d = part(lumpy(new THREE.CylinderGeometry(0.31, 0.31, 0.05, 48, 2).rotateX(Math.PI / 2), { amount: 0.006, size: 0.2, seed: 82 }), M.cream); d.position.set(0, 0.1, 0.215); amm.add(d); }
    const PIVOT = [0, -0.08, 0.25], ANG = (amps) => K.map(amps, 0, 4, -1, 1);
    for (let a = 0; a <= 4; a++) { const tk = part(new THREE.BoxGeometry(0.022, 0.06, 0.02), M.navy), an = ANG(a); tk.position.set(PIVOT[0] + 0.27 * Math.sin(an), PIVOT[1] + 0.27 * Math.cos(an), 0.245); tk.rotation.z = -an; amm.add(tk); }
    { const A = part(lumpy(K.text3d('A', { font: FONT, size: 0.12, depth: 0.03, bevel: 0.008 }), { amount: 0.003, size: 0.1, seed: 83 }), M.navy); A.position.set(0, 0.3, 0.245); amm.add(A); }
    const needle = new THREE.Group(); needle.position.set(...PIVOT); amm.add(needle);
    { const n = part(lumpy(K.roundedBox(0.03, 0.3, 0.025, 0.012, 3).translate(0, 0.14, 0), { amount: 0.004, size: 0.1, seed: 84 }), M.cyan); needle.add(n); const cap = part(new THREE.SphereGeometry(0.035, 16, 12), M.navy); needle.add(cap); }
    const reading = (txt, seed) => { const m = part(lumpy(K.text3d(txt, { font: FONT, size: 0.17, depth: 0.05, bevel: 0.012, bevelSegments: 3 }), { amount: 0.004, size: 0.15, seed }), M.cream); m.position.set(0, -0.3, 0.215); amm.add(m); return m; };
    const readings = [
      { m: reading(AMPS.zero, 85), from: -9, to: T.on + 6 / POSES },
      { m: reading(AMPS.on, 86), from: T.on + 6 / POSES, to: T.swapIn + 8 / POSES },
      { m: reading(AMPS.low, 87), from: T.swapIn + 8 / POSES, to: T.swapOut + 8 / POSES },
    ];
    readings.push({ m: readings[1].m, from: T.swapOut + 8 / POSES, to: 99 });

    // ---- the resistor: an orange roll with bands, swapped in for the plain wire
    const resistor = new THREE.Group(); scene.add(resistor);
    resistor.add(part(lumpy(new THREE.CylinderGeometry(0.17, 0.17, 1.0, 40, 10).rotateX(Math.PI / 2), { amount: 0.014, size: 0.35, seed: 91, dents: 2, dentSize: 0.2, dentDepth: 0.02 }), M.orange));
    [[-0.28, 'navy'], [-0.13, 'cream'], [0.02, 'navy'], [0.3, 'yellow']].forEach(([z, c], i) => { const b = part(lumpy(new THREE.CylinderGeometry(0.177, 0.177, 0.07, 40, 2).rotateX(Math.PI / 2), { amount: 0.005, size: 0.2, seed: 92 + i }), M[c]); b.position.z = z; resistor.add(b); });
    const resHome = [XR, 0.17, 0.4];

    // ---- small cards on the table: a navy slab with the value pressed on, leaning back so it reads from above
    const card = (txt, colour, w, seed) => {
      const g = new THREE.Group();
      g.add(part(lumpy(K.roundedBox(w, 0.5, 0.12, 0.06, 5), { amount: 0.02, size: 0.5, seed, dents: 2, dentSize: 0.2, dentDepth: 0.02 }), M.navy));
      const t = part(lumpy(K.text3d(txt, { font: FONT, size: 0.3, depth: 0.08, bevel: 0.02, bevelSegments: 3 }), { amount: 0.006, size: 0.2, seed: seed + 1 }), M[colour]);
      t.position.z = 0.07; g.add(t); scene.add(g); return g;
    };
    const cards = [
      { g: card(VOLTS + ' V', 'yellow', 1.05, 101), at: [BAT.cx, 0.11, ZF + 0.78], land: T.volts, id: 501 },
      { g: card(R_BULB + ' Ω', 'orange', 1.0, 103), at: [0, 0.11, 0.1], land: T.ohms, id: 502 },
    ];

    // ---- the electrons: cyan beads threaded on the wire
    const segs = LOOP.map((a, i) => { const b = LOOP[(i + 1) % LOOP.length]; return { a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) }; });
    const LOOP_LEN = segs.reduce((s, g) => s + g.len, 0);
    const N_BEADS = 46, BEAD_R = 0.085, SPEED = 0.16;     // world units per second per ampere
    const beads = new THREE.InstancedMesh(lumpy(new THREE.SphereGeometry(BEAD_R, 18, 14), { amount: 0.01, size: 0.08, seed: 7, dents: 1, dentSize: 0.05, dentDepth: 0.01 }), M.cyan, N_BEADS);
    beads.castShadow = beads.receiveShadow = true; scene.add(beads);
    const beadSpin = Array.from({ length: N_BEADS }, () => [rnd.range(0, 6), rnd.range(0, 6), rnd.range(0, 6)]);
    // how far the charge has moved by time t: the current, softened over a quarter second, integrated once here
    const amps = (t) => STEPS.reduce((s, [t0, d]) => s + d * K.smooth(t0, t0 + 0.25, t), 0);
    const DT = 1 / 120, dist = [0];
    for (let i = 1; i <= (DURATION + 1) / DT; i++) dist.push(dist[i - 1] + SPEED * amps(i * DT) * DT);
    const distAt = (t) => { const x = K.clamp(t / DT, 0, dist.length - 1), i = Math.floor(x); return dist[i] + (dist[Math.min(i + 1, dist.length - 1)] - dist[i]) * (x - i); };
    const along = (s) => { s = ((s % LOOP_LEN) + LOOP_LEN) % LOOP_LEN; for (let i = 0; i < segs.length; i++) { const g = segs[i]; if (s <= g.len) { const u = s / g.len; return [K.lerp(g.a[0], g.b[0], u), K.lerp(g.a[1], g.b[1], u), i]; } s -= g.len; } return [LOOP[0][0], LOOP[0][1], 0]; };
    const hidden = (x, z, seg, resIn) => seg === 5 || (seg === 2 && Math.abs(x) < 0.3) || (seg === 4 && Math.abs(x - AMM_X) < 0.56) || (seg === 3 && resIn && z > SLOT[0] - 0.03 && z < SLOT[1] + 0.03);

    // ---- words on the backdrop: every letter its own lump, pressed on one after another (as in the reference)
    const stuck = [];
    const press = (text, size, y, colourAt, landAt, offAt, idBase) => {
      const o = { font: FONT, size, depth: size * 0.25, bevel: size * 0.07, bevelSegments: 4 };
      K.text3dLetters(text, o).forEach((L, i) => {
        const m = part(lumpy(L.geometry, { amount: 0.012 * size / 0.5, size: 0.4, seed: idBase + i, dents: size > 1 ? 2 : 0, dentSize: 0.3, dentDepth: 0.02 }), M[colourAt(L.index)]);
        scene.add(m);
        stuck.push({ m, land: landAt(L.index, i), off: offAt ? offAt(i) : 99, at: [L.x, y + L.y + rnd.range(-0.02, 0.02), WALL], depth: o.depth, tilt: rnd.range(-0.035, 0.035), id: idBase + i });
      });
    };
    // title: OHM'S LAW letter by letter; peeled off before the formula
    press(TITLE, 1.0, 2.75, () => 'yellow', (_, i) => snap(T.title + i / POSES * 1.5), (i) => snap(T.titleOff + i / 30), 600);
    // the formula: one glyph per beat, coloured like the things they stand for
    {
      const text = FORMULA.map((f) => f[0]).join(' '), starts = []; let k = 0;
      FORMULA.forEach((f) => { starts.push(k); k += f[0].length + 1; });
      const which = (idx) => starts.filter((s) => s <= idx).length - 1;
      press(text, 1.3, 3.0, (idx) => FORMULA[which(idx)][1], (idx) => snap(T.formula + 0.27 * which(idx)), null, 700);
    }
    // the worked numbers under it
    {
      const text = EQUATION.map((f) => f[0]).join(' '), starts = []; let k = 0;
      EQUATION.forEach((f) => { starts.push(k); k += f[0].length + 1; });
      const which = (idx) => starts.filter((s) => s <= idx).length - 1;
      press(text, 0.42, 1.78, (idx) => EQUATION[which(idx)][1], (idx) => snap(T.equation + 0.2 * which(idx)), null, 750);
    }

    // ---- camera: one continuous move. Macro on the filament, pull back for the title, reveal the circuit, visit
    // the battery, travel to the resistor, pull back for the formula, end on a slow push-in
    const keys = [
      [0, [0.7, 2.3, 6.6], [0.9, 2.15, -1.6]],
      [1.2, [1.1, 1.35, 3.2], [0.4, 1.1, -0.9]],
      [2.5, [0.3, 1.0, 1.12], [0, 0.95, ZB]],
      [4.6, [0.45, 2.1, 5.0], [0, 1.9, -1.3]],
      [6.3, [-0.5, 3.0, 10.4], [-0.4, 1.25, -0.3]],
      [7.8, [-2.25, 1.95, 5.5], [-1.75, 0.3, 1.55]],
      [9.6, [-1.6, 2.7, 6.6], [-0.3, 0.4, 0.2]],
      [11.3, [3.9, 1.8, 6.0], [2.6, 0.42, 0.9]],
      [13.8, [3.25, 1.55, 5.2], [2.55, 0.42, 1.0]],
      [16.1, [2.2, 2.7, 7.6], [1.1, 0.6, -0.15]],
      [17.7, [0, 2.75, 11.3], [0, 1.85, -0.7]],
      [23.6, [0, 2.65, 10.7], [0, 1.85, -0.7]],
      [25.4, [0.25, 2.6, 12.2], [0, 1.35, -0.7]],
      [30, [0.1, 2.55, 11.6], [0, 1.3, -0.7]],
    ];
    const cam = {
      pos: K.path(keys.map(([t, p]) => [t, p])),
      aim: K.path(keys.map(([t, , a]) => [t, a])),
      ap: K.track([[0, 0.035], [2.5, 0.03], [4.6, 0.045], [6.3, 0.04], [11.3, 0.045], [17.7, 0.035], [30, 0.035]]),
    };

    const SQUASH = (a) => (a === 0 ? [1.2, 0.5] : a === 1 ? [0.93, 1.2] : a === 2 ? [1.03, 0.94] : [1, 1]);
    const hop = (obj, from, to, u, lift, spin) => { const h = 4 * u * (1 - u); obj.position.set(K.lerp(from[0], to[0], u), K.lerp(from[1], to[1], u) + lift * h, K.lerp(from[2], to[2], u)); obj.rotation.set(spin[0] * (1 - u), spin[1] * (1 - u), spin[2] * (1 - u)); };

    return {
      update(t) {
        const tq = pose(t);

        // light: dark room, the bulb, then the lamp comes up. Single frames never get exactly the same exposure.
        const L = K.lerp(0.18, 1, K.smooth(T.lights[0], T.lights[1], t));
        moonLight.intensity = K.lerp(0.9, 0.25, K.smooth(T.lights[0], T.lights[1], t));
        key.intensity = KEY * L * (1 + nudge(1, tq, 0.012));
        sky.intensity = 0.75 * L;
        scene.environmentIntensity = 0.22 * L;

        // current and the bulb: brightness follows power, I^2 R, so half the current gives a quarter of the light
        const I = amps(tq), on = since(tq, T.on);
        const flicker = on < 0 ? 0 : on === 0 ? 1 : on === 1 ? 0.12 : on === 2 ? 0.85 : on === 3 ? 0.35 : 1;
        const b = flicker * Math.pow(Math.max(I, on >= 0 && on < 4 ? I_ON : 0) / I_ON, 2);
        filMat.emissiveIntensity = 7 * b;
        glassMat.emissiveIntensity = 0.32 * b;
        bulbLight.intensity = 9 * b * (1 + nudge(2, tq, 0.03));

        // ammeter: the needle swings to each new current with a little overshoot, on the pose clock
        const shown = STEPS.reduce((s, [t0, d]) => s + d * K.spring(tq - t0, 1.5, 0.3), 0);
        needle.rotation.z = -ANG(shown) + (since(tq, T.on) >= 0 ? nudge(3, tq, 0.01) : 0);
        for (const r of readings) r.m.visible = false;
        for (const r of readings) if (tq >= r.from && tq < r.to) { r.m.visible = true; const s = SQUASH(since(tq, r.from)); r.m.scale.set(s[0], s[0], s[1]); }

        // the swap: resistor hops in as the plain wire flies off (one pose), and the other way round at the end
        const aIn = since(tq, T.swapIn), aOut = since(tq, T.swapOut), resIn = aIn >= 0 && aOut < 0;
        resistor.visible = aIn >= -5 && aOut < 5;
        if (aIn < 0) hop(resistor, [XR + 2.6, 0.5, 1.4], resHome, (aIn + 5) / 5, 1.1, [0.6, 0.9, 0.3]);
        else if (aOut < 0) { resistor.position.set(...resHome); resistor.rotation.set(0, nudge(4, tq, 0.02) * K.clamp(1 - aIn / 5), 0); const s = SQUASH(aIn); resistor.scale.set(s[0], s[1], 1); }
        else hop(resistor, resHome, [XR + 2.8, 0.5, -1.2], Math.min(1, (aOut + 1) / 5), 1.0, [0, 0, 0]);
        if (aIn >= 0 && aOut < 0) resistor.scale.set(...(aIn <= 2 ? [SQUASH(aIn)[0], SQUASH(aIn)[1], 1] : [1, 1, 1]));
        else resistor.scale.set(1, 1, 1);
        slotWire.visible = aIn < 5 || aOut >= -5;
        if (aIn >= 0 && aIn < 5) hop(slotWire, slotHome, [XR + 2.4, 0.3, -0.8], (aIn + 1) / 5, 1.2, [0, 0, 0]), slotWire.rotation.set(0.4 * aIn, 0.9 * aIn, 0);
        else if (aOut >= -5 && aOut < 0) hop(slotWire, [XR + 2.4, 0.3, 1.8], slotHome, (aOut + 5) / 5, 1.1, [0.8, 1.6, 0]);
        else { slotWire.position.set(...slotHome); slotWire.rotation.set(0, 0, 0); }

        // electrons: same speed all round the loop; hidden inside the battery, the socket, the ammeter, the resistor
        const D = distAt(tq), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
        for (let j = 0; j < N_BEADS; j++) {
          const [x, z, seg] = along(j * LOOP_LEN / N_BEADS + D), hide = hidden(x, z, seg, resIn);
          const roll = D / BEAD_R;
          e.set(beadSpin[j][0] + (seg % 2 ? roll : 0), beadSpin[j][1], beadSpin[j][2] + (seg % 2 ? 0 : -roll));
          q.setFromEuler(e); v.set(x, WR + nudge(900 + j, tq, 0.004), z); sc.setScalar(hide ? 1e-4 : 1);
          beads.setMatrixAt(j, m4.compose(v, q, sc));
        }
        beads.instanceMatrix.needsUpdate = true;

        // cards on the table and words on the backdrop: thrown on flat, spring out, settle; peeled off later
        for (const c of cards) {
          const a = since(tq, c.land), s = SQUASH(a), loose = K.clamp(1 - a / 5);
          c.g.visible = a >= 0;
          c.g.position.set(c.at[0] + nudge(c.id, tq, 0.015) * loose, c.at[1], c.at[2] + nudge(c.id + 0.3, tq, 0.015) * loose);
          c.g.rotation.set(-1.15, nudge(c.id + 0.6, tq, 0.05) * loose, 0);
          c.g.scale.set(s[0], s[0], s[1]);
        }
        for (const w of stuck) {
          const a = since(tq, w.land), r = since(tq, w.off), loose = K.clamp(1 - a / 5);
          const s = r >= 0 ? (r === 0 ? [1.08, 0.8] : [0.55, 0.45]) : SQUASH(a);
          w.m.visible = a >= 0 && r < 2;
          w.m.scale.set(s[0], s[0], s[1]);
          w.m.position.set(w.at[0] + nudge(w.id, tq, 0.02) * loose, w.at[1] + nudge(w.id + 0.3, tq, 0.02) * loose, w.at[2] + w.depth * s[1] / 2 - 0.03);
          w.m.rotation.z = w.tilt + nudge(w.id + 0.6, tq, 0.07) * loose;
        }

        // the camera glides in real time; focus on what it looks at
        const p = cam.pos(t), a = cam.aim(t);
        K.look(camera, p, a); K.focus(camera, a, cam.ap(t));
      },

      // captions: small, on a soft plate, bottom left; they arrive on a pose like everything else
      overlay(ctx, t, W, H) {
        const s = W / 1920, tq = pose(t);
        { const r = 54 * s, cx = W - 70 * s - r, cy = H - 64 * s - r; ctx.save(); ctx.globalAlpha = 0.95;
          ctx.fillStyle = '#fbf6ea'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
          ctx.lineWidth = 3 * s; ctx.strokeStyle = '#c9a24a'; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, r - 4 * s, 0, 7); ctx.clip(); const d = (r - 6 * s) * 2; ctx.drawImage(logo, cx - d / 2, cy - d / 2, d, d); ctx.restore(); }
        const plate = (x, y, w, h, alpha) => { ctx.fillStyle = `rgba(14,17,20,${0.55 * alpha})`; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill(); };
        for (const c of CAPTIONS) {
          if (t < c.from || t > c.to) continue;
          const a = since(tq, snap(c.from)), pop = a === 0 ? 1.12 : a === 1 ? 0.97 : 1, alpha = K.clamp((c.to - t) / 0.25);
          ctx.save(); ctx.globalAlpha = alpha;
          ctx.font = `600 ${Math.round(46 * s * pop)}px Fredoka`;
          const w = ctx.measureText(c.text).width, x = 120 * s, y = H - 120 * s;
          plate(x - 30 * s, y - 52 * s, w + 60 * s, 74 * s, 1);
          ctx.fillStyle = '#f6ead2'; ctx.textBaseline = 'alphabetic'; ctx.fillText(c.text, x, y);
          ctx.restore();
        }
        if (t >= ENDCARD.from) {
          const a = since(tq, snap(ENDCARD.from)), alpha = K.clamp((t - ENDCARD.from) / 0.4);
          ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'center';
          ctx.font = `600 ${Math.round(38 * s * (a === 0 ? 1.08 : 1))}px Fredoka`;
          const w1 = ctx.measureText(ENDCARD.line1).width;
          plate(W / 2 - w1 / 2 - 36 * s, H - 156 * s, w1 + 72 * s, 116 * s, 1);
          ctx.fillStyle = '#f6ead2'; ctx.fillText(ENDCARD.line1, W / 2, H - 106 * s);
          ctx.font = `700 ${Math.round(30 * s)}px Fredoka`; ctx.fillStyle = '#e3b65a'; ctx.fillText(ENDCARD.line2, W / 2, H - 60 * s);
          ctx.restore();
        }
      },
    };
  },
};
