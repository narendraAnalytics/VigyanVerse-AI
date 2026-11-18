// The Secret Behind a Rainbow: dispersion of light (NCERT Class 10 Science, Chapter 10 "The Human Eye and the
// Colourful World") in the Toy Blocks style from prompt-toyblocks.txt.
// Story (script.txt): a torch beam crosses a dim playroom -> a clear prism block drops into its path and the beam
// bends -> it leaves the prism as seven colours that land on a cream board and VIBGYOR blocks name them -> violet
// bends most, red least -> the room lights up.
//
// Physics kept honest (owner rule: facts must match the NCERT chapter):
//  - every ray is traced with Snell's law at both faces of a 60-degree prism, apex up, so light bends towards the
//    base; each colour has its own refractive index, so red (smallest n) deviates least and violet (largest n) most
//  - the colours start to separate inside the glass (at the first face) and spread further after the second face
//  - the spread is exaggerated so seven colours can be read on a phone: n runs 1.50 (red) to 1.62 (violet); real
//    glass spreads them about ten times less (same order, same idea, as textbook figures do)
import { staticFile } from 'remotion';
import '../kit';
import { PAINT, MAPLE, fallTime, dropPose, lettering, SANS, SERIF, makeToyBox, buildPlayroom } from './toyblocks.js';

const K = window.K, THREE = window.THREE;

// ---------------------------------------------------------------- content (change this block for a new topic)
const TITLE = 'THE SECRET BEHIND A RAINBOW';
const CONCEPT = 'Dispersion of Light';
const WORD = 'RAINBOW';                           // alphabet blocks in the opening shot
const WORD_INKS = ['coral', 'mustard', 'green', 'blue', 'coral', 'mustard', 'blue'];
// red first: smallest refractive index, least bent
const COLOURS = [
  { name: 'Red', letter: 'R', n: 1.50, light: '#ff3a2e', paint: '#c84a3a' },
  { name: 'Orange', letter: 'O', n: 1.52, light: '#ff8a1c', paint: '#d9773a' },
  { name: 'Yellow', letter: 'Y', n: 1.54, light: '#ffe23a', paint: '#e0b23c' },
  { name: 'Green', letter: 'G', n: 1.56, light: '#39d65a', paint: '#4f8d5c' },
  { name: 'Blue', letter: 'B', n: 1.58, light: '#2f8cff', paint: '#3d6a97' },
  { name: 'Indigo', letter: 'I', n: 1.60, light: '#5b4dff', paint: '#4c4a8c' },
  { name: 'Violet', letter: 'V', n: 1.62, light: '#a64dff', paint: '#7a4f93' },
];
const VIBGYOR = [...COLOURS].reverse();           // the block row reads V I B G Y O R, left to right
const CAPTIONS = [
  { text: 'ONE BEAM. SEVEN COLOURS.', from: 2.2, to: 5.9 },
  { text: 'REFRACTION OF LIGHT', from: 6.6, to: 12.9 },
  { text: 'DISPERSION OF WHITE LIGHT', from: 14.0, to: 21.9 },
  { text: ['VIOLET – MAXIMUM DEVIATION', 'RED – MINIMUM DEVIATION'], from: 22.8, to: 28.9 },
];
const ENDCARD = { line1: 'VIGYANVERSE AI', line2: 'UNDERSTAND. VISUALIZE. DISCOVER.', from: 31.0 };
const DURATION = 35;

// one schedule for picture and sound (story time, seconds)
export const T = {
  torch: 0.9,               // the torch clicks on and the beam starts across the room
  prism: 3.0,               // the prism block lands in the beam's path
  enter: 6.6, inside: 9.0,  // the beam crosses the glass
  exit: 13.6, screen: 16.0, // the colours leave the prism and reach the board
  letters: 16.5,            // V I B G Y O R blocks, one by one
  straight: 22.6,           // the dashed "no prism" line
  labelV: 23.6, labelR: 25.2,
  lights: [29.4, 32.2],     // the room comes up
};
const BEAM_SPEED = 1.6;     // units per second while the beam is drawn across the room (slowed down to be seen)

// ---------------------------------------------------------------- the optics (2D, in the plane z = 0)
const Y0 = 1.6, SIDE = 2.4, H = SIDE * Math.sqrt(3) / 2;          // the prism sits on a 1.6-unit plinth
const L0 = [-SIDE / 2, Y0], APEX = [0, Y0 + H], R0 = [SIDE / 2, Y0];
const NL = [-Math.sqrt(3) / 2, 0.5], NR = [Math.sqrt(3) / 2, 0.5];  // outward normals of the two slanted faces
const INC = 20 * Math.PI / 180;                                     // beam rises at 20 deg: 50 deg incidence on the left face
const D0 = [Math.cos(INC), Math.sin(INC)];
const P1 = [L0[0] + 0.6 * (APEX[0] - L0[0]), L0[1] + 0.6 * (APEX[1] - L0[1])];
const SCREEN_X = 4.25, BOARD_YAW = 0.6;   // the board is turned 34 degrees towards the camera so the stripes can be seen
const refract = (d, nrm, eta) => {          // nrm faces the incoming light (nrm . d < 0), eta = n1 / n2
  const ci = -(d[0] * nrm[0] + d[1] * nrm[1]), k = 1 - eta * eta * (1 - ci * ci);
  if (k < 0) throw new Error('total internal reflection');
  const c = eta * ci - Math.sqrt(k);
  return [eta * d[0] + c * nrm[0], eta * d[1] + c * nrm[1]];
};
const RAYS = COLOURS.map((c) => {
  const d1 = refract(D0, NL, 1 / c.n);
  // where the ray inside meets the right face (segment APEX -> R0)
  const ex = R0[0] - APEX[0], ey = R0[1] - APEX[1], den = d1[0] * ey - d1[1] * ex;
  const u = ((APEX[0] - P1[0]) * ey - (APEX[1] - P1[1]) * ex) / den;
  const P2 = [P1[0] + d1[0] * u, P1[1] + d1[1] * u];
  const d2 = refract(d1, [-NR[0], -NR[1]], c.n);
  const s = (SCREEN_X - P2[0]) / d2[0], P3 = [P2[0] + d2[0] * s, P2[1] + d2[1] * s];
  const deviation = (Math.atan2(D0[1], D0[0]) - Math.atan2(d2[1], d2[0])) * 180 / Math.PI;
  return { ...c, d1, P2, d2, P3, inLen: u, outLen: s, deviation };
});
// sanity: violet must deviate most, red least, and every colour must hit the board above the floor
if (!(RAYS[6].deviation > RAYS[0].deviation) || RAYS.some((r) => r.P3[1] < 0.15)) throw new Error('optics check failed');
const BAND = [RAYS[6].P3[1], RAYS[0].P3[1]];      // bottom (violet) and top (red) of the spectrum on the board

// ---------------------------------------------------------------- falling blocks (the reference's physics)
function drops() {
  const r = K.rng(31), list = [];
  const add = (key, tc, x, y, z, size, extra = {}) => {
    const lean = r.sign();
    list.push({ key, tc, x, y, z, size, yaw: extra.yaw ?? r.range(-0.08, 0.08), spin: r.range(0.6, 1.4) * r.sign(), tilt: lean * r.range(0.14, 0.24), tiltX: r.range(-0.1, 0.1), hz: r.range(3.1, 4.0), damp: 5, pivot: [size[0] / 2, size[2] / 2] });
  };
  add('prism', T.prism, 0, Y0 + 0.0001, 0, [SIDE, 0.001, 1.3], { yaw: 0 });
  VIBGYOR.forEach((c, i) => add('letter' + i, T.letters + i * 0.5, 1.1 + i * 0.66, 0.3, 2.05, [0.6, 0.6, 0.6], { yaw: r.range(-0.12, 0.12) }));
  add('labelV', T.labelV, 2.45, 0.32, -1.75, [2.6, 0.64, 0.8], { yaw: 0.02 });
  // red's label stands on top of the board, right above the red stripe, facing the same way as the board
  add('labelR', T.labelR, SCREEN_X + 0.15 * Math.cos(BOARD_YAW), 2.7 + 0.32, -0.15 * Math.sin(BOARD_YAW), [2.6, 0.64, 0.8], { yaw: BOARD_YAW - Math.PI / 2 });
  return list;
}

export const SOUND_CUES = (() => {
  const c = [[T.torch, 'switch', 0.4]];
  for (const d of drops()) c.push([d.tc, 'mouse-click', d.key === 'prism' ? 0.4 : 0.26]);   // wood (and acrylic) on wood
  for (const t of [2.4, 6.2, 13.2, 22.2, 29.2]) c.push([t, 'whoosh', 0.1]);                    // the camera travels
  c.push([T.screen, 'ding', 0.16]);                                                            // the colours land
  c.push([T.letters + 6 * 0.5 + 0.4, 'ding', 0.2]);                                            // VIBGYOR is complete
  return c;
})();

export const rainbowStyle = {
  id: 'toy-blocks-rainbow',
  name: 'Toy Blocks: dispersion of light',
  topic: 'Dispersion of white light by a glass prism (Class 10, Chapter 10)',
  duration: DURATION,
  fonts: ['700 100px "Fredoka"', '900 100px "Fraunces"', '600 50px "Fredoka"'],
  render: { samples: 32, shutter: 0.5, tone: 'neutral', exposure: 1.0, bloom: 0.16, bloomThreshold: 1.2, vignette: 0.3, grain: 0.018, fov: 24, background: '#2c2a26', contrast: 1.05, saturation: 1.04 },

  async build(S) {
    const { scene, camera } = S;
    const toy = makeToyBox(S), list = drops(), rnd = K.rng(4);
    const put = (m, x, y, z, ry = 0, rx = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); scene.add(m); return m; };
    const { sun, sky } = buildPlayroom(S, toy);
    const SUN = sun.intensity, SKY = sky.intensity;
    const logo = await new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = staticFile('logo.png'); });

    // ---------------- the opening word: RAINBOW in alphabet blocks on the floor
    const LETTER = 0.82;
    [...WORD].forEach((ch, i) => {
      const ink = PAINT[WORD_INKS[i]], other = PAINT[WORD_INKS[(i + 2) % WORD_INKS.length]];
      put(toy.block({ size: [LETTER, LETTER, LETTER], seed: 100 + i, grain: i % 3 === 1 ? 'y' : 'x', faces: {
        front: { ink, art: lettering(ch, SERIF, 0.5, 0.085) }, top: { paint: ink }, bottom: { paint: ink },
        left: { paint: other, art: lettering(ch, SERIF, 0.5) }, right: { paint: other, art: lettering(ch, SERIF, 0.5) }, back: { ink, art: lettering(ch, SERIF, 0.5, 0.085) },
      } }), -5.0 + i * (LETTER + 0.07) + rnd.range(-0.02, 0.02), LETTER / 2, 3.6 + rnd.range(-0.07, 0.07), rnd.range(-0.09, 0.09));
    });

    // ---------------- the torch on its block stand, pointing up at 20 degrees
    const TORCH_LEN = 1.3, TORCH_R = 0.3, lensAt = [P1[0] - D0[0] * 3.6, P1[1] - D0[1] * 3.6];
    const torchC = [lensAt[0] - D0[0] * TORCH_LEN / 2, lensAt[1] - D0[1] * TORCH_LEN / 2];
    const standH = torchC[1] - TORCH_R - 0.04;
    put(toy.block({ size: [1.1, standH, 1.0], seed: 140, grain: 'y', faces: { front: { paint: PAINT.blue }, back: { paint: PAINT.blue }, top: { paint: PAINT.blue }, left: { paint: PAINT.blue }, right: { paint: PAINT.blue } } }), torchC[0] + 0.05, standH / 2, 0, 0.04);
    const torch = toy.cylinder(TORCH_R, TORCH_LEN, { paint: PAINT.coral, seed: 141 });
    put(torch, torchC[0], torchC[1], 0, 0, 0, INC - Math.PI / 2);
    const lensMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6e4') });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(TORCH_R * 0.78, 40), lensMat);
    lens.position.set(lensAt[0] + D0[0] * 0.012, lensAt[1] + D0[1] * 0.012, 0); lens.lookAt(lensAt[0] + D0[0] * 2, lensAt[1] + D0[1] * 2, 0); scene.add(lens);

    // ---------------- the plinth and the clear prism block (acrylic: it refracts what is behind it)
    put(toy.block({ size: [2.9, 0.8, 1.7], seed: 150, faces: { front: { paint: PAINT.mustard }, back: { paint: PAINT.mustard }, top: { paint: PAINT.mustard }, left: { paint: PAINT.mustard }, right: { paint: PAINT.mustard } } }), 0, 0.4, 0);
    put(toy.block({ size: [2.7, 0.8, 1.55], seed: 151, faces: { front: { paint: PAINT.green }, back: { paint: PAINT.green }, top: { paint: PAINT.green }, left: { paint: PAINT.green }, right: { paint: PAINT.green } } }), 0, 1.2, 0, 0.02);
    const tri = new THREE.Shape(); tri.moveTo(L0[0], 0); tri.lineTo(R0[0], 0); tri.lineTo(0, H); tri.closePath();
    const bev = 0.05, prismGeo = new THREE.ExtrudeGeometry(tri, { depth: 1.3 - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 3 });
    prismGeo.translate(0, 0, -(1.3 - 2 * bev) / 2);
    const glass = new THREE.MeshPhysicalMaterial({ color: '#f4fbff', transmission: 1, thickness: 1.2, ior: 1.5, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, attenuationColor: '#dff4ff', attenuationDistance: 6, depthWrite: false, envMapIntensity: 1.4 });
    const prism = new THREE.Mesh(prismGeo, glass); prism.castShadow = false; prism.receiveShadow = false; scene.add(prism);
    prism.rotation.order = 'ZXY';

    // ---------------- the cream board the colours land on, facing the prism
    const boardH = 2.7, board = toy.block({ size: [0.3, boardH, 2.4], seed: 160, grain: 'y', faces: { left: { paint: PAINT.cream }, right: { paint: PAINT.cream }, front: { paint: PAINT.cream }, back: { paint: PAINT.cream }, top: { paint: PAINT.cream } } });
    const bc = [SCREEN_X + 0.15 * Math.cos(BOARD_YAW), -0.15 * Math.sin(BOARD_YAW)];   // centre, so the face passes through the rays' end points
    put(board, bc[0], boardH / 2, bc[1], BOARD_YAW);
    for (const s of [-1, 1]) put(toy.block({ size: [1.0, 0.35, 0.4], seed: 161 + s, faces: { top: { paint: PAINT.blue }, front: { paint: PAINT.blue }, back: { paint: PAINT.blue } } }), bc[0] + s * 0.95 * Math.sin(BOARD_YAW), 0.175, bc[1] + s * 0.95 * Math.cos(BOARD_YAW), BOARD_YAW);

    // ---------------- light: beams are glowing bars (additive), each with a soft halo
    const glowMat = (css, k, opacity = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(css).multiplyScalar(k), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    const bar = (mat, thick, wide) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, thick, wide), mat); m.renderOrder = 5; scene.add(m); return m; };
    const lay = (m, a, dir, len) => { m.visible = len > 0.002; if (!m.visible) return; m.position.set(a[0] + dir[0] * len / 2, a[1] + dir[1] * len / 2, 0); m.rotation.set(0, 0, Math.atan2(dir[1], dir[0])); m.scale.set(len, 1, 1); };
    const white = { core: bar(glowMat('#fff3df', 2.6), 0.07, 0.34), halo: bar(glowMat('#ffe9c8', 0.9, 0.18), 0.26, 0.6) };
    const rays = RAYS.map((r) => ({
      r,
      inCore: bar(glowMat(r.light, 0.55), 0.06, 0.3),
      outCore: bar(glowMat(r.light, 2.2), 0.055, 0.32), outHalo: bar(glowMat(r.light, 0.7, 0.16), 0.2, 0.5),
      // where it lands on the board: a stripe of light (height = halfway to its neighbours)
      spot: (() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat(r.light, 1.5, 0.95)); m.rotation.y = -Math.PI / 2 + BOARD_YAW; m.renderOrder = 6; scene.add(m); return m; })(),
    }));
    const stripeH = (BAND[1] - BAND[0]) / 6;
    rays.forEach(({ r, spot }) => { spot.position.set(SCREEN_X - 0.006 * Math.cos(BOARD_YAW), r.P3[1], 0.006 * Math.sin(BOARD_YAW)); spot.scale.set(0.34, stripeH * 1.05, 1); });
    const spectrumLights = [0, 3, 6].map((i) => { const l = new THREE.PointLight(RAYS[i].light, 0, 0, 2); l.position.set(SCREEN_X - 0.7, RAYS[i].P3[1], 0.2); scene.add(l); return l; });
    // the path the light would take with no prism: small dashes along the original direction
    const dashMat = glowMat('#fff3df', 0.9, 0.85), dashes = [];
    for (let i = 0; i < 14; i++) { const m = bar(dashMat, 0.035, 0.12); dashes.push(m); }

    // ---------------- the VIBGYOR blocks and the two label bricks
    const bodies = {};
    VIBGYOR.forEach((c, i) => {
      const ink = c.paint, f = { paint: PAINT.cream, ink, art: lettering(c.letter, SERIF, 0.56, 0.09) };
      bodies['letter' + i] = put(toy.block({ size: [0.6, 0.6, 0.6], seed: 200 + i, grain: i % 2 ? 'x' : 'y', faces: { front: f, back: f, left: { paint: ink }, right: { paint: ink }, top: { paint: ink }, bottom: { paint: ink } } }), 0, 30, 0);
    });
    const brick = (text, ink, seed) => { const f = { paint: PAINT.cream, ink, art: lettering(text, SANS, 0.25) }; return put(toy.block({ size: [2.6, 0.64, 0.8], seed, faces: { front: f, back: f, top: { paint: PAINT.cream }, left: { paint: ink }, right: { paint: ink } } }), 0, 30, 0); };
    bodies.labelV = brick('VIOLET · BENDS MOST', RAYS[6].paint, 220);
    bodies.labelR = brick('RED · BENDS LEAST', RAYS[0].paint, 221);
    // the stands under the label bricks: one cube for violet, two for red (so each label sits by its ray)
    const cube = (x, y, z, seed, p) => put(toy.block({ size: [1, 1, 1], seed, faces: { front: { paint: p }, top: { paint: p }, left: { paint: p }, right: { paint: p } } }), x, y, z, rnd.range(-0.05, 0.05));
    for (const d of list) if (d.key !== 'prism') bodies[d.key].rotation.order = 'ZXY';

    // ---------------- camera: close on RAINBOW, crane up to the torch and the beam, follow the light through the prism,
    // arc round to the board as the colours land, push in on violet and red, then pull back to the whole room
    const keys = [
      [0, [-2.4, 1.35, 12.4], [-2.35, 0.6, 3.6]],
      [2.4, [-2.9, 2.6, 12.6], [-1.6, 2.0, 0.6]],
      [5.6, [-1.2, 3.1, 12.8], [-0.4, 2.3, 0]],
      [8.6, [0.2, 3.1, 9.4], [0.1, 2.55, 0]],
      [12.6, [0.9, 3.0, 9.8], [0.6, 2.45, 0]],
      [16.0, [2.0, 2.7, 11.6], [2.3, 1.85, 0.3]],
      [21.6, [4.4, 2.5, 11.0], [2.6, 1.6, 0.4]],
      [24.8, [4.6, 2.2, 8.4], [2.9, 1.55, 0]],
      [28.6, [4.0, 2.25, 8.8], [2.7, 1.6, 0]],
      [31.6, [1.4, 4.3, 17.4], [0.6, 1.4, 0]],
      [35.0, [1.3, 4.15, 16.7], [0.6, 1.4, 0]],
    ];
    const cam = { pos: K.path(keys.map(([t, p]) => [t, p])), aim: K.path(keys.map(([t, , a]) => [t, a])),
      ap: K.track([[0, 0.05], [2.4, 0.08], [8.6, 0.07], [16, 0.09], [24.8, 0.07], [31.6, 0.1], [35, 0.1]]) };

    return {
      update(t) {
        // the room: dim until the end, when the sun comes up through the window
        const up = K.smooth(T.lights[0], T.lights[1], t);
        sun.intensity = SUN * K.lerp(0.2, 1, up); sky.intensity = SKY * K.lerp(0.35, 1, up);
        scene.environmentIntensity = 0.5 * K.lerp(0.4, 1, up);

        // the torch and the white beam: drawn across the room, then stopped by the prism's first face
        const on = t >= T.torch;
        lensMat.color.set(on ? '#fff6e4' : '#9c9286').multiplyScalar(on ? 2.4 : 1);
        const reach = on ? (t - T.torch) * BEAM_SPEED : 0, toP1 = Math.hypot(P1[0] - lensAt[0], P1[1] - lensAt[1]);
        const whiteLen = Math.min(reach, toP1);
        lay(white.core, lensAt, D0, whiteLen); lay(white.halo, lensAt, D0, whiteLen);
        // inside the glass the colours already part a little; outside they fan out
        const kIn = K.seg(t, T.enter, T.inside), kOut = K.seg(t, T.exit, T.screen);
        for (const { r, inCore, outCore, outHalo, spot } of rays) {
          lay(inCore, P1, r.d1, r.inLen * kIn);
          lay(outCore, r.P2, r.d2, r.outLen * kOut); lay(outHalo, r.P2, r.d2, r.outLen * kOut);
          spot.visible = kOut >= 1;
        }
        const glow = K.smooth(T.screen, T.screen + 0.6, t) * K.lerp(1, 2.2, up);
        spectrumLights.forEach((l) => { l.intensity = 2.2 * glow; });
        // the dashed straight-on path, drawn out during the deviation beat
        const kd = K.seg(t, T.straight, T.straight + 1.2);
        dashes.forEach((m, i) => { const s0 = 0.25 + i * 0.32, len = 0.17; const vis = kd * dashes.length > i; lay(m, [P1[0] + D0[0] * s0, P1[1] + D0[1] * s0], D0, vis ? len : 0); });

        // falling blocks
        for (const d of list) {
          const p = dropPose(K, d, t), tau = t - d.tc, vis = tau > -fallTime(d);
          if (d.key === 'prism') {
            // the prism falls into the beam's path, base first, and rocks to rest on the plinth
            prism.visible = vis;
            prism.position.set(p.x, p.y - 0.0001, 0); prism.rotation.set(p.rx * 0.5, 0, p.rz * 0.5);
            continue;
          }
          const m = bodies[d.key]; m.visible = vis;
          m.position.set(p.x, p.y, p.z); m.rotation.set(p.rx, p.ry, p.rz);
        }

        const pc = cam.pos(t), a = cam.aim(t);
        K.look(camera, pc, a); K.focus(camera, a, cam.ap(t));
      },

      // title card, captions, end card, and the logo badge bottom right
      overlay(ctx, t, W, Hh) {
        const s = W / 1920;
        { const r = 54 * s, cx = W - 70 * s - r, cy = Hh - 64 * s - r; ctx.save(); ctx.globalAlpha = 0.95;
          ctx.fillStyle = '#fbf6ea'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.lineWidth = 3 * s; ctx.strokeStyle = '#c9a24a'; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, r - 4 * s, 0, 7); ctx.clip(); const d = (r - 6 * s) * 2; ctx.drawImage(logo, cx - d / 2, cy - d / 2, d, d); ctx.restore(); }
        const plate = (x, y, w, h, alpha) => { ctx.fillStyle = `rgba(28,22,16,${0.6 * alpha})`; ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(h / 2, 40 * s)); ctx.fill(); };
        // the title, on screen from the first frame
        const ta = 1 - K.smooth(5.4, 6.2, t);
        if (ta > 0) {
          ctx.save(); ctx.globalAlpha = ta; ctx.textAlign = 'center';
          ctx.font = `900 ${Math.round(64 * s)}px Fraunces`; const w1 = ctx.measureText(TITLE).width;
          plate(W / 2 - w1 / 2 - 44 * s, 70 * s, w1 + 88 * s, 150 * s, 1);
          ctx.fillStyle = '#fbf3e2'; ctx.fillText(TITLE, W / 2, 148 * s);
          ctx.font = `600 ${Math.round(36 * s)}px Fredoka`; ctx.fillStyle = '#f2c46a'; ctx.fillText(CONCEPT, W / 2, 196 * s);
          ctx.restore();
        }
        for (const c of CAPTIONS) {
          if (t < c.from || t > c.to) continue;
          const lines = Array.isArray(c.text) ? c.text : [c.text], alpha = Math.min(K.clamp((t - c.from) / 0.2), K.clamp((c.to - t) / 0.25));
          ctx.save(); ctx.globalAlpha = alpha; ctx.font = `600 ${Math.round(44 * s)}px Fredoka`;
          const w = Math.max(...lines.map((l) => ctx.measureText(l).width)), lh = 58 * s, x = 120 * s, yb = Hh - 120 * s;
          plate(x - 30 * s, yb - 50 * s - (lines.length - 1) * lh, w + 60 * s, 72 * s + (lines.length - 1) * lh, 1);
          lines.forEach((l, i) => { ctx.fillStyle = l.startsWith('VIOLET') ? '#d9b3ff' : l.startsWith('RED') ? '#ffb3a8' : '#fbf3e2'; ctx.fillText(l, x, yb - (lines.length - 1 - i) * lh); });
          ctx.restore();
        }
        if (t >= ENDCARD.from) {
          const alpha = K.clamp((t - ENDCARD.from) / 0.5);
          ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'center';
          ctx.font = `900 ${Math.round(50 * s)}px Fraunces`; const w1 = ctx.measureText(ENDCARD.line1).width;
          ctx.font = `600 ${Math.round(30 * s)}px Fredoka`; const w2 = ctx.measureText(ENDCARD.line2).width, w = Math.max(w1, w2);
          plate(W / 2 - w / 2 - 40 * s, Hh - 176 * s, w + 80 * s, 130 * s, 1);
          ctx.font = `900 ${Math.round(50 * s)}px Fraunces`; ctx.fillStyle = '#fbf3e2'; ctx.fillText(ENDCARD.line1, W / 2, Hh - 112 * s);
          ctx.font = `600 ${Math.round(30 * s)}px Fredoka`; ctx.fillStyle = '#f2c46a'; ctx.fillText(ENDCARD.line2, W / 2, Hh - 68 * s);
          ctx.restore();
        }
      },
    };
  },
};
