// Toy Blocks kit: paint, wood, the block maker and the falling-block physics, copied unchanged from the reference
// style (prompt-toyblocks.txt, styles/toy-blocks.js). Needs the kit loaded first (window.THREE and window.K).
import '../kit';

const K = window.K, THREE = window.THREE;

  const PAINT = { blue: '#3d6a97', coral: '#d8603f', green: '#4f8d68', mustard: '#e3a83a', cream: '#f1e7cf' };   // milk paint: chalky, slightly greyed
  const MAPLE = { base: '#e6cc9f', line: '150,100,52', light: '255,244,214' };   // the blocks
  const OAK = { base: '#8b6744', line: '70,44,22', light: '232,196,150' };       // the floor
  const EDGE = 0.07;                 // radius of every rounded edge, world units (a cube is 1 unit)
  const BASE = [2.7, 0.84, 1.2], CAP = [1.84, 0.92, 1.04], LETTER = 0.82, PITCH = 3.4, TITLE_Z = 7;   // name brick, percent brick, alphabet cube, tower spacing, where the headline lies
  const FIRST = 0.4, BEAT = 0.42, CAP_GAP = 0.58, NEXT_GAP = 0.56;   // first knock, cube to cube, last cube to cap, cap to next tower
  const GRAV = 52, DROP_FROM = 11.5, BOUNCE = 0.16;                  // gravity (units/s2), release height, how much speed survives the first hit

  const fallTime = (d) => Math.sqrt(2 * (DROP_FROM - d.y) / GRAV);
  const bounceTime = (d) => 2 * BOUNCE * fallTime(d);                     // length of the one small bounce after the first hit
  const rockPhase = (d, tau) => 2 * Math.PI * d.hz * tau * (1 + 0.9 * tau);   // rocking gets quicker as it gets smaller, like a real block

  // Where one block is at time t, before the tower's own sway: free fall from rest, one bounce, then it rocks from
  // edge to edge and dies down. Everything is a formula of (t - tc), so any frame can be asked for in any order.
  function dropPose(K, d, t) {
    const tau = t - d.tc, T = fallTime(d), tb = bounceTime(d), h = d.size[1] / 2;
    const lift = tau < 0 ? (DROP_FROM - d.y) - 0.5 * GRAV * Math.pow(Math.max(0, T + tau), 2) : tau < tb ? 0.5 * GRAV * tau * (tb - tau) : 0;
    const env = tau < 0 ? 1 - 1.5 * tau : Math.exp(-d.damp * tau) * (1 - K.smooth(0.5, 0.95, tau));
    const rz = d.tilt * env * (tau < 0 ? 1 : Math.cos(rockPhase(d, tau)));
    const rx = d.tiltX * env * (tau < 0 ? 1 : Math.cos(rockPhase(d, tau) * 1.31));
    const ry = d.yaw + d.spin * tau * (tau < 0 ? 1 : Math.exp(-14 * tau));
    // a tilted block rests on one bottom edge: that edge stays on the support, so the centre rises and shifts sideways
    return {
      x: d.x - Math.sign(rz) * d.pivot[0] * (1 - Math.cos(rz)) - h * Math.sin(rz),
      y: d.y + lift + d.pivot[0] * Math.abs(Math.sin(rz)) + d.pivot[1] * Math.abs(Math.sin(rx)) - h * (1 - Math.cos(rz) * Math.cos(rx)),
      z: d.z + Math.sign(rx) * d.pivot[1] * (1 - Math.cos(rx)) + h * Math.sin(rx),
      rx, ry, rz,
    };
  }

  const poly = (c, pts, round = 6) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); if (round) { c.lineWidth = round; c.stroke(); } };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };
  const disc = (c, x, y, r, ry, rot) => { c.beginPath(); c.ellipse(x, y, r, ry || r, rot || 0, 0, 7); c.fill(); };
  const cut = (c, fn) => { c.globalCompositeOperation = 'destination-out'; fn(); c.globalCompositeOperation = 'source-over'; };   // a hole in the print

  const lettering = (text, font, capH, frame) => (c, W, H) => {
    if (frame) { c.lineWidth = H * 0.028; c.beginPath(); c.roundRect(-W / 2 + H * frame, -H / 2 + H * frame, W - 2 * H * frame, H - 2 * H * frame, H * 0.07); c.stroke(); }
    c.font = font.replace('#', '100'); const m = c.measureText('H'), px = 100 * capH * H / m.actualBoundingBoxAscent;
    c.font = font.replace('#', px.toFixed(1)); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const b = c.measureText(text); c.fillText(text, (b.actualBoundingBoxLeft - b.actualBoundingBoxRight) / 2, capH * H / 2);
  };
  const SANS = '700 #px "Fredoka"', SERIF = '900 #px "Fraunces"';

  function makeToyBox(S, PX = 380) {
    const { THREE, K } = S, cache = new Map();
    const canvas = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
    const tint = (mask, css) => { const cv = canvas(mask.width, mask.height), c = cv.getContext('2d'); c.fillStyle = css; c.fillRect(0, 0, cv.width, cv.height); c.globalCompositeOperation = 'destination-in'; c.drawImage(mask, 0, 0); return cv; };

    // wood into a colour canvas (c) and its height/roughness canvas (d). dir: 'h' or 'v' = long grain running that
    // way across the face, 'end' = end grain (growth rings).
    function wood(c, d, W, H, seed, dir, tone = MAPLE, rough = 150, s = PX / 380) {
      const r = K.rng(seed);
      c.fillStyle = tone.base; c.fillRect(0, 0, W, H); d.fillStyle = `rgb(128,${rough},0)`; d.fillRect(0, 0, W, H);
      const both = (path, a, lw) => { c.strokeStyle = `rgba(${tone.line},${a})`; c.lineWidth = lw; c.stroke(path); d.strokeStyle = `rgba(92,${rough + 30},0,${Math.min(1, a * 2.2)})`; d.lineWidth = lw; d.stroke(path); };
      if (dir === 'end') {
        const cx = W * r.range(-0.3, 1.3), cy = H * r.range(1.15, 2.1), far = Math.hypot(Math.max(cx, W - cx), cy);
        for (let rad = Math.max(8, cy - H) * 0.6; rad < far; rad += r.range(3.5, 9) * s) { const p = new Path2D(); p.arc(cx, cy, rad, 0, 7); both(p, r.range(0.1, 0.3), r.range(0.8, 2.6) * s); }
        for (let i = 0; i < 46; i++) { const a = -Math.PI * r(), p = new Path2D(); p.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20); p.lineTo(cx + Math.cos(a) * far, cy + Math.sin(a) * far); c.strokeStyle = `rgba(${tone.light},${r.range(0.04, 0.12)})`; c.lineWidth = r.range(0.6, 1.6) * s; c.stroke(p); }
        for (let i = 0; i < 260 * s * s; i++) { c.fillStyle = `rgba(${tone.line},${r.range(0.1, 0.3)})`; c.fillRect(r() * W, r() * H, 1.3 * s, 1.3 * s); }
        return;
      }
      const L = dir === 'v' ? H : W, T = dir === 'v' ? W : H;
      for (const x of [c, d]) { x.save(); if (dir === 'v') x.transform(0, 1, 1, 0, 0, 0); }
      const ph = r.range(0, 6.28), amp = r.range(2, 6) * s, kx = r.range(0.5, 1.3) * 6.28 / L, wave = (x) => amp * (Math.sin(x * kx + ph) + 0.4 * Math.sin(x * kx * 2.3 + ph * 2));
      for (let i = 0; i < 8; i++) { c.fillStyle = `rgba(${tone.line},${r.range(0.03, 0.09)})`; c.fillRect(0, r.range(-0.1, 1) * T, L, r.range(0.04, 0.16) * T); }     // broad bands of darker wood
      for (let y = -8 * s; y < T + 8 * s; y += r.range(1.6, 6.5) * s) {                                                                                                   // the grain lines, flowing together
        const p = new Path2D(), j = r.range(0, 6.28);
        for (let x = 0; x <= L + 16; x += 16) p.lineTo(x, y + wave(x) + Math.sin(x * 0.011 / s + j) * 0.9 * s);
        both(p, r.range(0.05, 0.24), r.range(0.6, 1.9) * s);
      }
      for (let i = 0; i < 420 * s * s; i++) { const x = r() * L; c.fillStyle = `rgba(${tone.line},${r.range(0.1, 0.26)})`; c.fillRect(x, r() * T + wave(x), r.range(3, 13) * s, 1.1 * s); }   // pores
      for (let i = 0; i < 7; i++) { const x = r() * L, w = r.range(20, 70) * s, g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, `rgba(${tone.light},0)`); g.addColorStop(0.5, `rgba(${tone.light},${r.range(0.04, 0.1)})`); g.addColorStop(1, `rgba(${tone.light},0)`); c.fillStyle = g; c.fillRect(x, 0, w, T); }   // shimmer across the grain
      for (const x of [c, d]) x.restore();
    }
    // Where the paint still is (alpha): the whole outline, minus a ragged band along it, deeper at corners, plus a
    // few chips and scratches. `outline` is a closed list of pixel points (default: the rectangle of the face).
    function paintLayer(W, H, seed, edge, outline, wear = 1, rim = true) {
      const r = K.rng(seed + 500), n = K.noise(seed + 3), cv = canvas(W, H), c = cv.getContext('2d');
      const pts = outline || [[0, 0], [W, 0], [W, H], [0, H]];
      c.fillStyle = '#fff'; poly(c, pts, 0);
      c.globalCompositeOperation = 'destination-out';
      let run = 0;
      if (rim) pts.forEach((a, i) => {
        const b = pts[(i + 1) % pts.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]), sharp = !outline || len > edge * 3;
        for (let u = 0; u < len; u += 2, run += 2) {
          const corner = sharp ? 1 + 1.1 * (1 - K.smooth(0, edge * 2.4, Math.min(u, len - u))) : 1.15;
          const rad = edge * wear * (0.22 + 0.5 * K.clamp(0.5 + 1.2 * n.fbm(run * 0.013, seed * 0.37, 0, 3))) * corner;
          c.beginPath(); c.arc(a[0] + (b[0] - a[0]) * u / len, a[1] + (b[1] - a[1]) * u / len, Math.max(1, rad), 0, 7); c.fill();
        }
      });
      for (let i = 0; i < 5 * wear; i++) { const x = r() * W, y = r() * H, a = r() * 6.28, l = r.range(0.06, 0.3) * W; c.globalAlpha = r.range(0.25, 0.6); c.lineWidth = r.range(0.7, 1.6); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }   // scratches
      for (let i = 0; i < 26 * wear; i++) { c.globalAlpha = r.range(0.3, 1); c.beginPath(); c.arc(r() * W, r() * H, r.range(0.5, 2.4), 0, 7); c.fill(); }                                                                                                                      // dings
      return cv;
    }
    const paintColour = (mask, css, seed) => {    // flat colour would look like plastic: milk paint is cloudy
      const r = K.rng(seed + 77), cv = tint(mask, css), c = cv.getContext('2d'), W = cv.width, H = cv.height;
      c.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 46; i++) { const x = r() * W, y = r() * H, rad = r.range(0.08, 0.3) * W, g = c.createRadialGradient(x, y, 0, x, y, rad), k = r() < 0.5 ? '255,250,235' : '20,14,8'; g.addColorStop(0, `rgba(${k},${r.range(0.03, 0.075)})`); g.addColorStop(1, `rgba(${k},0)`); c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      return cv;
    };
    // The print (alpha): the art, set down a hair off-centre and off-square, with pinholes and thin misses in the ink.
    function printLayer(W, H, seed, art) {
      const r = K.rng(seed + 900), cv = canvas(W, H), c = cv.getContext('2d');
      c.translate(W / 2 + r.range(-1, 1) * W * 0.012, H / 2 + r.range(-1, 1) * H * 0.012); c.rotate(r.range(-0.022, 0.022));
      c.fillStyle = c.strokeStyle = '#fff'; c.lineJoin = c.lineCap = 'round';
      art(c, W, H);
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-out'; c.fillStyle = c.strokeStyle = '#000';
      for (let i = 0; i < W * H / 900; i++) { c.globalAlpha = r.range(0.35, 1); c.beginPath(); c.arc(r() * W, r() * H, r.range(0.4, 1.9), 0, 7); c.fill(); }
      for (let i = 0; i < 9; i++) { c.globalAlpha = r.range(0.2, 0.5); c.fillRect(r() * W, r() * H, r.range(0.1, 0.4) * W, r.range(0.8, 1.8)); }
      return cv;
    }
    // One face -> material. o: { w, h (world size), seed, dir, tone, paint (css), ink (css), art, outline (world points
    // from the face's lower-left corner), wear, rim (false = no worn edge) }. A face with no art is shared between blocks.
    function face(o) {
      const W = Math.round(o.w * PX), H = Math.round(o.h * PX), key = o.art || o.outline ? null : [W, H, o.dir, o.paint, o.seed % 3].join('|');
      if (key && cache.has(key)) return cache.get(key);
      const data = K.canvasTex(W, H, null, { data: true }), d = data.ctx;
      const map = K.canvasTex(W, H, (c) => {
        wood(c, d, W, H, o.seed, o.dir || 'h', o.tone);
        if (o.paint) {
          const m = paintLayer(W, H, o.seed, EDGE * PX, o.outline && o.outline.map(([x, y]) => [x * PX, H - y * PX]), o.wear, o.rim !== false);
          c.drawImage(paintColour(m, o.paint, o.seed), 0, 0);
          d.globalAlpha = 0.86; d.drawImage(tint(m, 'rgb(142,228,0)'), 0, 0); d.globalAlpha = 1;      // paint: a film on top, and chalky
        }
        if (o.art) {
          const m = printLayer(W, H, o.seed, o.art);
          c.globalAlpha = 0.96; c.drawImage(tint(m, o.ink || PAINT.cream), 0, 0); c.globalAlpha = 1;
          d.filter = `blur(${(PX / 260).toFixed(2)}px)`; d.drawImage(tint(m, 'rgb(70,205,0)'), 0, 0); d.filter = 'none';   // the print sits a little below the surface
        }
      });
      const mat = new THREE.MeshStandardMaterial({ map, bumpMap: data, bumpScale: 5, roughnessMap: data, roughness: 1 });
      if (key) cache.set(key, mat);
      return mat;
    }
    const shadowed = (m) => { m.castShadow = m.receiveShadow = true; return m; };

    // A cube or brick. size [w, h, d]; grain: the axis the wood fibres run along ('x', 'y' or 'z'); faces: { front,
    // back, left, right, top, bottom }, each { paint, ink, art } (leave one out for bare wood). Origin at the centre.
    function block({ size, grain = 'x', seed = 1, faces = {} }) {
      const [w, h, d] = size, dir = { x: ['end', 'h', 'h'], y: ['v', 'end', 'v'], z: ['h', 'v', 'end'] }[grain];
      const sides = [['right', d, h, dir[0]], ['left', d, h, dir[0]], ['top', w, d, dir[1]], ['bottom', w, d, dir[1]], ['front', w, h, dir[2]], ['back', w, h, dir[2]]];
      return shadowed(new THREE.Mesh(K.roundedBox(w, h, d, EDGE, 5), sides.map(([name, fw, fh, fd], i) => face({ w: fw, h: fh, dir: fd, seed: seed * 7 + i, ...(faces[name] || {}) }))));
    }
    // Any flat outline pushed through the wood: arches, wedges, half-rounds, bridges. shape: THREE.Shape in world
    // units; the two big faces get the full treatment, the band around them is plain paint or wood.
    function prism(shape, depth, { paint, seed = 1 } = {}) {
      const g = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * EDGE * 0.7, bevelEnabled: true, bevelThickness: EDGE * 0.7, bevelSize: EDGE * 0.7, bevelOffset: -EDGE * 0.7, bevelSegments: 3, curveSegments: 28 });
      g.translate(0, 0, -depth / 2 + EDGE * 0.7); g.computeBoundingBox();
      const bb = g.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y, uv = g.attributes.uv, p = g.attributes.position;
      for (let i = g.groups[0].start; i < g.groups[0].start + g.groups[0].count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / w, (p.getY(i) - bb.min.y) / h);
      const outline = shape.getPoints(28).map((v) => [v.x - bb.min.x, v.y - bb.min.y]);
      const band = face({ w: 1, h: 1, seed: seed + 40, dir: 'h', paint, rim: false, outline: [[-1, -1], [2, -1], [2, 2], [-1, 2]] }); band.map.wrapS = band.map.wrapT = band.bumpMap.wrapS = band.bumpMap.wrapT = THREE.RepeatWrapping;
      return shadowed(new THREE.Mesh(g, [face({ w, h, seed, dir: 'h', paint, outline }), band]));
    }
    // A turned piece (cylinder, wheel, peg): the profile [[radius, y], ...] is spun around the y axis.
    function turned(profile, { paint, seed = 1 } = {}) {
      const n = profile.length, g = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 48), uv = g.attributes.uv, len = [0];
      for (let i = 1; i < n; i++) len[i] = len[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]);
      for (let i = 0; i < uv.count; i++) uv.setY(i, len[i % n] / len[n - 1]);                           // v follows the profile's real length, so the print is not squeezed
      const rMax = Math.max(...profile.map((q) => q[0])), wall = profile.map((q, i) => (q[0] > rMax - 1e-4 ? len[i] : -1)).filter((v) => v >= 0);
      const w = 2 * Math.PI * rMax, y0 = wall[0] - EDGE * 0.6, y1 = wall[wall.length - 1] + EDGE * 0.6;    // paint the outside wall, leave the turned ends bare
      return shadowed(new THREE.Mesh(g, face({ w, h: len[n - 1], seed: seed + 60, dir: 'v', paint, outline: paint && [[-1, y0], [w + 1, y0], [w + 1, y1], [-1, y1]] })));
    }
    const cylinder = (r, h, o) => { const e = EDGE, pts = [[0, -h / 2]]; for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * Math.PI / 10; pts.push([r - e + Math.cos(a) * e, -h / 2 + e + Math.sin(a) * e]); } for (let i = 0; i <= 5; i++) { const a = i * Math.PI / 10; pts.push([r - e + Math.cos(a) * e, h / 2 - e + Math.sin(a) * e]); } pts.push([0, h / 2]); return turned(pts, o); };
    const shapes = {
      arch: (w, h, hole) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-hole, 0); s.absarc(0, 0, hole, Math.PI, 0, true); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath(); return s; },
      wedge: (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath(); return s; },
      halfRound: (r) => { const s = new THREE.Shape(); s.moveTo(-r, 0); s.lineTo(r, 0); s.absarc(0, 0, r, 0, Math.PI, false); s.closePath(); return s; },
    };
    return { block, prism, turned, cylinder, shapes, face, wood };
  }

// The playroom from the reference, unchanged: low sun through a window (with a cookie that paints the window bars
// on the floor), sky light, oak boards, the shaded wall with its skirting, a rug and spare toys lying about.
// Returns the lights so a scene can dim or raise them.
function buildPlayroom(S, toy) {
  const { scene } = S;
  const put = (m, x, y, z, ry = 0, rx = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); scene.add(m); return m; };
  const sunDir = new THREE.Vector3(0.72, -0.38, -0.58).normalize(), right = new THREE.Vector3().crossVectors(sunDir, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, sunDir);
  const AIM = [-3.5, 6.5], HALF = 13, FAR = 70;     // centre of the cookie in light view, its half-width, distance of the sun
  const target = right.clone().multiplyScalar(AIM[0]).addScaledVector(up, AIM[1]);
  const sun = K.spot(S, { pos: target.clone().addScaledVector(sunDir, -FAR).toArray(), target: target.toArray(), color: '#ffe3bf', power: 8 * FAR * FAR, angle: Math.atan(HALF / FAR), penumbra: 0, soft: 0.8, mapSize: 4096, near: FAR - 30, far: FAR + 45, normalBias: 0.015 });
  sun.map = K.canvasTex(1024, 1024, (c, W) => {
    const k = W / (2 * HALF), X = (x) => (x - AIM[0] + HALF) * k, Y = (y) => (AIM[1] + HALF - y) * k, pane = (x0, y0, x1, y1) => c.fillRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k);
    c.fillStyle = '#000'; c.fillRect(0, 0, W, W); c.filter = 'blur(9px)'; c.fillStyle = '#fff';
    pane(-4.3, -3, 7.9, 8.2); pane(-8.7, -3, -4.85, 8.2); pane(-13.2, -3, -9.25, 8.2);                       // the window over the floor: the towers stand in its widest pane
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) pane(-14.6 + i * 3.6, 9.6 + j * 3.2, -11.4 + i * 3.6, 12.4 + j * 3.2);   // a second window, far left of the sun's view: it only reaches the wall
  });
  K.skyLight(S, { color: '#c9d6ea', power: 1.0, size: 15, center: [0, 1, -2], mapSize: 2048 });
  K.env(S, { top: '#a9bbd0', horizon: '#d8cdb9', bottom: '#70502f', intensity: 0.5, panels: [{ pos: [-24, 13, 15], size: [14, 16], color: '#fff0d6', power: 3 }] });
  const sky = S.skyLights[S.skyLights.length - 1].light;
  const BOARD = 2.4, TILE = BOARD * 5, floorData = K.canvasTex(2048, 2048, null, { data: true });
  const floorMap = K.canvasTex(2048, 2048, (c, W) => {
    const d = floorData.ctx, r = K.rng(9), bw = W / 5;
    for (let i = 0; i < 5; i++) {
      for (const x of [c, d]) { x.save(); x.beginPath(); x.rect(i * bw, 0, bw, W); x.clip(); x.translate(i * bw, 0); }
      toy.wood(c, d, bw, W, 30 + i, 'v', OAK, 132, 0.8);
      c.fillStyle = `rgba(${r() < 0.5 ? '40,20,5' : '255,214,160'},${r.range(0.02, 0.13)})`; c.fillRect(0, 0, bw, W);     // no two boards are the same colour
      for (const x of [c, d]) x.restore();
    }
    for (let i = 0; i < 5; i++) for (const [x, col] of [[c, 'rgba(38,20,8,0.9)'], [d, 'rgb(30,200,0)']]) { x.fillStyle = col; x.fillRect(i * bw - 2.5, 0, 5, W); x.fillRect(i * bw, ((i * 0.37 + 0.2) % 1) * W, bw, 4); }   // gaps between boards, and where two boards meet end to end
  }, { repeat: [96 / TILE, 96 / TILE] });
  floorData.wrapS = floorData.wrapT = THREE.RepeatWrapping; floorData.repeat.copy(floorMap.repeat);
  const floor = put(new THREE.Mesh(new THREE.PlaneGeometry(96, 96), new THREE.MeshStandardMaterial({ map: floorMap, bumpMap: floorData, bumpScale: 2.5, roughnessMap: floorData, roughness: 1 })), 1.1, 0, -10, 0, -Math.PI / 2);
  floor.receiveShadow = true;
  const WALL_Z = -21, wall = put(new THREE.Mesh(new THREE.PlaneGeometry(110, 40), new THREE.MeshStandardMaterial({ color: '#b3c1c0', roughness: 0.95 })), 0, 20, WALL_Z); wall.receiveShadow = true;
  const trim = new THREE.MeshStandardMaterial({ color: '#9aa9a8', roughness: 0.6 });
  put(new THREE.Mesh(K.roundedBox(110, 2.6, 0.36, 0.1, 3), trim), 0, 1.3, WALL_Z + 0.18).receiveShadow = true;
  put(new THREE.Mesh(K.roundedBox(110, 0.3, 0.5, 0.12, 3), trim), 0, 2.55, WALL_Z + 0.22).castShadow = true;
  const rugData = K.canvasTex(1024, 512, null, { data: true });
  const rugMap = K.canvasTex(1024, 512, (c, W, H) => {
    const d = rugData.ctx, r = K.rng(12); c.fillStyle = '#3f6672'; c.fillRect(0, 0, W, H); d.fillStyle = 'rgb(128,240,0)'; d.fillRect(0, 0, W, H);
    [[30, 26, '#e6dcc4'], [64, 8, '#cf6a4a'], [H - 56, 26, '#e6dcc4'], [H - 72, 8, '#cf6a4a']].forEach(([y, h, col]) => { c.fillStyle = col; c.fillRect(0, y, W, h); });
    for (let y = 0; y < H; y += 4) { c.fillStyle = `rgba(60,40,20,${r.range(0.05, 0.16)})`; c.fillRect(0, y, W, 1.5); d.fillStyle = 'rgb(70,240,0)'; d.fillRect(0, y, W, 1.5); }   // the weave
  });
  const rugMat = new THREE.MeshStandardMaterial({ map: rugMap, bumpMap: rugData, bumpScale: 3, roughness: 1 });
  const rug = put(new THREE.Mesh(K.roundedBox(20, 0.2, 9, 0.09, 3), rugMat), 6.5, 0.1, -12.2, -0.1); rug.castShadow = rug.receiveShadow = true;
  const P = PAINT, plain = (c, rough = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: rough });
  // just behind the towers (a little soft): the other shapes in the box
  put(toy.prism(toy.shapes.arch(2.0, 1.15, 0.58), 0.9, { paint: P.mustard, seed: 3 }), -6.4, 0, -2.3, 0.42);
  put(toy.prism(toy.shapes.wedge(1.5, 1.0), 0.9, { paint: P.coral, seed: 5 }), 6.2, 0, -3.4, -0.5);
  // further back (soft): spare blocks, a ring stacker, a ball
  put(toy.block({ size: [1, 1, 1], seed: 61, grain: 'y', faces: { front: { paint: P.cream, ink: P.blue, art: lettering('A', SERIF, 0.56) }, top: { paint: P.cream }, right: { paint: P.cream } } }), -1.7, 0.5, -6.2, 0.5);
  put(toy.prism(toy.shapes.halfRound(0.7), 0.9, { paint: P.blue, seed: 8 }), -1.75, 1.0, -6.2, 0.38);
  put(toy.cylinder(0.46, 1.4, { paint: P.green, seed: 9 }), -5.7, 0.46, -6.4, 0.3, 0, Math.PI / 2);
  put(toy.block({ size: [2, 0.6, 1], seed: 71, faces: { front: { paint: P.coral }, top: { paint: P.coral } } }), 2.0, 0.3, -7.4, -0.3);
  put(toy.prism(toy.shapes.wedge(1.4, 0.9), 0.9, { paint: P.mustard, seed: 11 }), 2.3, 0.6, -7.4, -0.22);
  const stacker = new THREE.Group(); stacker.position.set(7.7, 0.2, -11); stacker.scale.setScalar(0.92); scene.add(stacker);
  const part = (g, m, y) => { const o = new THREE.Mesh(g, m); o.position.y = y; if (g.type === 'TorusGeometry') o.rotation.x = Math.PI / 2; o.castShadow = o.receiveShadow = true; stacker.add(o); };
  part(new THREE.CylinderGeometry(1.5, 1.6, 0.3, 40), plain(MAPLE.base, 0.6), 0.15); part(new THREE.CylinderGeometry(0.16, 0.16, 4.2, 20), plain(MAPLE.base, 0.6), 2.1); part(new THREE.SphereGeometry(0.42, 24, 16), plain(P.coral), 4.3);
  [[1.05, P.blue], [0.9, P.mustard], [0.75, P.green], [0.6, P.coral]].forEach(([rad, c], i) => part(new THREE.TorusGeometry(rad, 0.4, 20, 48), plain(c), 0.7 + i * 0.78));
  const ball = put(new THREE.Mesh(new THREE.SphereGeometry(1.3, 40, 24), new THREE.MeshStandardMaterial({ roughness: 0.75, map: K.canvasTex(256, 128, (c) => { c.fillStyle = P.cream; c.fillRect(0, 0, 256, 128); c.fillStyle = P.mustard; c.fillRect(0, 44, 256, 40); c.fillStyle = P.blue; c.fillRect(0, 60, 256, 8); }) })), -10.2, 1.3, -13, 0.4, 0.5, 0.3);
  ball.castShadow = true;
  return { sun, sky };
}

export { PAINT, MAPLE, OAK, EDGE, GRAV, DROP_FROM, BOUNCE, fallTime, bounceTime, dropPose, poly, rr, disc, cut, lettering, SANS, SERIF, makeToyBox, buildPlayroom };
