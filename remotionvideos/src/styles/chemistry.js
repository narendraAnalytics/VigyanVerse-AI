// The Hidden Chemistry Around Us: a tour of the four Class 10 chemistry chapters, in the Glass and Light style from
// prompt-glasslight.txt. One lab table, four stations; the camera travels along it.
//  1. Chemical reactions (Ch. 1): lead nitrate + potassium iodide -> a yellow precipitate of lead iodide
//     Pb(NO3)2 + 2KI -> PbI2 + 2KNO3 (NCERT's own precipitation example; both solutions start colourless)
//  2. Acids and bases (Ch. 2): a jar of universal indicator (green, neutral) turns red with lemon juice (an acid),
//     then passes neutral and turns violet as sodium hydroxide (a base) is added in excess; vials show pH 0-14
//  3. Metals and non-metals (Ch. 3): iron, copper, aluminium, gold; sodium gives one electron to chlorine
//     (Na+ is smaller than Na, Cl- bigger than Cl); an iron nail in water and air rusts
//  4. Carbon (Ch. 4): one carbon atom, then a chain (catenation), then methane CH4, ethanol C2H5OH, ethanoic acid CH3COOH
import { staticFile } from 'remotion';
import '../kit';
import { makeGlassLab, SHAPES, POUR_AT, LIFT, SPOUT, GRAVITY, fall } from './glasslight.js';

const K = window.K, THREE = window.THREE;

// ---------------------------------------------------------------- content
const TITLE = 'THE HIDDEN CHEMISTRY AROUND US', SUBTITLE = 'Class 10 Chemistry';
const X = [-10.5, -3.5, 3.5, 10.5];                      // the four stations along the table
const PART = 0.55;                                        // height of one part in a jar
const COL = {
  leadNitrate: '#eef4f6', iodide: '#f4f5ec', leadIodide: '#f6c21a',
  indicator: '#b6e7a6', acid: '#f5a08f', basic: '#c0b0f4', lemon: '#f5eda6', soda: '#eef2f6',
};
// universal indicator colours, pH 0 to 14 (red -> orange -> yellow -> green -> blue -> violet)
const PH = ['#e5262d', '#ec3e2b', '#f2652b', '#f6902c', '#f9b72e', '#f3dc38', '#c4d93a', '#5db84a', '#36a06d', '#2d8f9e', '#2e72b8', '#3a55ae', '#4b409e', '#5a3290', '#6a2a80'];
export const T = {
  title: [0, 2.5],
  pour1: [0.7, 2.1], pour2: [2.9, 4.3], equation: 4.5,
  vials: [7.7, 8.9], lemon: [8.6, 9.5], soda: [10.3, 11.8], regions: 9.2,
  metals: 13.4, atoms: 14.6, transfer: [15.6, 16.6], ions: 16.7, rust: [17.6, 19.6],
  carbon: 20.4, chain: [21.0, 22.4], molecules: [22.9, 24.0, 25.1],
  wide: 27.2, end: 27.8,
};
const CAPTIONS = [
  [2.6, 6.9, 'CHEMICAL REACTIONS', COL.leadIodide],
  [7.2, 12.9, 'ACIDS • BASES • pH', '#e5262d'],
  [13.2, 19.9, 'METALS & NON-METALS', '#c46f45'],
  [20.2, 26.9, 'THE WORLD OF CARBON', '#9aa3ad'],
];
const EQUATION = [['Pb(NO₃)₂', '#f6f3ec'], ['+', '#f6f3ec'], ['2KI', '#f6f3ec'], ['→', '#f6f3ec'], ['PbI₂', COL.leadIodide], ['+', '#f6f3ec'], ['2KNO₃', '#f6f3ec']];
const ENDCARD = ['VIGYANVERSE AI', 'UNDERSTAND. VISUALIZE. DISCOVER.'];
const DURATION = 30;

// the pours: which jar, how much, when; the bottle stands at [x, z]
const POURS = [
  { jar: 0, before: 0, parts: 1.3, pour: T.pour1, bottle: 'cruet', at: [X[0] - 2.7, 0.5], tint: COL.leadNitrate, stream: 0.05 },
  { jar: 0, before: 1.3, parts: 1.3, pour: T.pour2, bottle: 'tall', at: [X[0] + 2.7, -1.0], tint: COL.iodide, stream: 0.06 },
  { jar: 1, before: 2.0, parts: 0.6, pour: T.lemon, bottle: 'cruet', at: [X[1] - 2.6, 0.5], tint: COL.lemon, stream: 0.045 },
  { jar: 1, before: 2.6, parts: 1.0, pour: T.soda, bottle: 'tall', at: [X[1] - 2.3, -2.4], tint: COL.soda, stream: 0.06 },
];

// ---------------------------------------------------------------- molecules (ball and stick, bond length about 0.55)
const n3 = (v, k = 0.5) => { const l = Math.hypot(...v); return v.map((c) => (c / l) * k); };
const add = (a, b) => a.map((c, i) => c + b[i]);
const TET = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((v) => n3(v, 0.55));
const C1 = [-0.45, -0.1, 0], C2 = [0, 0.22, 0];
const methylH = [[-0.6, -0.45, 0], [-0.15, -0.4, 0.75], [-0.15, -0.4, -0.75]].map((v) => add(C1, n3(v)));
const MOLECULES = [
  { name: 'Methane', formula: 'CH₄', atoms: [['C', [0, 0, 0]], ...TET.map((p) => ['H', p])], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] },
  { name: 'Ethanol', formula: 'C₂H₅OH',
    atoms: [['C', C1], ['C', C2], ['O', [0.5, -0.1, 0]], ['H', [0.88, 0.16, 0]], ...methylH.map((p) => ['H', p]), ['H', add(C2, n3([0.05, 0.45, 0.7]))], ['H', add(C2, n3([0.05, 0.45, -0.7]))]],
    bonds: [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8]] },
  { name: 'Ethanoic acid', formula: 'CH₃COOH',
    atoms: [['C', C1], ['C', C2], ['O', [0.02, 0.76, 0]], ['O', [0.5, -0.1, 0]], ['H', [0.88, 0.16, 0]], ...methylH.map((p) => ['H', p])],
    bonds: [[0, 1], [1, 2, 2], [1, 3], [3, 4], [0, 5], [0, 6], [0, 7]] },     // [a, b, 2] = a double bond
];
const CHAIN = [[-0.9, 0, 0], [-0.3, 0.32, 0], [0.3, 0, 0], [0.9, 0.32, 0]];
const ATOM = { C: { r: 0.21, col: '#2a2c30', clear: 0.25 }, H: { r: 0.13, col: '#f3f5f8', clear: 0.9 }, O: { r: 0.19, col: '#e2433a', clear: 0.55 } };

// sound cues (story time): gentle Remotion effects on the same schedule as the picture
export const SOUND_CUES = (() => {
  const c = [];
  for (const p of POURS) c.push([p.pour[0] - LIFT + 0.1, 'whoosh', 0.07]);
  c.push([T.pour2[0] + 0.45, 'ding', 0.16]);                 // the yellow solid appears
  c.push([T.lemon[0] + 0.5, 'ding', 0.12], [T.soda[1] - 0.2, 'ding', 0.12]);
  for (let i = 0; i < 4; i++) c.push([T.metals + i * 0.22 + 0.3, 'mouse-click', 0.16]);
  c.push([T.transfer[0], 'whoosh', 0.1], [T.ions, 'ding', 0.14]);
  c.push([T.carbon, 'ding', 0.1]);
  for (let i = 1; i < 4; i++) c.push([T.chain[0] + i * 0.45, 'mouse-click', 0.14]);
  for (const t of T.molecules) c.push([t + 0.2, 'mouse-click', 0.18]);
  c.push([T.wide - 0.4, 'whoosh', 0.1], [T.end + 0.2, 'ding', 0.16]);
  return c;
})();

export const chemistryStyle = {
  id: 'glass-light-chemistry',
  name: 'Glass and Light: the hidden chemistry around us',
  topic: 'Class 10 chemistry in four stations',
  duration: DURATION,
  fonts: ['600 62px "Inter"', '700 190px "Inter"'],
  render: { samples: 24, shutter: 0.5, tone: 'neutral', exposure: 1.0, bloom: 0.55, bloomThreshold: 1.0, vignette: 0.3, grain: 0.012, fov: 30, background: '#0a0b0d' },

  async build(S) {
    const { scene, camera } = S;
    const lab = makeGlassLab(S), FLOOR = SHAPES.jar.liquid[0][1], PV = Math.PI * SHAPES.jar.radius ** 2 * PART;
    const logo = await new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = staticFile('logo.png'); });
    const flow = (u) => (u + K.smooth(0, 1, u)) / 2;
    const col = (c) => new THREE.Color(c);

    // ---------------- the two jars and their pouring bottles (stations 1 and 2)
    const jars = [
      lab.vessel(SHAPES.jar, COL.leadNitrate, COL.leadNitrate, COL.leadIodide),
      lab.vessel(SHAPES.jar, COL.indicator, COL.indicator, COL.indicator),
    ];
    jars.forEach((j, i) => { j.position.set(X[i], 0, 0); scene.add(j); });
    // measure marks on both jars
    jars.forEach((jar) => {
      const y0 = 0.3, y1 = 2.85, tex = K.canvasTex(512, 2048, (ctx, w, h) => {
        const Y = (y) => h * (1 - (y - y0) / (y1 - y0));
        ctx.fillStyle = '#ffffff'; ctx.font = '700 190px "Inter"'; ctx.textBaseline = 'middle';
        for (let k = 1; k <= 8; k++) { const y = Y(FLOOR + k * PART / 2), whole = k % 2 === 0; ctx.fillRect(30, y - (whole ? 11 : 7), whole ? 200 : 100, whole ? 22 : 14); if (whole) ctx.fillText(String(k / 2), 268, y + 8); }
      });
      const marks = new THREE.Mesh(new THREE.CylinderGeometry(1.306, 1.306, y1 - y0, 48, 1, true, -0.92, 0.62), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: new THREE.Color(0.92, 0.94, 0.94) }));
      marks.position.y = (y0 + y1) / 2; jar.add(marks);
    });
    const bottles = POURS.map((p) => {
      const shape = SHAPES[p.bottle], g = lab.vessel(shape, p.tint, p.tint), side = Math.sign(p.at[0] - X[p.jar]);
      scene.add(g);
      const lean = lab.leaning(shape), left = lean.full - p.parts * PV, angles = Array.from({ length: 13 }, (_, i) => lean.angle(K.lerp(left, lean.full, i / 12)));
      const delay = fall(POUR_AT[1] - FLOOR - p.before * PART);
      return Object.assign(g.userData, { g, side, lean, left, delay, lay: lab.stream(p.tint), angle: (V) => { const x = K.clamp((V - left) / (lean.full - left)) * 12, i = Math.min(11, Math.floor(x)); return K.lerp(angles[i], angles[i + 1], x - i); } });
    });
    // one bottle's pour at time t (the reference's choreography, for a jar standing at x = jx): returns what arrived
    function pour(p, b, t) {
      const jx = X[p.jar], shape = b.shape, [a, z] = p.pour, V = b.lean.full - flow(K.seg(t, a, z)) * p.parts * PV;
      const go = K.seg(t, a - LIFT, a, K.ease.inOut) * (1 - K.seg(t, z + 0.2, z + 0.2 + LIFT, K.ease.inOut));
      const lean = b.angle(V) * K.smooth(0.12, 1, go), phi = b.side * lean, cs = Math.cos(phi), sn = Math.sin(phi);
      const lip = [K.lerp(p.at[0] - b.side * shape.lip[0], jx + b.side * POUR_AT[0], K.smooth(0.1, 1, go)), K.lerp(shape.lip[1], POUR_AT[1], K.smooth(0, 0.75, go)) + 0.5 * Math.sin(Math.PI * go) * (1 - go), K.lerp(p.at[1], 0, go)];
      const lx = -b.side * shape.lip[0], ly = shape.lip[1];
      b.g.position.set(lip[0] - (lx * cs - ly * sn), lip[1] - (lx * sn + ly * cs), lip[2]); b.g.rotation.z = phi;
      b.u.uAxis.value.set(-sn, cs, 0); b.u.uBase.value.copy(b.g.position).addScaledVector(b.u.uAxis.value, b.floor);
      b.u.uLevel.value = b.g.position.y + b.lean.level(lean, V); b.u.uMen.value = 0.04 * (1 - K.smooth(0, 0.2, lean));
      const arriving = K.seg(t, a + b.delay, a + b.delay + 0.12) * (1 - K.seg(t, z + b.delay - 0.05, z + b.delay + 0.5, K.ease.out));
      const got = flow(K.seg(t - b.delay, a, z)) * p.parts, level = FLOOR + (p.before + got) * PART, vel = [-sn * SPOUT, cs * SPOUT];
      const sLand = fall(lip[1] - level + 0.05, vel[1]);
      b.lay(lip, vel, Math.max(0, t - z), Math.min(t - a, sLand), (s) => { const born = t - s, speed = Math.hypot(vel[0], vel[1] - GRAVITY * s);
        return p.stream * K.smooth(a, a + 0.14, born) * (1 - K.smooth(z - 0.16, z, born)) * (0.45 + 0.55 * Math.sqrt(SPOUT / speed)) * (1 + 0.08 * Math.sin(s * 40 - t * 23)); });
      return { got, arriving, landX: lip[0] + vel[0] * sLand };
    }

    // ---------------- station 2: a row of vials showing the pH scale, 0 to 14
    const vialShape = [[0, 0], [0.22, 0, 0.06], [0.22, 1.05, 0.02], [0.25, 1.09, 0.02], [0.25, 1.13], [0.18, 1.13], [0.18, 0.06, 0.05], [0, 0.06]];
    const vialGeo = lab.turn(vialShape, 48), vialLiquidGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.62, 32);
    const vials = PH.map((c, i) => {
      const g = new THREE.Group(), shell = new THREE.Mesh(vialGeo, lab.glass);
      const tint = col(c).lerp(col('#ffffff'), 0.18), liq = new THREE.Mesh(vialLiquidGeo, new THREE.MeshStandardMaterial({ color: tint, roughness: 0.25, emissive: tint, emissiveIntensity: 0.35 }));
      liq.position.y = 0.38; g.add(liq, shell); g.position.set(X[1] - 2.8 + i * 0.4, 0, 2.15); scene.add(g);
      lab.castLight(shell, { tint: '#e9f6f1', rim: 0.62, focus: 0.3 }); lab.castLight(liq, { tint: c, gain: 3, rim: 0.6 });
      return g;
    });

    // ---------------- station 3: four metals, a sodium atom and a chlorine atom, a nail rusting in water
    const metalMats = [
      ['Iron', new THREE.MeshStandardMaterial({ color: '#5d6064', metalness: 1, roughness: 0.42 })],
      ['Copper', new THREE.MeshStandardMaterial({ color: '#c8724a', metalness: 1, roughness: 0.3 })],
      ['Aluminium', new THREE.MeshStandardMaterial({ color: '#cfd3d8', metalness: 1, roughness: 0.32 })],
      ['Gold', new THREE.MeshStandardMaterial({ color: '#e6b440', metalness: 1, roughness: 0.24 })],
    ];
    const ingotGeo = K.roundedBox(0.95, 0.34, 0.55, 0.08, 4);
    const metals = metalMats.map(([, m], i) => { const o = new THREE.Mesh(ingotGeo, m); o.position.set(X[2] - 1.65 + i * 1.1, 0.17, 1.55); scene.add(o); lab.castLight(o, { gain: 0.02, rim: 1 }); return o; });
    const atomMat = (c, clear, glow = 0) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.08, metalness: 0, transmission: clear, thickness: 0.6, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.05, emissive: col(c), emissiveIntensity: glow });
    const NA = [X[2] - 1.15, 3.05, -0.5], CL = [X[2] + 1.15, 3.05, -0.5];
    const na = new THREE.Mesh(new THREE.SphereGeometry(0.46, 48, 32), atomMat('#a27ddc', 0.6, 0.15)), cl = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), atomMat('#7fd65e', 0.6, 0.15));
    na.position.set(...NA); cl.position.set(...CL); scene.add(na, cl);
    lab.castLight(na, { tint: '#c9b2f0', gain: 1.6, rim: 0.6, focus: 0.4 }); lab.castLight(cl, { tint: '#b4ef9c', gain: 1.6, rim: 0.6, focus: 0.4 });
    const ringMat = new THREE.MeshStandardMaterial({ color: '#dfe7ee', metalness: 0.2, roughness: 0.2, emissive: col('#9fd8ff'), emissiveIntensity: 0.35, transparent: true, opacity: 0.55 });
    const naRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.012, 8, 96), ringMat), clRing = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.012, 8, 96), ringMat);
    naRing.position.set(...NA); clRing.position.set(...CL); scene.add(naRing, clRing);
    const electron = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), new THREE.MeshBasicMaterial({ color: col('#9ff0ff').multiplyScalar(3) })); scene.add(electron);
    // the rusting nail: a small beaker with a little water, the nail leaning in it (most of it in air, as rust needs both)
    const beakerShape = { glass: SHAPES.jar.glass.slice(0, 2).concat([[0.62, 1.7, 0.1], [0.66, 1.75, 0.02], [0.66, 1.8], [0.57, 1.8], [0.57, 0.18, 0.12], [0, 0.18]]), liquid: [[0, 0.19], [0.55, 0.19, 0.1], [0.55, 1.78], [0, 1.78]], radius: 0.55 };
    beakerShape.glass[1] = [0.62, 0, 0.14];
    const beaker = lab.vessel(beakerShape, '#eef4f6', '#eef4f6'); beaker.position.set(X[2] + 2.85, 0, -0.9); scene.add(beaker);
    const bu = beaker.userData.u; bu.uBase.value.set(X[2] + 2.85, 0.19, -0.9); bu.uLevel.value = 0.62; bu.uMen.value = 0.03;
    const nailMat = new THREE.MeshStandardMaterial({ color: '#8d9298', metalness: 1, roughness: 0.38 });
    const nail = new THREE.Group();
    { const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.75, 16), nailMat); shaft.position.y = 0.875 + 0.1;
      const tipC = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 16), nailMat); tipC.rotation.x = Math.PI; tipC.position.y = 0.05;
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24), nailMat); head.position.y = 1.87; nail.add(shaft, tipC, head); }
    nail.position.set(X[2] + 2.75, 0.2, -0.9); nail.rotation.z = -0.26; scene.add(nail); lab.castLight(nail.children[0], { gain: 0.02, rim: 1 });
    const steelCol = col('#8d9298'), rustCol = col('#8a3d16');

    // ---------------- station 4: carbon. Atoms are glass marbles, bonds are thin glass rods
    const atomMesh = (el, glow = 0) => { const a = ATOM[el], m = new THREE.Mesh(new THREE.SphereGeometry(a.r, 32, 24), atomMat(a.col, a.clear, glow)); lab.castLight(m, { tint: el === 'C' ? '#888888' : a.col, gain: el === 'C' ? 0.6 : 1.3, rim: 0.6 }); return m; };
    const bondMat = new THREE.MeshPhysicalMaterial({ color: '#dfe4ea', roughness: 0.1, transmission: 0.7, thickness: 0.2, clearcoat: 1 });
    const bondMesh = (a, b, off = 0) => {
      const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 12), bondMat);
      m.position.copy(va).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); m.scale.y = d.length();
      if (off) { const side = new THREE.Vector3(0, 0, 1).cross(d).normalize().multiplyScalar(off); m.position.add(side); }
      return m;
    };
    const chain = new THREE.Group(); chain.position.set(X[3], 3.25, -0.9); scene.add(chain);
    const chainAtoms = CHAIN.map((p) => { const m = atomMesh('C', 0.2); m.position.set(...p); chain.add(m); return m; });
    const chainBonds = CHAIN.slice(1).map((p, i) => { const m = bondMesh(CHAIN[i], p); chain.add(m); return m; });
    const molecules = MOLECULES.map((mol, mi) => {
      const g = new THREE.Group(); g.position.set(X[3] - 2.3 + mi * 2.3, 1.35, 0.7); scene.add(g);
      const atoms = mol.atoms.map(([el, p]) => { const m = atomMesh(el); m.position.set(...p); g.add(m); return m; });
      const bonds = mol.bonds.flatMap(([a, b, n]) => (n === 2 ? [bondMesh(mol.atoms[a][1], mol.atoms[b][1], 0.05), bondMesh(mol.atoms[a][1], mol.atoms[b][1], -0.05)] : [bondMesh(mol.atoms[a][1], mol.atoms[b][1])]).map((m) => { g.add(m); return m; }));
      return { g, atoms, bonds, mol };
    });

    // ---------------- camera: one continuous dolly along the table, then back for the whole lab
    const keys = [
      [0, [X[0] - 0.9, 5.2, 14.4], [X[0] + 0.1, 2.3, 0]],
      [6.6, [X[0] + 0.5, 4.7, 12.8], [X[0], 2.0, 0]],
      [7.9, [X[1] - 0.4, 4.4, 12.4], [X[1], 1.75, 0.4]],
      [12.6, [X[1] + 0.5, 4.2, 11.9], [X[1], 1.7, 0.4]],
      [13.9, [X[2] - 0.2, 4.7, 12.4], [X[2] + 0.5, 2.0, 0]],
      [19.6, [X[2] + 0.6, 4.5, 11.8], [X[2] + 0.7, 1.95, 0]],
      [20.9, [X[3] - 0.4, 4.5, 12.0], [X[3], 2.1, 0]],
      [26.6, [X[3] + 0.3, 4.3, 11.4], [X[3], 2.0, 0]],
      [28.4, [0.3, 5.0, 28.6], [0.3, 2.3, 0]],
      [30, [0.3, 4.9, 27.8], [0.3, 2.3, 0]],
    ];
    const cam = { pos: K.path(keys.map(([t, p]) => [t, p])), aim: K.path(keys.map(([t, , a]) => [t, a])), lens: K.track([[0, 0.025], [26.6, 0.03], [28.4, 0.02], [30, 0.02]]) };
    const sunAz = K.track([[0, -0.45], [DURATION, 0.15, 'inOut']]), SUN_EL = 0.72;
    const pop = (t, t0, d = 0.35) => K.ease.outBack(K.seg(t, t0, t0 + d));
    const _v = new THREE.Vector3();
    const toScreen = (p, W, H) => { _v.set(p[0], p[1], p[2]).project(camera); return [(_v.x * 0.5 + 0.5) * W, (-_v.y * 0.5 + 0.5) * H, _v.z < 1]; };

    return {
      update(t) {
        // --- pours into both jars
        const res = POURS.map((p, i) => pour(p, bottles[i], t));
        jars.forEach((jar, ji) => {
          const ju = jar.userData.u, mine = POURS.map((p, i) => [p, res[i]]).filter(([p]) => p.jar === ji);
          const parts = (ji === 1 ? 2.0 : 0) + mine.reduce((s, [, r]) => s + r.got, 0);
          const ring = mine.reduce((s, [, r]) => s + r.arriving, 0), land = mine.find(([, r]) => r.arriving > 0);
          ju.uBase.value.set(X[ji], FLOOR, 0); ju.uLevel.value = FLOOR + parts * PART; ju.uMen.value = 0.05 * K.smooth(0, 0.15, parts); ju.uSplit.value = -1e3;
          ju.uRing.value.set(land ? land[1].landX : X[ji], 0, 0.03 * ring, 0);
          jar.userData.body.visible = parts > 0.002;
        });
        // jar 1: the yellow solid forms where the iodide lands, and soon fills the jar
        const j1 = jars[0].userData.u; j1.uCloud.value = 0.95 * K.smooth(0, 0.6, res[1].got);
        // jar 2: green -> red (acid) -> through green -> violet (excess base)
        const j2 = jars[1].userData.u, acid = K.smooth(0, 0.3, res[2].got), base = K.clamp(res[3].got / 1.0);
        const c2 = col(COL.indicator).lerp(col(COL.acid), acid);
        if (base > 0) { if (base < 0.45) c2.copy(col(COL.acid)).lerp(col(COL.indicator), base / 0.45); else c2.copy(col(COL.indicator)).lerp(col(COL.basic), (base - 0.45) / 0.55); }
        j2.uTintA.value.copy(c2); j2.uTintB.value.copy(c2); j2.uCastA.value.copy(lab.castColour(c2.getStyle(), 9)); j2.uCastB.value.copy(j2.uCastA.value);
        // the pH vials rise out of the table one after another
        vials.forEach((v, i) => { const k = K.seg(t, T.vials[0] + i * (T.vials[1] - T.vials[0]) / 15, T.vials[0] + (i + 1.6) * (T.vials[1] - T.vials[0]) / 15, K.ease.out); v.position.y = -1.3 * (1 - k); v.visible = k > 0; });

        // --- metals settle onto the table
        metals.forEach((m, i) => { const t0 = T.metals + i * 0.22, k = K.seg(t, t0, t0 + 0.32, K.ease.in), b = t > t0 + 0.32 ? 0.04 * Math.exp(-(t - t0 - 0.32) * 10) * Math.abs(Math.sin((t - t0 - 0.32) * 22)) : 0; m.visible = t > t0; m.position.y = 0.17 + 1.6 * (1 - k) + b; });
        // --- sodium gives its outer electron to chlorine; the ions change size
        const at = pop(t, T.atoms, 0.5); for (const o of [na, cl, naRing, clRing]) { o.visible = t > T.atoms; }
        const ion = K.smooth(T.ions - 0.2, T.ions + 0.5, t);
        na.scale.setScalar(at * K.lerp(1, 0.74, ion)); cl.scale.setScalar(at * K.lerp(1, 1.16, ion));
        naRing.scale.setScalar(at * K.lerp(1, 0.001, ion)); naRing.visible = ion < 0.98 && t > T.atoms; clRing.scale.setScalar(at * K.lerp(1, 1.12, ion));
        const [e0, e1] = T.transfer, w = t * 3.1;
        if (t < e0) electron.position.set(NA[0] + 0.8 * Math.cos(w), NA[1] + 0.8 * Math.sin(w), NA[2]);
        else if (t < e1) { const u = K.ease.inOut(K.seg(t, e0, e1)), a = [NA[0] + 0.8 * Math.cos(e0 * 3.1), NA[1] + 0.8 * Math.sin(e0 * 3.1)], b = [CL[0] - 0.88, CL[1]];
          electron.position.set(K.lerp(a[0], b[0], u), K.lerp(a[1], b[1], u) + 0.7 * Math.sin(Math.PI * u), NA[2]); }
        else { const ang = Math.PI + (t - e1) * 2.6, r = 0.88 * K.lerp(1, 1.12, ion); electron.position.set(CL[0] + r * Math.cos(ang), CL[1] + r * Math.sin(ang), CL[2]); }
        electron.visible = t > T.atoms + 0.2;
        // --- the nail rusts where air and water meet it
        const rust = K.smooth(T.rust[0], T.rust[1], t); nailMat.color.copy(steelCol).lerp(rustCol, rust); nailMat.roughness = K.lerp(0.38, 0.9, rust); nailMat.metalness = K.lerp(1, 0.3, rust);
        bu.uTintA.value.copy(col('#eef4f6').lerp(col('#f1d9bb'), rust * 0.7)); bu.uTintB.value.copy(bu.uTintA.value);

        // --- carbon: one atom glows, a chain grows, then three molecules assemble and turn slowly
        chainAtoms.forEach((m, i) => { const t0 = i === 0 ? T.carbon : T.chain[0] + i * 0.45, k = pop(t, t0); m.visible = t > t0; m.scale.setScalar(Math.max(k, 0.001)); m.material.emissiveIntensity = 0.2 + 0.9 * Math.exp(-Math.max(0, t - t0) * 2.5); });
        chainBonds.forEach((m, i) => { const t0 = T.chain[0] + (i + 1) * 0.45 + 0.1; m.visible = t > t0; m.scale.x = m.scale.z = K.seg(t, t0, t0 + 0.25); });
        chain.rotation.y = 0.25 * Math.sin(t * 0.4);
        molecules.forEach(({ g, atoms, bonds }, mi) => {
          const t0 = T.molecules[mi];
          atoms.forEach((m, k) => { const tk = t0 + k * 0.06; m.visible = t > tk; m.scale.setScalar(Math.max(pop(t, tk, 0.3), 0.001)); });
          bonds.forEach((m) => { const tk = t0 + 0.25; m.visible = t > tk; });
          g.rotation.y = (t - t0) * 0.5; g.visible = t > t0;
        });

        // --- lamp, light on the table, camera
        const az = sunAz(t);
        lab.renderLight([Math.sin(az) * Math.cos(SUN_EL), Math.sin(SUN_EL), -Math.cos(az) * Math.cos(SUN_EL)], t);
        const a = cam.aim(t); K.look(camera, cam.pos(t), a); K.focus(camera, a, cam.lens(t));
      },

      // captions top left (the reference's style), the title, the equation, labels that follow their objects, logo
      overlay(ctx, t, W, H) {
        const s = W / 1920, shadow = () => { ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 20 * s; ctx.shadowOffsetY = 2 * s; };
        ctx.save(); ctx.textBaseline = 'middle';
        // title, on screen from the first frame
        const ta = 1 - K.seg(t, T.title[1] - 0.4, T.title[1]);
        if (ta > 0) { ctx.globalAlpha = ta; shadow(); ctx.textAlign = 'center'; ctx.fillStyle = '#f6f3ec';
          ctx.font = `700 ${Math.round(70 * s)}px Inter`; ctx.fillText(TITLE, W / 2, 120 * s);
          ctx.font = `600 ${Math.round(34 * s)}px Inter`; ctx.fillStyle = '#e9c46a'; ctx.fillText(SUBTITLE, W / 2, 182 * s); }
        ctx.textAlign = 'left';
        for (const [a, b, text, dot] of CAPTIONS) {
          const k = K.seg(t, a, a + 0.3, K.ease.out) * (1 - K.seg(t, b - 0.25, b)); if (k <= 0) continue;
          ctx.font = `600 ${Math.round(62 * s)}px Inter`; const x = 96 * s, y = (92 + (1 - K.seg(t, a, a + 0.3, K.ease.out)) * 14) * s;
          ctx.globalAlpha = k; shadow();
          ctx.fillStyle = dot; ctx.beginPath(); ctx.arc(x + 17 * s, y + s, 17 * s, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f6f3ec'; ctx.fillText(text, x + 56 * s, y);
        }
        // the balanced equation, one term at a time
        if (t > T.equation && t < 6.9) {
          ctx.font = `600 ${Math.round(48 * s)}px Inter`; const gap = 18 * s, ws = EQUATION.map(([e]) => ctx.measureText(e).width), total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
          let x = W / 2 - total / 2; const y = 200 * s, out = 1 - K.seg(t, 6.6, 6.9);
          EQUATION.forEach(([e, c], i) => { const k = K.seg(t, T.equation + i * 0.22, T.equation + i * 0.22 + 0.25) * out; ctx.globalAlpha = k; shadow(); ctx.fillStyle = c; ctx.fillText(e, x, y + (1 - k) * 10 * s); x += ws[i] + gap; });
          const k = K.seg(t, T.equation + 1.7, T.equation + 2.0) * out; ctx.globalAlpha = k; ctx.font = `600 ${Math.round(30 * s)}px Inter`; ctx.fillStyle = COL.leadIodide; ctx.textAlign = 'center';
          ctx.fillText('lead iodide: a yellow solid (precipitate)', W / 2, y + 56 * s); ctx.textAlign = 'left';
        }
        // labels that sit by their objects
        const label = (text, p, from, to, c = '#f6f3ec', size = 30, align = 'center') => {
          const k = K.seg(t, from, from + 0.3) * (1 - K.seg(t, to - 0.3, to)); if (k <= 0) return;
          const [sx, sy, front] = toScreen(p, W, H); if (!front) return;
          ctx.globalAlpha = k; shadow(); ctx.font = `600 ${Math.round(size * s)}px Inter`; ctx.textAlign = align; ctx.fillStyle = c; ctx.fillText(text, sx, sy); ctx.textAlign = 'left';
        };
        label('ACIDIC', [X[1] - 1.6, 1.3, 2.15], T.regions, 12.9, '#ff7a4a', 36); label('NEUTRAL', [X[1], 1.3, 2.15], T.regions + 0.2, 12.9, '#8fe07a', 36); label('BASIC', [X[1] + 1.6, 1.3, 2.15], T.regions + 0.4, 12.9, '#b9abff', 36);
        label('0', [X[1] - 2.8, -0.22, 2.4], T.vials[1], 12.9, '#f6f3ec', 24); label('7', [X[1], -0.22, 2.4], T.vials[1], 12.9, '#f6f3ec', 24); label('14', [X[1] + 2.8, -0.22, 2.4], T.vials[1], 12.9, '#f6f3ec', 24);
        metalMats.forEach(([name], i) => label(name, [X[2] - 1.65 + i * 1.1, -0.2, 1.9], T.metals + 0.5 + i * 0.22, 19.9, '#f6f3ec', 24));
        const ionOn = t > T.ions + 0.2;
        label(ionOn ? 'Na⁺' : 'Na', [NA[0], NA[1] + 1.05, NA[2]], T.atoms + 0.3, 19.9, '#d2bdf5', 34); label(ionOn ? 'Cl⁻' : 'Cl', [CL[0], CL[1] + 1.12, CL[2]], T.atoms + 0.3, 19.9, '#bdf0a8', 34);
        label('e⁻', [electron.position.x, electron.position.y + 0.25, electron.position.z], T.transfer[0] - 0.6, T.transfer[1] + 0.3, '#9ff0ff', 26);
        label('Rust: iron + air + water', [X[2] + 2.85, 2.6, -0.9], T.rust[0] + 0.6, 19.9, '#e7a374', 24);
        label('a chain of carbon atoms', [X[3], 2.55, -0.9], T.chain[0] + 0.6, 26.9, '#cfd5dc', 26);
        MOLECULES.forEach((m, i) => label(`${m.name}  ${m.formula}`, [X[3] - 2.3 + i * 2.3, 0.35, 0.7], T.molecules[i] + 0.4, 26.9, '#f6f3ec', 26));
        // end card
        if (t > T.end) { const k = K.seg(t, T.end, T.end + 0.5); ctx.globalAlpha = k; shadow(); ctx.textAlign = 'center';
          ctx.font = `700 ${Math.round(58 * s)}px Inter`; ctx.fillStyle = '#f6f3ec'; ctx.fillText(ENDCARD[0], W / 2, 118 * s);
          ctx.font = `600 ${Math.round(30 * s)}px Inter`; ctx.fillStyle = '#e9c46a'; ctx.fillText(ENDCARD[1], W / 2, 172 * s); }
        ctx.restore();
        // logo badge, bottom right
        { const r = 54 * s, cx = W - 70 * s - r, cy = H - 64 * s - r; ctx.save(); ctx.globalAlpha = 0.95;
          ctx.fillStyle = '#fbf6ea'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.lineWidth = 3 * s; ctx.strokeStyle = '#c9a24a'; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, r - 4 * s, 0, 7); ctx.clip(); const d = (r - 6 * s) * 2; ctx.drawImage(logo, cx - d / 2, cy - d / 2, d, d); ctx.restore(); }
      },
    };
  },
};
