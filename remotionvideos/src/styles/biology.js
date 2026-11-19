// The Science of Life: a tour of Class 10 biology in the Exploded View style from prompt-explodedview.txt. One pale
// seamless floor, four stations; the camera travels along it in one continuous move, every station comes apart
// into parts with numbered ink-blue callouts and goes back together.
//  1. A plant cell comes apart: cell wall, nucleus, vacuole, chloroplast, mitochondrion.
//  2. Life processes (Ch. 5) on those same parts: sunlight, CO2 and water go into the chloroplast and glucose and
//     oxygen come out (photosynthesis); glucose and oxygen go into the mitochondrion and energy comes out, with
//     CO2 and water (respiration). (The script's digestive system and lungs are anatomy: left to the NCERT figures.)
//  3. Control and coordination (Ch. 6): a reflex as a schematic (finger near a hot plate -> sensory neuron ->
//     spinal cord -> motor neuron -> muscle pulls the finger away), then a shoot bending towards light
//     (phototropism, the plant hormone auxin).
//  4. Reproduction (Ch. 7) and heredity (Ch. 8): a flower comes apart (sepal, petal, stamen, carpel); pollen lands
//     on the stigma, a pollen tube grows to the ovule, petals and stamens fall, the ovule becomes a seed; DNA.
//  5. Our environment (Ch. 13): an energy pyramid (producers, herbivores, carnivores) fed by the sun, only about
//     10% of the energy passing to each next level, decomposers; then the camera rises over all four stations.
import { staticFile } from 'remotion';
import '../kit';
import { INK, INK_DARK, PAPER, turned, turnedUp, helix, studio, aimLights, finishes, makeCallouts, apart } from './explodedview.js';

const K = window.K, THREE = window.THREE;

// ---------------------------------------------------------------- content
const TITLE = 'THE SCIENCE OF LIFE', SUBTITLE = 'BIOLOGY';
const XA = 0, XB = 20, XC = 40, XD = 60;                 // the four stations along the floor
const DURATION = 49.3;
export const BEATS = [0, 9.8, 17.2, 25.3, 35.3, DURATION];
export const T = {
  cellOpen: 2.2, cellLabels: 3.0, cellHome: 15.9, sunlight: 9.2,
  co2: 10.2, h2o: 10.5, made: 11.9, toMito: [12.8, 13.9], fire: 14.0, waste: [14.2, 15.1],
  lower: [17.6, 18.6], sens: [18.7, 19.5], motor: [19.6, 20.3], jerk: 20.3, lamp: 22.3, bend: [22.6, 24.4],
  flowerOpen: 26.0, flowerLabels: 26.5, flowerHome: 29.0, pollen: [29.6, 30.1], tube: [30.1, 30.9], fert: 30.9, fall: [31.2, 32.0], seed: [31.5, 32.2],
  dna: [32.2, 33.4],
  tiersOpen: 36.0, tierLabels: 36.6, sun: 35.6, hops: [[37.8, 38.4], [38.6, 39.2], [39.4, 40.0]], decomp: [40.3, 41.0], tiersHome: 41.8,
  aerial: [42.2, 45.2], line: [43.2, 44.8], end: 45.4,
};
const CAPTIONS = [
  [9.8, 17.0, '02 / 05', 'NUTRITION → RESPIRATION → ENERGY'],
  [17.2, 25.0, '03 / 05', 'CONTROL & COORDINATION'],
  [25.3, 35.0, '04 / 05', 'REPRODUCTION & HEREDITY'],
  [35.3, 45.0, '05 / 05', 'LIFE IS CONNECTED'],
];
const NOTES = [
  [10.1, 12.9, 'PHOTOSYNTHESIS · in the chloroplast'],
  [13.1, 16.4, 'RESPIRATION · in the mitochondria'],
  [18.4, 21.2, 'REFLEX ACTION · fast and automatic'],
  [22.4, 24.8, 'PHOTOTROPISM · the hormone auxin bends the shoot'],
  [29.5, 32.3, 'FERTILISATION · the ovule becomes a seed'],
  [32.6, 35.0, 'DNA passes from parents to offspring'],
  [38.0, 41.8, 'only about 10% of the energy passes up'],
];
const ENDCARD = ['VIGYANVERSE AI', 'UNDERSTAND. VISUALIZE. DISCOVER.'];

// the plant cell's parts: where each sits in the cell, where it parks when apart, its tilt there
const CELL = [
  { id: 'wall', name: 'CELL WALL', home: [0, 0, 0], open: [0.2, 1.6, -3.6], tilt: [0.18, 0.05, 0.02] },
  { id: 'nucleus', name: 'NUCLEUS', home: [-1.55, 0.25, 0.35], open: [-3.7, 0, 0.9], tilt: [0.3, 0.4, 0] },
  { id: 'vacuole', name: 'VACUOLE', home: [0.35, 0, -0.1], open: [-1.2, 0, 0.9], tilt: [0.1, -0.25, 0.06] },
  { id: 'chloro', name: 'CHLOROPLAST', home: [1.75, 0.62, 0.5], open: [1.35, 0, 0.9], tilt: [0.35, 0.3, -0.12] },
  { id: 'mito', name: 'MITOCHONDRION', home: [-0.55, -0.72, 0.55], open: [3.55, 0, 0.9], tilt: [0.3, -0.45, 0.1] },
];
const cellLeave = (i) => T.cellOpen + i * 0.12;
const cellHomeAt = (i) => T.cellHome + (i === 0 ? 0.5 : (4 - i) * 0.07);
const FLOWER = ['SEPAL', 'PETAL', 'STAMEN', 'CARPEL'], LIFT = [0, 1.0, 2.1, 3.2];
const flowerLeave = (i) => T.flowerOpen + i * 0.12, flowerHomeAt = (i) => T.flowerHome + (3 - i) * 0.07;
const TIERS = ['PRODUCERS', 'HERBIVORES', 'CARNIVORES'];
const tierLeave = (i) => T.tiersOpen + i * 0.12, tierHomeAt = (i) => T.tiersHome + (2 - i) * 0.07;

// sound cues (story time): gentle Remotion effects on the same schedule as the picture
export const SOUND_CUES = (() => {
  const c = [];
  c.push([T.cellOpen - 0.1, 'whoosh', 0.1]);
  CELL.forEach((_, i) => c.push([T.cellLabels + i * 0.6 + 0.2, 'mouse-click', 0.13]));
  c.push([T.sunlight, 'ding', 0.08], [T.made, 'ding', 0.13], [T.fire, 'ding', 0.16]);
  c.push([cellHomeAt(0), 'mouse-click', 0.22], [16.6, 'whoosh', 0.09]);
  c.push([T.sens[0], 'switch', 0.08], [T.jerk, 'mouse-click', 0.22]);
  [0, 1, 2, 3].forEach((i) => c.push([T.sens[0] + 0.2 + i * 0.5 + 0.2, 'mouse-click', 0.1]));
  c.push([21.2, 'whoosh', 0.08], [T.lamp, 'switch', 0.2]);
  c.push([24.7, 'whoosh', 0.09], [T.flowerOpen, 'whoosh', 0.1]);
  FLOWER.forEach((_, i) => c.push([T.flowerLabels + i * 0.5 + 0.2, 'mouse-click', 0.13]));
  c.push([flowerHomeAt(0), 'mouse-click', 0.22], [T.pollen[1], 'ding', 0.09], [T.fert, 'ding', 0.14], [T.fall[0], 'page-turn', 0.12], [T.dna[0], 'whoosh', 0.1]);
  c.push([34.8, 'whoosh', 0.09], [T.tiersOpen, 'whoosh', 0.1]);
  TIERS.forEach((_, i) => c.push([T.tierLabels + i * 0.5 + 0.2, 'mouse-click', 0.13]));
  T.hops.forEach(([a], i) => c.push([a + 0.5, i ? 'mouse-click' : 'ding', i ? 0.1 : 0.1]));
  c.push([T.decomp[0] + 0.3, 'mouse-click', 0.13], [tierHomeAt(0), 'mouse-click', 0.22], [T.aerial[0], 'whoosh', 0.12], [T.end, 'ding', 0.16]);
  return c;
})();

const ease = K.ease, seg = K.seg, lerp = K.lerp;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// an arc from a to b, lifted by `h` in the middle
const arc = (a, b, k, h) => { const p = lerp3(a, b, k); p[1] += 4 * h * k * (1 - k); return p; };

export const biologyStyle = {
  id: 'exploded-view-biology',
  name: 'Exploded View: the science of life',
  topic: 'Class 10 biology in four stations',
  duration: DURATION,
  fonts: ['600 54px "IBM Plex Mono"', '500 40px "IBM Plex Mono"', '700 92px "Space Grotesk"'],
  render: { samples: 24, shutter: 0.5, tone: 'neutral', exposure: 1.0, bloom: 0.12, bloomThreshold: 1.2, vignette: 0.2, grain: 0.012, fov: 30, background: PAPER },

  async build(S) {
    const { scene, camera } = S;
    const lights = studio(S), fin = finishes(), labels = makeCallouts(S);
    const logo = await new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = staticFile('logo.png'); });
    const mesh = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };
    const group = (...kids) => { const g = new THREE.Group(); if (kids.length) g.add(...kids); return g; };
    const at = (m, x, y = 0, z = 0) => { m.position.set(x, y, z); return m; };
    const glow = (color, power = 2) => new THREE.MeshStandardMaterial({ color: '#000000', emissive: color, emissiveIntensity: power, roughness: 1 });
    const ball = new THREE.SphereGeometry(1, 32, 20);
    const sphere = (r, mat, shadow = true) => { const m = mesh(ball, mat, shadow); m.scale.setScalar(r); return m; };
    const world = (obj, local = [0, 0, 0]) => { obj.updateWorldMatrix(true, false); return new THREE.Vector3(...local).applyMatrix4(obj.matrixWorld).toArray(); };
    const M = {
      green: fin.moulded('#3f9b3a'), leaf: fin.moulded('#5aa04a'), darkLeaf: fin.moulded('#3d7d36'), violet: fin.moulded('#6d4fc9'), violetDark: fin.moulded('#3e2a86'),
      pink: fin.moulded('#ef6f9a', { sheen: 0.4, sheenColor: new THREE.Color('#ffd0de') }), yellow: fin.moulded('#f3c623'), amber: fin.moulded('#f2c14e'),
      skin: new THREE.MeshPhysicalMaterial({ color: '#e2a789', roughness: 0.55, metalness: 0, sheen: 0.5, sheenColor: new THREE.Color('#ffd9c8'), clearcoat: 0.15 }),
      terracotta: fin.moulded('#c4673f', { roughness: 0.8, clearcoat: 0.05 }), soil: fin.moulded('#4a3324', { roughness: 0.95, clearcoat: 0 }), wood: fin.moulded('#8a5a36', { roughness: 0.8 }),
      carbon: fin.moulded('#2a2c30'), oxygen: fin.moulded('#e2433a'), hydrogen: fin.nylon, cream: fin.moulded('#f3ead2'), cap: fin.moulded('#a0522d'),
      inkTube: fin.moulded(INK), orangeTube: fin.moulded('#f2641f'),
      cellWall: fin.glassy('#b9e0b4', { attenuationDistance: 1.2, thickness: 0.15 }), vacuole: new THREE.MeshPhysicalMaterial({ color: '#9fd0ee', roughness: 0.15, metalness: 0, transparent: true, opacity: 0.6, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false }),
      ovary: fin.glassy('#a9dc95', { attenuationDistance: 0.6, thickness: 0.3 }), cord: fin.glassy('#ece6f4', { attenuationDistance: 0.8, roughness: 0.18 }),
    };

    // ================================================================ station A: the plant cell
    const cell = at(group(), XA, 2.4, 0); scene.add(cell);
    const capsule = (r, len, mat) => { const m = mesh(new THREE.CapsuleGeometry(r, len, 8, 24).rotateZ(Math.PI / 2), mat); return m; };
    const chloroGlow = fin.moulded('#3f9b3a'), mitoMat = fin.moulded('#f2641f');
    const partNodes = {
      wall: group(mesh(K.roundedBox(5.3, 2.75, 2.75, 0.42, 6), M.cellWall, false),
        // the wall's edges throw a light, hollow shadow (the reference's trick for clear parts)
        ...[[0, 1.3, 1.3], [0, -1.3, 1.3], [0, 1.3, -1.3], [0, -1.3, -1.3]].map((p) => at(mesh(new THREE.BoxGeometry(5.0, 0.08, 0.08), fin.shadowOnly), ...p))),
      nucleus: group(sphere(0.55, M.violet), at(sphere(0.2, M.violetDark), 0.22, 0.3, 0.34)),
      vacuole: group(mesh(K.roundedBox(2.2, 1.55, 1.5, 0.62, 6), M.vacuole, false)),
      chloro: (() => { const g = group(), body = capsule(0.3, 0.85, chloroGlow); body.scale.z = 0.72; g.add(body);
        // grana: stacks of thylakoid discs showing through the top
        for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) g.add(at(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 20), M.darkLeaf), -0.38 + k * 0.38, 0.17 + j * 0.045, 0));
        return g; })(),
      mito: (() => { const g = group(), body = capsule(0.27, 0.75, mitoMat); body.scale.z = 0.8; g.add(body);
        for (let k = 0; k < 4; k++) { const r = mesh(new THREE.TorusGeometry(0.27, 0.025, 8, 32).rotateY(Math.PI / 2), fin.moulded('#c84a12')); r.position.x = -0.33 + k * 0.22; r.scale.z = 0.8; g.add(r); }
        return g; })(),
    };
    const cellParts = CELL.map((c) => { const pivot = group(partNodes[c.id]); cell.add(pivot); return { ...c, pivot }; });
    cellParts[3].rest = [0.2, 0.4, 0.15]; cellParts[4].rest = [0.1, -0.5, -0.2];
    const poseCell = (t) => {
      cellParts.forEach((p, i) => {
        const k = apart(t, cellLeave(i), cellHomeAt(i)), f = K.clamp(k), ph = i * 1.7, r = p.rest || [0, 0, 0];
        const pos = lerp3(p.home, p.open, k);
        p.pivot.position.set(pos[0] + 0.03 * f * Math.sin(t * 0.9 + ph), pos[1] + 0.05 * f * Math.sin(t * 1.1 + ph * 2), pos[2]);
        p.pivot.rotation.set(r[0] + p.tilt[0] * k, r[1] + p.tilt[1] * k + 0.03 * f * Math.sin(t * 0.8 + ph), r[2] + p.tilt[2] * k);
      });
    };
    const anchorUp = (p, h, x = 0) => () => { const w = world(p.pivot); return [w[0] + x, w[1] + h, w[2]]; };
    const CELL_TAGS = [[70, -20, 1, 0.9, 2.5], [-70, -105, -1, 0.55], [-40, -120, -1, 0.75], [30, -150, 1, 0.33], [-40, 120, -1, -0.3]];
    cellParts.forEach((p, i) => { const [dx, dy, side, h, x] = CELL_TAGS[i]; labels.add({ n: i + 1, name: p.name, at: anchorUp(p, h, x), on: T.cellLabels + i * 0.6, off: 9.5, dx, dy, side }); });

    // ---------------- photosynthesis and respiration on the parked chloroplast and mitochondrion
    const atom = { C: [0.14, M.carbon], O: [0.13, M.oxygen], H: [0.085, M.hydrogen] };
    const molecule = (spec) => group(...spec.map(([e, x, y]) => at(sphere(atom[e][0], atom[e][1]), x, y, 0)));
    const CO2 = [['C', 0, 0], ['O', -0.27, 0], ['O', 0.27, 0]];
    const H2O = [['O', 0, 0], ['H', -0.174, -0.134], ['H', 0.174, -0.134]];          // bent, about 104.5 degrees
    const O2 = [['O', -0.12, 0], ['O', 0.12, 0]];
    const co2In = [0, 1].map(() => molecule(CO2)), h2oIn = [0, 1].map(() => molecule(H2O)), o2 = molecule(O2);
    const co2Out = molecule(CO2), h2oOut = molecule(H2O);
    const glucose = group(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 6), M.amber));
    const sparkMat = glow('#ffb000', 2.4), sparks = Array.from({ length: 9 }, () => { const m = sphere(0.07, sparkMat, false); m.userData.r = 0.07; return m; });
    [...co2In, ...h2oIn, o2, co2Out, h2oOut, glucose, ...sparks].forEach((m) => scene.add(m));
    // sunlight: a soft shaft from above with warm streaks falling down it
    const beamMat = new THREE.MeshBasicMaterial({ color: '#ffe7a8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const beam = mesh(new THREE.CylinderGeometry(0.5, 0.8, 7, 40, 1, true), beamMat, false); scene.add(beam);
    const streakMat = glow('#ffb21a', 1.6), streaks = Array.from({ length: 7 }, () => { const s = mesh(new THREE.CapsuleGeometry(0.035, 0.5, 4, 8), streakMat, false); scene.add(s); return s; });
    const chloroPos = () => world(cellParts[3].pivot), mitoPos = () => world(cellParts[4].pivot);
    const showAt = (m, p, s) => { m.visible = s > 0.01; if (m.visible) { m.position.set(...p); m.scale.setScalar(s * (m.userData.r || 1)); } };
    const pop = (t, a, b, inn = 0.15, out = 0.2) => ease.outBack(seg(t, a, a + inn)) * (1 - seg(t, b - out, b));
    const poseProcess = (t) => {
      const Pc = chloroPos(), Pm = mitoPos();
      const sunK = seg(t, T.sunlight, T.sunlight + 0.6) * (1 - seg(t, 15.4, 16.0));
      beam.visible = sunK > 0.01; beamMat.opacity = 0.22 * sunK; beam.position.set(Pc[0], Pc[1] + 3.9, Pc[2]);
      streaks.forEach((s, i) => { const u = ((t * 0.9 + i / streaks.length) % 1), r = 0.25 + 0.2 * K.hash(i, 2); s.visible = sunK > 0.01; const a = i * 2.4;
        s.position.set(Pc[0] + Math.cos(a) * r, Pc[1] + 6.8 - u * 6.2, Pc[2] + Math.sin(a) * r); s.scale.setScalar(sunK * Math.sin(Math.PI * u)); });
      chloroGlow.emissive.set('#7dff6a'); chloroGlow.emissiveIntensity = 0.35 * sunK * (0.6 + 0.4 * Math.sin(t * 5));
      co2In.forEach((m, i) => { const a = T.co2 + i * 0.35, u = seg(t, a, a + 0.9, ease.inOut); showAt(m, lerp3(add3(Pc, [-1.7 - i * 0.5, 1.1 + i * 0.6, 0.5]), Pc, u), pop(t, a, a + 0.9, 0.15, 0.25)); m.rotation.set(0, 0, t * 1.5 + i); });
      h2oIn.forEach((m, i) => { const a = T.h2o + i * 0.35, u = seg(t, a, a + 0.9, ease.inOut); showAt(m, lerp3(add3(Pc, [0.5 + i * 0.7, -1.4, 1.0 - i * 0.3]), Pc, u), pop(t, a, a + 0.9, 0.15, 0.25)); m.rotation.set(0, t + i, 0.3); });
      // glucose and oxygen come out, wait, then travel to the mitochondrion
      const go = seg(t, T.toMito[0], T.toMito[1], ease.inOut), outK = seg(t, T.made, T.made + 0.45, ease.out);
      const gWait = lerp3(Pc, add3(Pc, [0.55, 0.6, 0.6]), outK), oWait = lerp3(Pc, add3(Pc, [-0.55, 0.7, 0.4]), outK);
      showAt(glucose, arc(gWait, Pm, go, 0.7), pop(t, T.made, T.toMito[1] + 0.05, 0.2, 0.2)); glucose.rotation.set(1.2, t * 0.8, 0.3);
      showAt(o2, arc(oWait, Pm, seg(t, T.toMito[0] + 0.1, T.toMito[1], ease.inOut), 0.9), pop(t, T.made + 0.1, T.toMito[1] + 0.05, 0.2, 0.2)); o2.rotation.set(0, t, 0.4);
      // the mitochondrion releases energy, carbon dioxide and water
      const fire = seg(t, T.fire, T.fire + 0.15) * (1 - seg(t, T.fire + 0.4, T.fire + 1.6));
      mitoMat.emissive.set('#ff7a1a'); mitoMat.emissiveIntensity = 0.9 * fire;
      sparks.forEach((s, i) => { const a = i / sparks.length * Math.PI * 2, u = seg(t, T.fire, T.fire + 1.1, ease.out), d = 0.4 + 1.1 * u, e = 0.35 * Math.sin(i * 1.7);
        showAt(s, [Pm[0] + Math.cos(a) * d, Pm[1] + Math.sin(a) * d * 0.8 + 0.25, Pm[2] + e * d], (1 - seg(t, T.fire + 0.6, T.fire + 1.6)) * (t > T.fire ? 1 : 0) * (1.2 - 0.4 * K.hash(i))); });
      const w = seg(t, T.waste[0], T.waste[1], ease.out);
      showAt(co2Out, lerp3(Pm, add3(Pm, [1.0, 1.4, 0.4]), w), pop(t, T.waste[0], 15.7, 0.15, 0.4)); co2Out.rotation.set(0, 0, t * 1.4);
      showAt(h2oOut, lerp3(Pm, add3(Pm, [1.5, -0.5, 0.8]), seg(t, T.waste[0] + 0.1, T.waste[1] + 0.1, ease.out)), pop(t, T.waste[0] + 0.1, 15.7, 0.15, 0.4)); h2oOut.rotation.set(0, t, 0.2);
    };
    const follow = (m, up = 0.3) => () => [m.position.x, m.position.y + up, m.position.z];
    labels.add({ n: null, name: 'SUNLIGHT', at: () => add3(chloroPos(), [0.9, 1.7, 0]), on: T.sunlight + 0.3, off: 12.4, dx: 20, dy: 0, side: 1 });
    labels.add({ n: null, name: 'CO₂', at: follow(co2In[0], 0.25), on: T.co2 + 0.15, off: T.co2 + 0.95, dx: -20, dy: -30, side: -1, size: 46 });
    labels.add({ n: null, name: 'WATER', at: follow(h2oIn[1], -0.25), on: T.h2o + 0.5, off: T.h2o + 1.25, dx: 24, dy: 34, side: 1, size: 46 });
    labels.add({ n: null, name: 'GLUCOSE', at: follow(glucose, 0.25), on: T.made + 0.25, off: T.toMito[1], dx: 26, dy: -30, side: 1, size: 46 });
    labels.add({ n: null, name: 'O₂', at: follow(o2, 0.25), on: T.made + 0.35, off: T.toMito[1], dx: -24, dy: -30, side: -1, size: 46 });
    labels.add({ n: null, name: 'ENERGY', at: () => add3(mitoPos(), [0, 1.3, 0]), on: T.fire + 0.15, off: 15.9, dx: 0, dy: -20, side: 1, size: 58 });
    labels.add({ n: null, name: 'CO₂ + WATER', at: follow(co2Out, 0.3), on: T.waste[0] + 0.4, off: 15.7, dx: 26, dy: -24, side: 1, size: 40 });

    // ================================================================ station B: a reflex, and a shoot bending to light
    const Z = 0.8, PIV = [XB + 0.4, 2.5, Z], ANCHOR = [XB - 1.0, 4.3, Z], CORD = [XB + 2.4, 0, 0.2];
    // the hot plate
    scene.add(at(mesh(turnedUp([[0, 0], [0, 0.55], [0.1, 0.55], [0.14, 0.22], [0.82, 0.22], [0.86, 0.62], [0.98, 0.62], [0.98, 0]], { bevel: 0.012 }), fin.chrome), XB - 3.0, 0, Z));
    const hotMat = glow('#ff4a1a', 1.4); scene.add(at(mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 48), hotMat, false), XB - 3.0, 1.0, Z));
    // the pivot post and the arm with the finger
    scene.add(at(mesh(new THREE.CylinderGeometry(0.07, 0.09, PIV[1], 16).translate(0, PIV[1] / 2, 0), fin.chrome), PIV[0], 0, Z));
    scene.add(at(sphere(0.13, fin.brass), ...PIV));
    const arm = at(group(), ...PIV); scene.add(arm);
    arm.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.95, 12).rotateZ(Math.PI / 2), fin.chrome), -1.47, 0, 0));
    arm.add(at(mesh(new THREE.CapsuleGeometry(0.2, 0.5, 8, 20).rotateZ(Math.PI / 2), M.skin), -3.3, 0, 0));
    arm.add(mesh(K.tube([[-3.15, 0.12, 0.08], [-2.0, 0.11, 0.08], [-0.6, 0.11, 0.08], [-0.1, 0.12, 0.08]], 0.035), M.inkTube));
    // the spinal cord: a milky column with vertebra rings, on a bracket that holds the muscle
    scene.add(at(mesh(new THREE.CylinderGeometry(0.3, 0.3, 4.4, 40).translate(0, 2.2, 0), M.cord, false), ...CORD));
    for (let k = 0; k < 8; k++) scene.add(at(mesh(new THREE.TorusGeometry(0.36, 0.07, 10, 36).rotateX(Math.PI / 2), fin.nylon), CORD[0], 0.35 + k * 0.52, CORD[2]));
    scene.add(mesh(K.tube([[CORD[0], 4.25, CORD[2]], [CORD[0] - 1.6, 4.3, 0.55], [ANCHOR[0], ANCHOR[1], Z]], 0.06), fin.chrome));
    scene.add(at(sphere(0.12, fin.brass), ...ANCHOR));
    const sensoryPts = [[PIV[0] - 0.05, PIV[1] + 0.13, Z + 0.08], [PIV[0] + 0.8, 2.35, 0.75], [CORD[0] - 0.25, 2.15, CORD[2] + 0.1]];
    const sensory = mesh(K.tube(sensoryPts, 0.04), M.inkTube); scene.add(sensory);
    const motorPts = [[CORD[0] - 0.25, 3.3, CORD[2] + 0.12], [XB + 0.7, 3.95, 0.95], [ANCHOR[0] + 0.15, ANCHOR[1] - 0.1, Z]];
    const motor = mesh(K.tube(motorPts, 0.04), M.orangeTube); scene.add(motor);
    const muscle = mesh(turned([[0, 0], [0, 0.05], [0.1, 0.13, 1], [0.5, 0.3, 1], [0.9, 0.13, 1], [1, 0.05], [1, 0]], { seg: 48 }), fin.redRubber); scene.add(muscle);
    const pulseMat = glow('#59c2ff', 3), pulse = sphere(0.11, pulseMat, false), pulse2 = sphere(0.11, glow('#ffb000', 3), false); scene.add(pulse, pulse2);
    const ARM_IN = 1.2, armAngle = (t) => {           // + = finger down
      const lower = seg(t, T.lower[0], T.lower[1], ease.inOut), jerk = seg(t, T.jerk, T.jerk + 0.16, ease.out), settle = seg(t, T.jerk + 0.3, T.jerk + 1.2, ease.inOut);
      return lerp(-0.17, 0.314, lower) * (1 - jerk) + jerk * lerp(-0.45, -0.3, settle);
    };
    const fingerPath = () => { const a = 0.314; return [[PIV[0] - 3.2 * Math.cos(a), PIV[1] - 3.2 * Math.sin(a) + 0.12, Z + 0.08], [PIV[0] - 1.6 * Math.cos(a), PIV[1] - 1.6 * Math.sin(a) + 0.12, Z + 0.08], ...sensoryPts]; };
    const sensCurve = new THREE.CatmullRomCurve3(fingerPath().map((p) => new THREE.Vector3(...p)));
    const motorCurve = new THREE.CatmullRomCurve3(motorPts.map((p) => new THREE.Vector3(...p)));
    const poseReflex = (t) => {
      const a = armAngle(t); arm.rotation.z = a;
      const Q = new THREE.Vector3(PIV[0] - ARM_IN * Math.cos(a), PIV[1] - ARM_IN * Math.sin(a), Z), A = new THREE.Vector3(...ANCHOR);
      const d = Q.clone().sub(A), len = d.length(), bulge = Math.sqrt(2.18 / len);
      muscle.position.copy(A); muscle.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize()); muscle.scale.set(len, bulge, bulge);
      const s = seg(t, T.sens[0], T.sens[1], ease.inOut), m = seg(t, T.motor[0], T.motor[1], ease.inOut);
      pulse.visible = t > T.sens[0] && t < T.sens[1] + 0.08; if (pulse.visible) pulse.position.copy(sensCurve.getPointAt(s));
      pulse2.visible = t > T.motor[0] && t < T.motor[1] + 0.08; if (pulse2.visible) pulse2.position.copy(motorCurve.getPointAt(m));
      hotMat.emissiveIntensity = 1.2 + 0.25 * Math.sin(t * 6);
    };
    const pt = (c, u) => () => c.getPointAt(u).toArray();
    labels.add({ n: null, name: 'HOT', at: () => [XB - 3.0, 1.1, Z], on: 17.6, off: 21.6, dx: -80, dy: 0, side: -1, size: 48, color: '#d2401a' });
    labels.add({ n: 1, name: 'SENSORY NEURON', at: () => new THREE.CatmullRomCurve3(sensoryPts.map((p) => new THREE.Vector3(...p))).getPointAt(0.45).toArray(), on: T.sens[0] + 0.2, off: 21.6, dx: -40, dy: 190, side: -1 });
    labels.add({ n: 2, name: 'SPINAL CORD', at: () => [CORD[0] + 0.3, 1.4, CORD[2]], on: T.sens[0] + 0.7, off: 21.6, dx: 110, dy: 60, side: 1 });
    labels.add({ n: 3, name: 'MOTOR NEURON', at: pt(motorCurve, 0.45), on: T.sens[0] + 1.2, off: 21.6, dx: 120, dy: -60, side: 1 });
    labels.add({ n: 4, name: 'MUSCLE', at: () => [muscle.position.x - 0.25, muscle.position.y - 0.9, Z], on: T.sens[0] + 1.7, off: 21.6, dx: -150, dy: 40, side: -1 });

    // the seedling in its pot, and the lamp
    const POT = [XB + 4.9, 0, 0.4];
    scene.add(at(mesh(turnedUp([[0, 0], [0, 0.55], [1.1, 0.78], [1.1, 0.88], [1.25, 0.88], [1.25, 0.76], [1.12, 0.74], [1.12, 0]], { bevel: 0.015 }), M.terracotta), ...POT));
    scene.add(at(mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.04, 40), M.soil), POT[0], 1.13, POT[2]));
    const SEGS = 10, SEG_L = 0.29, stem = [];
    let parent = at(group(), POT[0], 1.13, POT[2]); scene.add(parent);
    const leafGeo = new THREE.SphereGeometry(1, 24, 14).scale(0.42, 0.045, 0.2).translate(0.42, 0, 0);
    for (let k = 0; k < SEGS; k++) {
      const s = group(at(mesh(new THREE.CylinderGeometry(0.05, 0.06, SEG_L, 12).translate(0, SEG_L / 2, 0), M.leaf), 0, 0, 0));
      if (k > 0) s.position.y = SEG_L;
      if (k === 5 || k === SEGS - 1) for (const side of [1, -1]) { const lf = mesh(leafGeo, M.leaf); lf.position.y = SEG_L * 0.9; lf.rotation.set(0, side > 0 ? 0.6 : Math.PI + 0.6, 0.45); lf.scale.setScalar(k === 5 ? 0.8 : 1); s.add(lf); }
      parent.add(s); stem.push(s); parent = s;
    }
    const LAMP = [XB + 7.7, 0, 0.4];
    scene.add(at(mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.1, 40), fin.chrome), LAMP[0], 0.05, LAMP[2]));
    scene.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5, 12).translate(0, 1.75, 0), fin.chrome), ...LAMP));
    const shadeMat = fin.orange.clone(); shadeMat.side = THREE.DoubleSide;
    const bulbMat = glow('#fff2cc', 0);
    const shade = at(group(mesh(turned([[0, 0.14], [0.18, 0.16], [0.8, 0.52], [0.84, 0.55]]), shadeMat), at(sphere(0.17, bulbMat, false), 0.45, 0, 0)), LAMP[0] - 0.15, 3.5, LAMP[2]);
    shade.rotation.z = Math.PI + 0.6; scene.add(shade);
    const lampBeamMat = new THREE.MeshBasicMaterial({ color: '#ffe3a0', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    shade.add(mesh(new THREE.CylinderGeometry(0.5, 1.05, 2.6, 40, 1, true).rotateZ(Math.PI / 2).translate(2.1, 0, 0), lampBeamMat, false));
    const lampLight = new THREE.SpotLight('#ffe2a8', 0, 0, 0.7, 0.6, 1.2); lampLight.position.set(LAMP[0] - 0.6, 3.15, LAMP[2]); lampLight.target.position.set(POT[0], 2.4, POT[2]); scene.add(lampLight, lampLight.target);
    const poseSeedling = (t) => {
      const on = seg(t, T.lamp, T.lamp + 0.12); bulbMat.emissiveIntensity = 3.2 * on; lampLight.intensity = 30 * on; lampBeamMat.opacity = 0.2 * on;
      const b = 1.0 * seg(t, T.bend[0], T.bend[1], ease.inOut);       // total bend of the shoot, radians
      stem.forEach((s, k) => { s.rotation.z = -b / SEGS * (0.4 + 1.2 * k / SEGS); });
    };
    labels.add({ n: null, name: 'LIGHT', at: () => [LAMP[0] - 0.7, 3.0, LAMP[2]], on: T.lamp + 0.2, off: 24.8, dx: 40, dy: 80, side: 1, size: 48 });
    labels.add({ n: null, name: 'SHOOT BENDS TOWARDS LIGHT', at: () => world(stem[SEGS - 1], [0, SEG_L, 0]), on: T.bend[0] + 0.6, off: 24.8, dx: -70, dy: 40, side: -1, size: 46 });

    // ================================================================ station C: the flower, then DNA
    const flower = at(group(), XC, 0, 0); scene.add(flower);
    const Y0 = 1.6;
    flower.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, Y0, 16).translate(0, Y0 / 2, 0), M.leaf));
    flower.add(at(mesh(new THREE.SphereGeometry(0.2, 24, 16).scale(1, 0.7, 1), M.leaf), 0, Y0, 0));
    const tier = () => { const g = at(group(), 0, Y0, 0); flower.add(g); return g; };
    const sepals = tier(), petals = tier(), stamens = tier(), carpel = tier();
    const sepalGeo = new THREE.SphereGeometry(1, 24, 14).scale(0.5, 0.04, 0.24).translate(0.48, 0, 0);
    const petalGeo = new THREE.SphereGeometry(1, 32, 16).scale(0.78, 0.05, 0.42).translate(0.74, 0, 0);
    const petalMat = M.pink, petalPivots = [], stamenPivots = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const sp = group(mesh(sepalGeo, M.leaf)); sp.rotation.set(0, a + Math.PI / 5, 0); sp.children[0].rotation.z = 0.3; sepals.add(sp);
      const pp = group(mesh(petalGeo, petalMat)); pp.userData.a = a; pp.userData.tilt = 0.55; pp.position.y = 0.06; petals.add(pp); petalPivots.push(pp);
      const st = group(at(mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.0, 8).translate(0, 0.5, 0), M.cream), 0, 0, 0), at(mesh(new THREE.CapsuleGeometry(0.07, 0.16, 6, 12), M.yellow), 0, 1.05, 0));
      st.userData.a = a + Math.PI / 5; st.userData.tilt = 0.3; stamens.add(st); stamenPivots.push(st);
    }
    const restPetal = (p, k = 0) => { p.position.set(0, 0.06, 0); p.rotation.set(0, p.userData.a, p.userData.tilt); };
    const restStamen = (p) => { const a = p.userData.a; p.position.set(Math.cos(a) * 0.16, 0.04, -Math.sin(a) * 0.16); p.rotation.set(0, a, -p.userData.tilt); };
    const ovule = at(sphere(0.09, M.cream), 0, 0.32, 0), ovary = at(mesh(new THREE.SphereGeometry(0.3, 32, 20).scale(1, 1.15, 1), M.ovary, false), 0, 0.32, 0);
    carpel.add(ovary, ovule,
      at(mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 16).translate(0, 0.45, 0), M.ovary, false), 0, 0.6, 0),
      at(mesh(new THREE.SphereGeometry(0.13, 24, 12).scale(1, 0.6, 1), fin.moulded('#c9d64a')), 0, 1.52, 0),
      at(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), fin.shadowOnly), 0, 1.0, 0));
    const tubeMat = glow('#ffd23a', 1.2), pollenTube = at(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.12, 8).translate(0, -0.56, 0), tubeMat, false), 0, 1.47, 0);
    carpel.add(pollenTube);
    const pollen = sphere(0.075, fin.moulded('#f6b818', { bumpMap: fin.dimples, bumpScale: 0.6 })); scene.add(pollen);
    const seedMat = ovule.material = M.cream.clone();
    const flowerTiers = [sepals, petals, stamens, carpel];
    const FLOWER_TILT = [[0, 0, 0], [0.12, 0, 0.05], [-0.1, 0, -0.08], [0.06, 0, 0.1]];
    const poseFlower = (t) => {
      flowerTiers.forEach((g, i) => {
        const k = apart(t, flowerLeave(i), flowerHomeAt(i)), f = K.clamp(k), ph = i * 1.9;
        g.position.set(0.03 * f * Math.sin(t * 0.9 + ph), Y0 + LIFT[i] * k + 0.05 * f * Math.sin(t * 1.2 + ph), 0);
        g.rotation.set(FLOWER_TILT[i][0] * k, t * 0.12 * f + 0.6 * k * (i % 2 ? 1 : -1) * 0.2, FLOWER_TILT[i][2] * k);
      });
      // after fertilisation the petals and stamens wither and fall; the ovule becomes a seed, the ovary a fruit
      const fall = seg(t, T.fall[0], T.fall[1]), drop = ease.outBounce(fall), slide = ease.out(fall);
      petalPivots.forEach((p, i) => { restPetal(p); if (fall <= 0) return; const a = p.userData.a, r = 0.75 + 0.25 * K.hash(i, 3);
        p.position.set(Math.cos(a) * r * slide, lerp(0.06, -Y0 + 0.05, drop), -Math.sin(a) * r * slide); p.rotation.set(0.3 * slide * Math.sin(i), a + 0.5 * slide, lerp(p.userData.tilt, 0, slide)); });
      stamenPivots.forEach((p, i) => { restStamen(p); if (fall <= 0) return; const a = p.userData.a, r = 0.55 + 0.2 * K.hash(i, 5);
        p.position.set(Math.cos(a) * r * slide, lerp(0.04, -Y0 + 0.03, drop), -Math.sin(a) * r * slide); p.rotation.set(0, a, lerp(-p.userData.tilt, -Math.PI / 2, slide)); });
      petalMat.color.set('#ef6f9a').lerp(new THREE.Color('#b98a6a'), 0.6 * fall);
      const s = seg(t, T.seed[0], T.seed[1], ease.inOut);
      ovary.scale.set(1 + 0.4 * s, 1.15 + 0.35 * s, 1 + 0.4 * s); ovule.scale.setScalar(0.09 * (1 + 0.7 * s));
      seedMat.color.set('#f3ead2').lerp(new THREE.Color('#7a4a2a'), s);
      const fert = seg(t, T.fert, T.fert + 0.15) * (1 - seg(t, T.fert + 0.4, T.fert + 1.0)); seedMat.emissive.set('#ffd23a'); seedMat.emissiveIntensity = 1.4 * fert;
      // the pollen grain: from an anther to the stigma, then the tube grows down the style
      const anther = world(stamenPivots[1], [0, 1.05, 0]), stigma = world(carpel, [0, 1.6, 0]);
      const pk = seg(t, T.pollen[0], T.pollen[1], ease.inOut);
      pollen.visible = t > T.pollen[0] - 0.05 && t < T.seed[1] + 2.5;
      if (pollen.visible) pollen.position.set(...(pk < 1 ? arc(anther, stigma, pk, 0.6) : stigma));
      const g = seg(t, T.tube[0], T.tube[1], ease.inOut); pollenTube.visible = g > 0.01; pollenTube.scale.y = g;
    };
    const tierAnchor = (i, off) => () => add3(flowerTiers[i].getWorldPosition(new THREE.Vector3()).toArray(), off);
    const FLOWER_TAGS = [[[-0.6, 0.05, 0.4], -120, 40, -1], [[0.8, 0.35, 0.5], 150, 20, 1], [[-0.3, 1.0, 0.2], -170, 0, -1], [[0.05, 1.0, 0], 150, 0, 1]];
    FLOWER.forEach((name, i) => { const [p, dx, dy, side] = FLOWER_TAGS[i]; labels.add({ n: i + 1, name, at: tierAnchor(i, p), on: T.flowerLabels + i * 0.5, off: T.flowerHome - 0.1, dx, dy, side }); });
    labels.add({ n: null, name: 'POLLEN', at: () => pollen.position.toArray(), on: T.pollen[0] + 0.1, off: T.tube[0] + 0.2, dx: 30, dy: -40, side: 1, size: 46 });
    labels.add({ n: null, name: 'POLLEN TUBE', at: () => world(carpel, [0, 1.0, 0]), on: T.tube[0] + 0.25, off: T.fert + 0.3, dx: 70, dy: -10, side: 1, size: 46 });
    labels.add({ n: null, name: 'SEED', at: () => world(carpel, [0, 0.32, 0.2]), on: T.seed[0] + 0.3, off: 33.6, dx: 90, dy: 30, side: 1, size: 52 });

    // DNA: two steel strands wound as a true double helix, with base pairs as coloured rungs
    const DNA_X = XC + 4.6, DNA_H = 4.2, DNA_R = 0.55, TURNS = 3, RUNGS = 30;
    const dna = at(group(), DNA_X, 0, 0); scene.add(dna);
    for (const ph of [0, Math.PI]) dna.add(mesh(helix({ radius: DNA_R, wire: 0.075, turns: TURNS, length: DNA_H, phase: ph, seg: 40 }).rotateZ(Math.PI / 2), fin.steel));
    const baseMats = [fin.orange, M.inkTube, M.green, fin.nylon], rungGeo = new THREE.CylinderGeometry(0.05, 0.05, DNA_R, 10).translate(0, DNA_R / 2, 0), Y = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < RUNGS; k++) {
      const u = (k + 0.5) / RUNGS, a = u * TURNS * Math.PI * 2, h = u * DNA_H, pair = K.hash(k, 9) < 0.5 ? 0 : 2, flip = K.hash(k, 4) < 0.5;
      for (const side of [1, -1]) {
        const r = mesh(rungGeo, baseMats[pair + ((side > 0) !== flip ? 0 : 1)]);
        r.position.set(0, h, 0); r.quaternion.setFromUnitVectors(Y, new THREE.Vector3(-Math.cos(a) * side, 0, Math.sin(a) * side)); dna.add(r);
      }
    }
    const poseDna = (t) => { const r = seg(t, T.dna[0], T.dna[1], ease.outBack); dna.position.y = lerp(-DNA_H - 0.3, 0.7, r); dna.rotation.y = t * 0.7; dna.visible = r > 0.001; };
    labels.add({ n: null, name: 'DNA', at: () => [DNA_X + 0.7, dna.position.y + DNA_H * 0.8, 0], on: T.dna[1] - 0.3, off: 35.0, dx: 40, dy: 0, side: 1, size: 70 });

    // ================================================================ station D: the energy pyramid
    const pyramid = at(group(), XD, 0, 0); scene.add(pyramid);
    const TIER_SIZE = [5.4, 3.9, 2.4], TIER_H = 0.8, TIER_COL = [M.leaf, M.amber, fin.orange];
    const tiers = TIER_SIZE.map((w, i) => { const g = group(mesh(K.roundedBox(w, TIER_H, w, 0.12, 4), TIER_COL[i])); g.userData.y = TIER_H / 2 + i * TIER_H; pyramid.add(g); return g; });
    // trees on the producers' rim, and small grazers / hunters as simple forms on the next two
    const coneGeo = new THREE.ConeGeometry(0.28, 0.75, 20), trunkGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.25, 8);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + 0.3, r = 2.35, x = K.clamp(Math.cos(a) * 3.4, -r, r), z = K.clamp(Math.sin(a) * 3.4, -r, r);
      tiers[0].add(at(mesh(trunkGeo, M.wood), x, TIER_H / 2 + 0.12, z), at(mesh(coneGeo, M.darkLeaf), x, TIER_H / 2 + 0.6, z)); }
    const MUSH = [[XD + 3.9, 1.7, 1.0], [XD + 4.5, 1.0, 0.8], [XD + 3.6, 0.6, 0.65]];
    MUSH.forEach(([x, z, s]) => { const m = at(group(mesh(turnedUp([[0, 0], [0, 0.12], [0.45, 0.09], [0.45, 0]]), fin.nylon), at(mesh(turnedUp([[0, 0], [0, 0.42], [0.1, 0.4, 1], [0.22, 0.3, 1], [0.3, 0.12, 1], [0.32, 0]]), M.cap), 0, 0.42, 0)), x, 0, z); m.scale.setScalar(s); scene.add(m); });
    const SUN = [XD + 4.2, 7.0, -3.2];
    const sunBall = at(sphere(0.62, glow('#ffc23a', 2.2), false), ...SUN); scene.add(sunBall);
    const sunRays = group(); for (let k = 0; k < 12; k++) { const r = mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), glow('#ffb21a', 1.8), false); const a = k / 12 * Math.PI * 2; r.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0); r.rotation.z = a - Math.PI / 2; sunRays.add(r); }
    sunRays.position.set(...SUN); scene.add(sunRays);
    const energy = sphere(0.3, glow('#fff09a', 3.2), false), nutrients = sphere(0.14, glow('#c98a3a', 1.4), false); scene.add(energy, nutrients);
    const tierTop = (i) => { const p = world(tiers[i]); return [p[0] - TIER_SIZE[i] * 0.25, p[1] + TIER_H / 2 + 0.25, p[2] + TIER_SIZE[i] * 0.3]; };
    const posePyramid = (t) => {
      tiers.forEach((g, i) => { const k = i === 0 ? 0 : apart(t, tierLeave(i), tierHomeAt(i)), f = K.clamp(k), ph = i * 2.1;
        g.position.set(0, g.userData.y + i * 1.1 * k + 0.04 * f * Math.sin(t * 1.1 + ph), 0); g.rotation.set(0.05 * k * (i % 2 ? 1 : -1), 0.12 * k * (i % 2 ? -1 : 1), 0.03 * k); });
      const sk = ease.outBack(seg(t, T.sun, T.sun + 0.5)); sunBall.scale.setScalar(0.62 * sk); sunRays.scale.setScalar(sk); sunRays.rotation.z = t * 0.4;
      // energy: sun -> producers -> herbivores -> carnivores, a tenth as much at every step
      const stops = [SUN, tierTop(0), tierTop(1), tierTop(2)], radius = [0.4, 0.3, 0.22, 0.15];
      let shown = false;
      T.hops.forEach(([a, b], i) => { if (t >= a && t <= b + 0.35) { const u = seg(t, a, b, ease.inOut); energy.position.set(...arc(stops[i], stops[i + 1], u, i === 0 ? 0.3 : 0.6)); energy.scale.setScalar(lerp(radius[i], radius[i + 1], u) * (1 - seg(t, b + 0.15, b + 0.35))); shown = true; } });
      energy.visible = shown;
      const n = seg(t, T.decomp[0], T.decomp[1], ease.inOut); nutrients.visible = t > T.decomp[0] && t < T.decomp[1] + 0.3;
      if (nutrients.visible) { nutrients.position.set(...arc(tierTop(2), [MUSH[0][0], 0.5, MUSH[0][1]], n, 0.5)); nutrients.scale.setScalar(0.14 * (1 - seg(t, T.decomp[1], T.decomp[1] + 0.3))); }
    };
    const TIER_TAGS = [[[-2.7, 0, 2.7], -110, -10, -1], [[-1.95, 0, 1.95], -140, 20, -1], [[-1.2, 0.2, 1.2], -140, -10, -1]];
    TIERS.forEach((name, i) => { const [p, dx, dy, side] = TIER_TAGS[i]; labels.add({ n: i + 1, name, at: () => world(tiers[i], p), on: T.tierLabels + i * 0.5, off: T.aerial[0] + 0.2, dx, dy, side }); });
    labels.add({ n: 4, name: 'DECOMPOSERS', at: () => [MUSH[0][0], 0.5, MUSH[0][1]], on: T.decomp[0] + 0.1, off: T.aerial[0] + 0.2, dx: 70, dy: -120, side: 1 });
    labels.add({ n: null, name: 'SUN', at: () => [SUN[0], SUN[1] + 1.3, SUN[2]], on: T.sun + 0.3, off: T.aerial[0] + 0.2, dx: 0, dy: -10, side: 1, size: 48 });
    T.hops.slice(1).forEach(([a, b], i) => labels.add({ n: null, name: '10%', at: () => add3(lerp3(tierTop(i), tierTop(i + 1), 0.5), [1.7, 0.2, 0]), on: a + 0.2, off: T.tiersHome - 0.2, dx: 30, dy: 0, side: 1, size: 48 }));

    // the dash-dot ink line that ties the four stations together, drawn on in the aerial shot
    const dash = K.canvasTex(64, 4, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 34, 4); ctx.fillRect(44, 0, 8, 4); }, { repeat: [1, 1] });
    dash.wrapS = THREE.RepeatWrapping; const LINE_L = XD - XA + 8;
    const line = mesh(new THREE.PlaneGeometry(1, 0.3).translate(0.5, 0, 0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: INK, alphaMap: dash, alphaTest: 0.5 }), false);
    line.position.set(XA - 4, 0.02, 4.2); scene.add(line);

    // ================================================================ camera: one continuous move along the floor
    const cam = {
      pos: K.path([[0, [-5, 4.4, 8.4]], [1.8, [-5.8, 5.2, 10.2]], [3.4, [-7.5, 7, 16]], [6.5, [-6, 6.6, 15.2]], [9.2, [-2.6, 5.6, 12.6]], [10.6, [-0.8, 5, 10.4]], [15.2, [-0.2, 5.1, 10.8]], [16.4, [1.4, 5.6, 12.4]], [17.9, [15.4, 6, 13.6]], [21, [15.8, 5.8, 13.2]], [22.3, [21.4, 5, 11.4]], [24.5, [21.7, 5, 11.2]], [25.9, [34.6, 6, 14.5]], [28.8, [34.9, 6.2, 14.8]], [29.6, [37, 4.8, 9.2]], [31.8, [37.2, 4.6, 9.4]], [33, [38.6, 5.2, 12]], [34.6, [38.8, 5.2, 12.2]], [36.0, [53.4, 8.8, 19.0]], [41.8, [53.8, 9.0, 19.4]], [45.2, [86, 22, 32]], [DURATION, [85, 22.5, 33.5]]]),
      aim: K.path([[0, [-0.4, 2.4, 0]], [1.8, [-0.1, 2.5, 0]], [3.4, [0.2, 2.9, 0]], [6.5, [0.4, 2.9, 0.2]], [9.2, [1.8, 3, 0.4]], [10.6, [2.4, 3.1, 0.6]], [15.2, [2.2, 3, 0.5]], [16.4, [3, 2.8, 0.4]], [17.9, [19.6, 2.8, 0.5]], [21, [19.8, 2.8, 0.5]], [22.3, [25.4, 2.9, 0.4]], [24.5, [25.5, 2.9, 0.4]], [25.9, [40.2, 3.7, 0]], [28.8, [40.3, 3.8, 0]], [29.6, [40.1, 2.6, 0]], [31.8, [40.4, 2.4, 0]], [33, [42.4, 3, 0]], [34.6, [42.5, 3, 0]], [36.0, [59.8, 2.3, 0]], [41.8, [59.9, 2.3, 0]], [45.2, [38, 0.5, -1]], [DURATION, [38, 0.5, -1]]]),
      lens: K.track([[0, 0.09], [3.4, 0.11], [9.0, 0.11], [10.6, 0.13], [16.0, 0.1], [42.2, 0.1], [45.2, 0.05]]),
    };
    const aerialK = (t) => seg(t, T.aerial[0], T.aerial[1], ease.inOut);

    return {
      update(t) {
        poseCell(t); poseProcess(t); poseReflex(t); poseSeedling(t); poseFlower(t); poseDna(t); posePyramid(t);
        const lk = seg(t, T.line[0], T.line[1], ease.inOut); line.visible = lk > 0.005; line.scale.x = LINE_L * Math.max(lk, 0.001); dash.repeat.x = LINE_L * lk / 1.6;
        const a = cam.aim(t); K.look(camera, cam.pos(t), a); K.focus(camera, a, cam.lens(t));
        aimLights(lights, a, lerp(15, 46, aerialK(t)));
      },

      overlay(ctx, t, W, H) {
        const s = W / 1920;
        ctx.save(); labels.draw(ctx, t); ctx.restore();
        ctx.save(); ctx.scale(s, s);
        ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        // the title, on screen from the first frame
        const ta = 1 - seg(t, 9.2, 9.7);
        if (ta > 0) { ctx.globalAlpha = ta;
          ctx.fillStyle = INK; ctx.font = '500 40px "IBM Plex Mono"'; ctx.letterSpacing = '6px'; ctx.fillText(SUBTITLE, 96, 116);
          ctx.fillStyle = INK_DARK; ctx.font = '700 104px "Space Grotesk"'; ctx.letterSpacing = '0px'; ctx.fillText(TITLE, 90, 218); }
        for (const [a, b, num, text] of CAPTIONS) {
          const k = seg(t, a, a + 0.35, ease.out) * (1 - seg(t, b - 0.3, b)); if (k <= 0) continue;
          ctx.globalAlpha = k; const y = (1 - seg(t, a, a + 0.35, ease.out)) * 14;
          ctx.fillStyle = INK; ctx.font = '500 40px "IBM Plex Mono"'; ctx.letterSpacing = '6px'; ctx.fillText(num, 96, 116 + y);
          ctx.fillStyle = INK_DARK; ctx.font = '700 80px "Space Grotesk"'; ctx.letterSpacing = '0px'; ctx.fillText(text, 92, 204 + y);
        }
        for (const [a, b, text] of NOTES) {
          const k = seg(t, a, a + 0.3, ease.out) * (1 - seg(t, b - 0.25, b)); if (k <= 0) continue;
          ctx.globalAlpha = k; ctx.font = '500 38px "IBM Plex Mono"'; ctx.letterSpacing = '1px';
          const w = ctx.measureText(text).width * seg(t, a, a + 0.5, ease.out);
          ctx.save(); ctx.beginPath(); ctx.rect(90, 230, w + 16, 70); ctx.clip();
          ctx.strokeStyle = 'rgba(242,238,229,0.92)'; ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.strokeText(text, 96, 272);
          ctx.fillStyle = INK; ctx.fillText(text, 96, 272); ctx.restore();
        }
        // end card
        if (t > T.end) { const k = seg(t, T.end, T.end + 0.5, ease.out); ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.letterSpacing = '0px';
          ctx.fillStyle = INK_DARK; ctx.font = '700 104px "Space Grotesk"'; ctx.fillText(ENDCARD[0], 960, 170 + (1 - k) * 16);
          ctx.fillStyle = INK; ctx.font = '500 42px "IBM Plex Mono"'; ctx.letterSpacing = '6px'; ctx.fillText(ENDCARD[1], 960, 240 + (1 - k) * 16); ctx.letterSpacing = '0px'; }
        ctx.globalAlpha = 1; ctx.restore();
        // logo badge, bottom right
        { const r = 54 * s, cx = W - 70 * s - r, cy = H - 64 * s - r; ctx.save(); ctx.globalAlpha = 0.95;
          ctx.fillStyle = '#fbf6ea'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.lineWidth = 3 * s; ctx.strokeStyle = INK; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, r - 4 * s, 0, 7); ctx.clip(); const d = (r - 6 * s) * 2; ctx.drawImage(logo, cx - d / 2, cy - d / 2, d, d); ctx.restore(); }
      },
    };
  },
};
