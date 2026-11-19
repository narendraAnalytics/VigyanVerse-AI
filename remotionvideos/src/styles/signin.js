// Sign in: a 15-second welcome for the sign-in page, in the Spotlight Stage style from prompt-spotlightstage.txt.
// A toy theatre. The back flat is painted as the emerald VigyanVerse book cover (the picture this video replaces on
// the page). A girl slides in and says signing in takes one tap; two button cards are flown in ("Sign in with
// Google", "Sign in with GitHub": words only, no brand logos); a boy slides in and says to pick either; each taps one,
// the cover parts like a pair of doors onto a warm lit page, and they are in.
import { staticFile } from 'remotion';
import '../kit';
import { makeTheatre } from './spotlight.js';

const K = window.K, THREE = window.THREE;

// ---------------------------------------------------------------- content: the play
const CARDS = [
  { place: 'VigyanVerse AI', lines: ['New here?', 'One tap to start'] },
  { place: 'Sign in with', lines: ['Google', 'or GitHub'] },
  { place: 'VigyanVerse AI', lines: ["You're in!", "Let's learn!"] },
];
const BUTTONS = [
  { text: 'Sign in with Google', fill: '#f6d27a', ink: '#7a2338' },     // butter yellow, maroon ink
  { text: 'Sign in with GitHub', fill: '#a8d5b5', ink: '#1f5a46' },     // mint, deep green ink
];
const D = 15.5;
export const BEATS = [0, 5.6, 9.6, 11.7, D];
// the prompt book: every move on one clock (story time = video time: the beats were fitted to the narration)
export const CUE = {
  girlIn: [0.25, 1.5], buttons: [[2.5, 3.3], [3.1, 3.9]], boyIn: [5.0, 6.2], card: [5.6, 9.6],
  tapGirl: 6.75, tapBoy: 7.55, open: [9.75, 10.9], gather: [11.8, 13.0],
};
const GIRL_X = -1.5, BOY_X = 2.35, BTN_X = 0.4, BTN_Y = [2.27, 1.55], BTN_HALF = 1.45;

// sound cues (story time): gentle Remotion effects on the same schedule as the picture
export const SOUND_CUES = [
  [CUE.girlIn[0], 'whoosh', 0.06], ...CUE.buttons.map(([a, b]) => [[a, 'whoosh', 0.09], [b - 0.05, 'mouse-click', 0.16]]).flat(),
  [CUE.boyIn[0], 'whoosh', 0.06], [CUE.card[0], 'page-turn', 0.2], [CUE.tapGirl, 'mouse-click', 0.32], [CUE.tapBoy, 'mouse-click', 0.32],
  [CUE.card[1], 'page-turn', 0.2], [CUE.open[0], 'whoosh', 0.14], [CUE.open[1] - 0.3, 'ding', 0.18], [CUE.gather[1], 'switch', 0.06],
];

export const signinStyle = {
  id: 'spotlight-stage-signin',
  name: 'Spotlight Stage: sign in',
  topic: 'Sign in to VigyanVerse with Google or GitHub',
  duration: D,
  fonts: ['400 100px "Kalam"', '700 100px "Kalam"', '800 100px "Playfair Display"'],
  render: { samples: 24, shutter: 0.4, tone: 'filmic', exposure: 1.0, bloom: 0.3, bloomThreshold: 1.3, vignette: 0.42, grain: 0.014, fov: 30, background: '#010102' },

  async build(S) {
    const { camera } = S;
    const th = makeTheatre(S);
    const { add, TAU, Z, OPEN_X, HEM_Y, follow, follow2, wash, top, cardLamp, horizon, curtains, cutout, hung, onSlot, ell, rect, round, strip, limb, place, label, wood, steel } = th;
    const logo = await new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = staticFile('logo.png'); });

    // ------------------------------------------------------------ the back flat: the VigyanVerse cover, in two halves
    const WALL = { w: 6.4, h: 6.2, split: 0 };
    function paintCover(c) {
      const { w, h } = WALL;
      const g = c.createLinearGradient(-3, h, 3, 0); g.addColorStop(0, '#23706b'); g.addColorStop(0.7, '#174845'); g.addColorStop(1, '#113533');
      c.fillStyle = g; c.fillRect(-w, 0, 2 * w, h);
      c.strokeStyle = 'rgba(0,0,0,0.06)'; c.lineWidth = 0.02; for (let x = -w - h; x < w; x += 0.09) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.stroke(); }   // the cloth's weave
      c.strokeStyle = '#c9a24a'; c.lineWidth = 0.05; c.strokeRect(-4.05, 0.28, 8.1, 4.62); c.lineWidth = 0.025; c.strokeRect(-3.88, 0.42, 7.76, 4.34);   // gold double frame
      for (const [x, y, a] of [[-3.88, 0.42, 0], [3.88, 0.42, Math.PI / 2], [3.88, 4.76, Math.PI], [-3.88, 4.76, -Math.PI / 2]]) {   // Art Deco corner fans
        c.save(); c.translate(x, y); c.rotate(a); c.strokeStyle = '#c9a24a'; c.lineWidth = 0.02;
        for (const r of [0.3, 0.48, 0.66]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI / 2); c.stroke(); }
        for (let k = 1; k < 6; k++) { const q = k / 6 * Math.PI / 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(q) * 0.66, Math.sin(q) * 0.66); c.stroke(); }
        c.restore();
      }
      // the emblem: the logo in a cream roundel, high on the cover so the actors and buttons never hide it
      const cy = 4.0; c.fillStyle = 'rgba(201,162,74,0.35)'; c.beginPath(); c.arc(0, cy, 0.62, 0, TAU); c.fill();
      c.fillStyle = '#f3e9d2'; c.beginPath(); c.arc(0, cy, 0.5, 0, TAU); c.fill();
      c.save(); c.translate(0, cy); c.scale(1, -1); c.drawImage(logo, -0.44, -0.44, 0.88, 0.88); c.restore();
      label(c, 'VigyanVerse', -0.18, 3.08, 0.6, '800 100px "Playfair Display"', '#f3e9d2');
      label(c, 'AI', 1.78, 3.02, 0.36, 'italic 800 100px "Playfair Display"', '#d9b45c');
    }
    const coverL = cutout([{ draw: paintCover }, { pts: rect(-WALL.w, 0, WALL.split, WALL.h) }], { res: 200, seed: 2 }); coverL.position.z = Z.wall;
    const coverR = cutout([{ draw: paintCover }, { pts: rect(WALL.split, 0, WALL.w, WALL.h) }], { res: 200, seed: 3 }); coverR.position.z = Z.wall + 0.004;

    // ------------------------------------------------------------ behind it: a warm lit page, the world the students step into
    const SKY = { w: 18, h: 8.6, y0: -0.6 };
    const sky = add(new THREE.PlaneGeometry(SKY.w, SKY.h), new THREE.MeshStandardMaterial({ roughness: 1, map: K.canvasTex(2048, 1024, (c, w, h) => {
      const Y = (y) => h * (1 - (y - SKY.y0) / SKY.h), X = (x) => (x / SKY.w + 0.5) * w, g = c.createLinearGradient(0, Y(6), 0, Y(0.5)), r = K.rng(8);
      g.addColorStop(0, '#f1dcae'); g.addColorStop(1, '#f7ead0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(120,150,190,0.35)'; c.lineWidth = 2; for (let y = 0.6; y < 6.5; y += 0.42) { c.beginPath(); c.moveTo(0, Y(y)); c.lineTo(w, Y(y)); c.stroke(); }   // ruled lines
      c.strokeStyle = 'rgba(200,80,80,0.4)'; c.beginPath(); c.moveTo(X(-3.6), 0); c.lineTo(X(-3.6), h); c.stroke();                                                     // the margin
      const ink = '#8a5a1e'; c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 5; c.lineCap = 'round';
      { const x = X(-1.9), y = Y(3.6); for (const a of [0, 1.05, 2.1]) { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 95, 34, 0, 0, TAU); c.stroke(); c.restore(); } c.beginPath(); c.arc(x, y, 12, 0, TAU); c.fill(); }   // an atom
      { const x = X(0.6), y = Y(3.2); c.beginPath(); c.moveTo(x - 18, y - 80); c.lineTo(x - 18, y - 20); c.lineTo(x - 70, y + 60); c.lineTo(x + 70, y + 60); c.lineTo(x + 18, y - 20); c.lineTo(x + 18, y - 80); c.stroke(); c.beginPath(); c.moveTo(x - 50, y + 30); c.lineTo(x + 50, y + 30); c.stroke(); }   // a flask
      { const x = X(2.9), y = Y(3.7); c.beginPath(); c.moveTo(x - 60, y + 60); c.quadraticCurveTo(x - 70, y - 50, x + 60, y - 70); c.quadraticCurveTo(x + 40, y + 40, x - 60, y + 60); c.stroke(); c.beginPath(); c.moveTo(x - 60, y + 60); c.lineTo(x + 30, y - 40); c.stroke(); }   // a leaf
      for (let i = 0; i < 26; i++) { const x = r.range(0, w), y = Y(r.range(1.0, 5.6)), s = r.range(6, 14); c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.lineWidth = 3; c.stroke(); }   // sparkles
      for (let i = 0; i < w * h / 300; i++) { c.fillStyle = r.chance(0.5) ? `rgba(255,250,235,${r.range(0.02, 0.06)})` : `rgba(80,50,20,${r.range(0.02, 0.05)})`; c.fillRect(r.range(0, w), r.range(0, h), r.range(1, 3), r.range(1, 3)); }
    }) }), [0, SKY.y0 + SKY.h / 2, Z.sky], undefined, false);
    sky.receiveShadow = false;

    // ------------------------------------------------------------ the two button cards, flown in on rods
    function buttonArt(b) {
      const it = [{ pts: round(rect(-BTN_HALF, -0.3, BTN_HALF, 0.3), 3), fill: b.fill, ink: 0.014 }];
      it.push({ draw(c) { label(c, b.text, 0, -0.02, 0.33, '700 100px "Kalam"', b.ink); } });
      return it;
    }
    const buttons = BUTTONS.map((b, i) => {
      const m = cutout(buttonArt(b), { res: 320, seed: 40 + i, thick: 0.04 });
      const g = hung(m, Z.hang - i * 0.03, [[-1.05, 0.22], [1.05, 0.22]]); g.position.x = BTN_X; return g;
    });

    // ------------------------------------------------------------ the two students: profile cut-outs, the near arm on its own pivot
    const SKIN = '#c98e68', SHIRT = '#f2efe6', NAVY = '#22314f', SHOE = '#191715';
    function studentArt(o) {   // facing right at height 1, without the near arm
      const it = [], st = 0.02;
      it.push({ pts: round([[-0.2, 0.5], [-0.07, 0.5], [-0.06, 0.78], [-0.18, 0.79], [-0.22, 0.7]], 2), fill: o.bag });                     // school bag on the back
      it.push({ pts: limb(0, 0.775, 0.02, 0.6, 0.038, 0.033), fill: '#dcd8cc' }, { pts: limb(0.02, 0.6, 0.05, 0.43, 0.03, 0.026), fill: SKIN }, { pts: ell(0.05, 0.42, 0.026, 0.026, 12), fill: SKIN });   // far arm
      if (o.girl) {
        it.push({ pts: limb(-0.03, 0.3, -0.04 - st, 0.05, 0.034, 0.03), fill: SKIN }, { pts: limb(0.02, 0.3, 0.04 + st, 0.05, 0.036, 0.03), fill: SKIN });   // legs
        for (const s of [-1, 1]) it.push({ pts: limb(s * 0.03, 0.16, s * 0.035 + s * st, 0.05, 0.034, 0.032), fill: '#f4f2ec' });                         // white socks
      } else {
        it.push({ pts: limb(-0.03, 0.48, -0.05 - st, 0.05, 0.06, 0.038), fill: '#1a2540' }, { pts: limb(0.02, 0.48, 0.05 + st, 0.05, 0.064, 0.04), fill: NAVY });   // trousers
      }
      it.push({ pts: limb(-0.095 - st, 0.02, -0.005 - st, 0.02, 0.024), fill: SHOE }, { pts: limb(0.02 + st, 0.02, 0.125 + st, 0.02, 0.024), fill: SHOE });
      it.push({ pts: round([[-0.09, 0.45], [0.08, 0.45], [0.1, 0.58], [0.09, 0.72], [0.05, 0.8], [-0.03, 0.815], [-0.1, 0.77], [-0.11, 0.62]], 2), fill: SHIRT });   // shirt
      if (o.girl) it.push({ pts: [[-0.12, 0.27], [0.13, 0.27], [0.095, 0.5], [-0.1, 0.5]], fill: NAVY });                                   // skirt
      else it.push({ pts: rect(-0.1, 0.44, 0.09, 0.48), fill: '#3a2c20', cut: false, ink: 0.004 });                                         // belt
      it.push({ pts: [[0.03, 0.79], [0.055, 0.79], [0.07, 0.6], [0.05, 0.57], [0.035, 0.6]], fill: o.tie, cut: false, ink: 0.004 });        // school tie
      it.push({ line: [[-0.06, 0.79], [-0.09, 0.5]], w: 0.012, color: '#5a3d2a' });                                                         // bag strap
      it.push({ pts: limb(0, 0.8, 0.01, 0.86, 0.03), fill: SKIN }, { pts: [[-0.04, 0.8], [0.048, 0.8], [0.052, 0.832], [-0.034, 0.836]], fill: SHIRT });   // neck, collar
      it.push({ pts: [[0.062, 0.93], [0.086, 0.902], [0.06, 0.892]], fill: SKIN }, { pts: ell(0.012, 0.918, 0.056, 0.068), fill: SKIN });   // nose, head
      it.push({ pts: ell(-0.004, 0.912, 0.011, 0.017, 10), fill: '#b37b58', cut: false, ink: 0.005 }, { pts: ell(0.04, 0.93, 0.006, 0.008, 8), fill: '#14110e', cut: false, ink: 0 });   // ear, eye
      it.push({ line: [[0.05, 0.882], [0.066, 0.878], [0.072, 0.884]], w: 0.006, color: '#7a3b2a' });                                       // a smile
      if (o.girl) {
        it.push({ pts: ell(0.006, 0.922, 0.064, 0.076, 16, 0.55, 3.9).concat([[-0.02, 0.9], [-0.03, 0.85]]), fill: '#1d1612' });            // hair, parted, pulled back
        it.push({ pts: strip([[-0.05, 0.9], [-0.075, 0.84], [-0.085, 0.76], [-0.08, 0.68]], (u) => 0.045 * (1 - 0.5 * u)), fill: '#1d1612' });   // the plait
        it.push({ pts: ell(-0.08, 0.675, 0.022, 0.016, 10), fill: '#c0392b' });                                                            // ribbon
      } else {
        it.push({ pts: ell(0.01, 0.93, 0.066, 0.078, 14, 0.25, 3.9).concat([[-0.03, 0.89], [-0.01, 0.9]]), fill: '#15110d' });   // short hair
      }
      return place(it, o.h, 0, 0, 1);
    }
    function armArt(h) {   // hangs straight down from the shoulder at the origin
      return place([{ pts: limb(0, 0, 0, -0.17, 0.042, 0.036), fill: SHIRT }, { pts: limb(0, -0.15, 0, -0.38, 0.03, 0.026), fill: SKIN }, { pts: ell(0, -0.395, 0.03, 0.032, 12), fill: SKIN }], h);
    }
    const H = 2.3, SHOULDER = 0.775 * H;
    function student(o, x, wing) {
      const actor = new THREE.Group(); actor.scale.x = o.facing;
      actor.add(cutout(studentArt({ ...o, h: H }), { seed: o.seed, res: 320 }));
      const pivot = new THREE.Group(); pivot.position.set(0.0, SHOULDER, 0.035); actor.add(pivot);
      pivot.add(cutout(armArt(H), { seed: o.seed + 1, res: 320, thick: 0.03 }));
      const g = onSlot(actor, Z.men, wing, 0.7); g.position.x = x; g.userData.arm = pivot; return g;
    }
    const girl = student({ girl: true, facing: 1, bag: '#b8402f', tie: '#7a1f2a', seed: 12 }, GIRL_X, -1);
    const boy = student({ girl: false, facing: -1, bag: '#2f6d9a', tie: '#7a1f2a', seed: 15 }, BOY_X, 1);

    // ------------------------------------------------------------ the easel at the front of the stage: one card per scene
    const EASEL = { x: -2.8, w: 2.3, h: 1.2, y: 0.3, tilt: -0.1 }, CPX = 360, INKC = '#8a5a2b', LINE_INK = ['#1f6b4f', '#7b3f6e'];
    const fit = (c, text, font, maxPx, width) => { c.font = `${font} 100px "Kalam"`; return Math.min(maxPx, 100 * width / c.measureText(text).width); };
    function drawCard(c, W, Hh, card) {
      c.fillStyle = '#f3e6c4'; c.fillRect(0, 0, W, Hh);
      const r = K.rng(77); for (let i = 0; i < 2600; i++) { c.fillStyle = r.chance(0.5) ? `rgba(255,250,235,${r.range(0.03, 0.08)})` : `rgba(60,40,15,${r.range(0.02, 0.06)})`; c.fillRect(r.range(0, W), r.range(0, Hh), r.range(1, 4), r.range(1, 4)); }
      c.strokeStyle = INKC; c.lineWidth = 6; c.strokeRect(18, 18, W - 36, Hh - 36); c.lineWidth = 2; c.strokeRect(30, 30, W - 60, Hh - 60);
      c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#b04a25';
      c.letterSpacing = '3px'; const kp = fit(c, card.place, '700', 74, W - 170); c.font = `700 ${kp}px "Kalam"`; c.fillText(card.place, W / 2 + 3, 108); c.letterSpacing = '0px';
      c.fillRect(W / 2 - 70, 142, 140, 4);
      [278, 410].forEach((y, i) => { const l = card.lines[i], px = fit(c, l, '700', 132, W - 120); c.fillStyle = LINE_INK[i]; c.font = `700 ${px}px "Kalam"`; c.fillText(l, W / 2, y - (132 - px) * 0.2); });
    }
    const easel = new THREE.Group(); easel.position.set(EASEL.x, 0, Z.easel); easel.rotation.x = EASEL.tilt; S.scene.add(easel);
    for (const sx of [-1, 1]) { const leg = add(K.roundedBox(0.07, 1.9, 0.05, 0.012, 2), wood, [sx * 0.95, 0.93, -0.06], easel); leg.rotation.z = -sx * 0.07; }
    add(K.roundedBox(EASEL.w + 0.2, 0.05, 0.14, 0.012, 2), wood, [0, EASEL.y - 0.03, 0.03], easel);
    const edgeMat = new THREE.MeshStandardMaterial({ color: '#d9cdb0', roughness: 0.9 }), backMat = new THREE.MeshStandardMaterial({ color: '#cbbd9c', roughness: 0.95 });
    const cards = CARDS.map((card, i) => {
      const tex = K.canvasTex(EASEL.w * CPX, Math.round(EASEL.h * CPX), (c, W, Hh) => drawCard(c, W, Hh, card));
      return add(new THREE.BoxGeometry(EASEL.w, EASEL.h, 0.014), [edgeMat, edgeMat, edgeMat, edgeMat, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), backMat], [0, EASEL.y + EASEL.h / 2, 0.02 * (CARDS.length - i)], easel);
    });

    // ------------------------------------------------------------ the prompt book, written out
    const E = K.ease, seg = K.seg, rgb = (h) => new THREE.Color(h).toArray();
    const AMBER = rgb('#ffc98a'), WARM = rgb('#ffe2bd'), GOLD = rgb('#ffd38a'), WHITE = rgb('#f4f1ea');
    const mix3 = (a, b, k) => [K.lerp(a[0], b[0], k), K.lerp(a[1], b[1], k), K.lerp(a[2], b[2], k)];
    const girlX = K.track([[0, -6.2], [CUE.girlIn[0], -6.2], [CUE.girlIn[1], GIRL_X, 'inOut'], [CUE.gather[0], GIRL_X], [CUE.gather[1], -0.75, 'inOut']]);
    const boyX = K.track([[0, 5.9], [CUE.boyIn[0], 5.9], [CUE.boyIn[1], BOY_X, 'inOut'], [CUE.gather[0], BOY_X], [CUE.gather[1], 1.6, 'inOut']]);
    // the reach: how far up the near arm is (0 = hanging), held for a moment on the card
    const reach = (t, tap) => seg(t, tap - 0.45, tap - 0.05, E.out) * (1 - seg(t, tap + 0.45, tap + 0.85, E.inOut));
    // talking: an actor's card rocks a little while its line plays (the narration times, story time)
    const LINES = [[0.4, 5.3, 'g'], [5.8, 9.5, 'b'], [9.7, 11.6, 'g'], [11.8, 13.9, 'b']];
    const talk = (t, who) => LINES.reduce((s, [a, b, w]) => s + (w === who ? Math.sin(Math.PI * seg(t, a, b)) : 0), 0);
    const cam = {
      pos: K.path([[0, [-0.4, 3.0, 10.0]], [5.6, [0.0, 3.1, 10.6]], [9.6, [0.25, 3.15, 10.8]], [D, [0.4, 3.4, 9.8]]]),
      aim: K.path([[0, [-0.45, 2.45, -1.5]], [5.6, [-0.1, 2.5, -1.5]], [9.6, [0.05, 2.55, -1.5]], [D, [0.1, 2.6, -1.5]]]),
    };
    const washLevel = K.track([[0, 0.8], [CUE.open[0], 0.8], [CUE.open[1], 0.95, 'inOut']]);
    const washTint = K.track([[0, AMBER], [CUE.open[0], AMBER], [CUE.open[1], GOLD, 'inOut']]);
    const horizonLevel = K.track([[0, 0], [CUE.open[0], 0], [CUE.open[1], 6.0, 'inOut']]);

    return {
      update(t) {
        const lag = 0.14 * Math.exp(-2.2 * t) * Math.sin(TAU * 0.85 * t + 0.6);
        curtains[0].userData.set(OPEN_X, lag); curtains[1].userData.set(OPEN_X, lag);
        K.look(camera, cam.pos(t), cam.aim(t)); K.focus(camera, [0, 2.5, -1.5], 0.01);

        // the cover parts like a pair of doors
        const part = seg(t, CUE.open[0], CUE.open[1], E.inOut); coverL.position.x = -5.6 * part; coverR.position.x = 5.6 * part;

        // the buttons: flown in, a small rock as they settle, a press, then flown out as the cover opens
        const flyOut = 6.2 * seg(t, CUE.open[0] - 0.1, CUE.open[0] + 0.7, E.in);
        buttons.forEach((g, i) => {
          const [a, b] = CUE.buttons[i], ts = t - b, tap = i ? CUE.tapBoy : CUE.tapGirl, press = seg(t, tap - 0.04, tap + 0.04) * (1 - seg(t, tap + 0.12, tap + 0.4, E.inOut));
          g.position.y = BTN_Y[i] + 5.6 * (1 - seg(t, a, b, E.out)) + flyOut;
          g.position.z = Z.hang - i * 0.03 - 0.07 * press;
          g.rotation.z = (ts > 0 ? 0.025 * Math.exp(-4.5 * ts) * Math.sin(TAU * 2.2 * ts) : 0) + 0.04 * press * (i ? 1 : -1) + 0.004 * Math.sin(t * 1.3 + i);
          const m = g.children[0].material, flash = seg(t, tap, tap + 0.06) * (1 - seg(t, tap + 0.1, tap + 0.7));
          m.emissive.set('#ffe9b0'); m.emissiveIntensity = 0.3 * flash;
        });

        // the students along their slots, rocking as they go and while they talk; each reaches for a button
        const place = (g, x, xPrev, who, tap, shoulderX) => {
          const v = (x - xPrev) / 0.04; g.position.x = x;
          g.userData.card.rotation.z = -0.012 * v * Math.sin(TAU * 2.6 * t) + 0.018 * talk(t, who) * Math.sin(TAU * 3.1 * t);
          const target = [BTN_X + (who === 'g' ? -1 : 1) * (BTN_HALF - 0.05), BTN_Y[who === 'g' ? 0 : 1]], sx = x + shoulderX, sy = 0.05 + 0.05 + SHOULDER;
          const dx = (target[0] - sx) * (who === 'g' ? 1 : -1), dy = target[1] - sy, ang = Math.atan2(dx, -dy);
          g.userData.arm.rotation.z = ang * reach(t, tap) + 0.05 * Math.sin(t * 1.7 + (who === 'g' ? 0 : 2));
        };
        place(girl, girlX(t), girlX(t - 0.04), 'g', CUE.tapGirl, 0);
        place(boy, boyX(t), boyX(t - 0.04), 'b', CUE.tapBoy, 0);

        // the easel: the front card is pulled away to the right, showing the next
        cards.forEach((m, i) => { m.position.x = i < 2 ? -5 * seg(t, CUE.card[i], CUE.card[i] + 0.5, E.in) : 0; });

        // the lighting plot
        const gx = girl.position.x, bx = boy.position.x, open = seg(t, CUE.open[0], CUE.open[1], E.inOut);
        follow.set([gx + 0.05, 1.75, Z.men], 0.25 + 0.75 * seg(t, CUE.girlIn[0], CUE.girlIn[0] + 0.6), { color: mix3(WARM, WHITE, open), angle: 0.15 });
        follow2.set([bx - 0.05, 1.75, Z.men], seg(t, CUE.boyIn[0] + 0.2, CUE.boyIn[1]), { color: mix3(WARM, WHITE, open), angle: 0.075, reach: 1.2 });
        const wl = washLevel(t), wc = washTint(t);
        wash.forEach((L, i) => L.set([(i ? -1 : 1) * 1.6, 2.4, -1.6], wl, { color: wc }));
        const onButtons = seg(t, CUE.buttons[0][0], CUE.buttons[0][1] + 0.2);
        top.set(mix3([BTN_X, 2.1, Z.hang], [(gx + bx) / 2, 0.9, Z.men], open), K.lerp(0.35, 1, onButtons), { color: mix3(AMBER, GOLD, open), angle: 0.2, reach: K.lerp(1.4, 2.5, open) });
        cardLamp.set([EASEL.x, EASEL.y + EASEL.h / 2, Z.easel], 0.62, { color: WARM });
        const hl = horizonLevel(t); horizon.forEach((l) => { l.intensity = hl; l.color.setRGB(GOLD[0], GOLD[1], GOLD[2]); });
        th.updateLamps(t);
      },

      overlay(ctx, t, W, Hh) {
        const s = W / 1920, r = 54 * s, cx = W - 70 * s - r, cy = Hh - 64 * s - r;
        ctx.save(); ctx.globalAlpha = 0.95; ctx.fillStyle = '#fbf6ea'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.lineWidth = 3 * s; ctx.strokeStyle = '#c9a24a'; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r - 4 * s, 0, 7); ctx.clip(); const d = (r - 6 * s) * 2; ctx.drawImage(logo, cx - d / 2, cy - d / 2, d, d); ctx.restore();
      },
    };
  },
};
