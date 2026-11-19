// Exploded View kit: turned parts, true helices, the pale studio, the finishes and the numbered ink-blue callouts,
// copied from the reference style (prompt-explodedview.txt, styles/exploded-view.js).
// Changes: the studio returns its lights (so a long set can move them with the camera), the finishes gain a few
// biology colours, and the callouts are a small library: each label follows its part with a pixel offset (the
// camera travels a long way here, so fixed frame positions would not work) and has its own on / off times.
import '../kit';

const K = window.K, THREE = window.THREE;
export const INK = '#1b2f8c', INK_DARK = '#131a3d', PAPER = '#fbf7ee', HALO = 'rgba(242,238,229,0.92)';

// A turned part: an outline of [x, radius] points spun around the X axis (see the reference for the details).
export function turned(outline, { seg = 72, bevel = 0 } = {}) {
  let P = outline.map((p) => ({ x: p[0], r: p[1], s: !!p[2] }));
  if (bevel) {
    const Q = [];
    P.forEach((p, i) => {
      const a = P[i - 1], b = P[i + 1];
      if (!a || !b || p.s) { Q.push(p); return; }
      const cut = (q) => { const d = Math.hypot(q.x - p.x, q.r - p.r), c = Math.min(bevel, d * 0.4); return { x: p.x + (q.x - p.x) * c / d, r: p.r + (q.r - p.r) * c / d, s: false }; };
      Q.push(cut(a), cut(b));
    });
    P = Q;
  }
  const n = P.length - 1, N = [], pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) { const dx = P[i + 1].x - P[i].x, dr = P[i + 1].r - P[i].r, l = Math.hypot(dx, dr) || 1; N.push([-dr / l, dx / l]); }
  const mix = (a, b) => { const x = a[0] + b[0], r = a[1] + b[1], l = Math.hypot(x, r) || 1; return [x / l, r / l]; };
  const x0 = Math.min(...P.map((p) => p.x)), x1 = Math.max(...P.map((p) => p.x));
  for (let i = 0; i < n; i++) {
    const ends = [[P[i], i > 0 && P[i].s ? mix(N[i - 1], N[i]) : N[i]], [P[i + 1], i < n - 1 && P[i + 1].s ? mix(N[i], N[i + 1]) : N[i]]];
    const base = pos.length / 3;
    for (const [p, m] of ends) for (let k = 0; k <= seg; k++) {
      const a = k / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pos.push(p.x, p.r * c, p.r * s); nor.push(m[0], m[1] * c, m[1] * s); uv.push(k / seg, (p.x - x0) / (x1 - x0 || 1));
    }
    for (let k = 0; k < seg; k++) { const a = base + k, b = a + 1, c = base + seg + 1 + k, d = c + 1; idx.push(a, b, c, b, d, c); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
// the same part standing up: the lathe axis along +Y
export const turnedUp = (outline, o) => turned(outline, o).rotateZ(Math.PI / 2);

// A real helix along X, starting at x = 0 (a spring with `dead` closed coils at each end, or a thread). `phase`
// turns its start (used for the second strand of DNA).
export function helix({ radius, wire, turns, length, dead = 0, seg = 26, phase = 0 }) {
  const pitch = (length - dead * 4 * wire) / Math.max(1e-3, turns - dead * 2);
  class Coil extends THREE.Curve {
    getPoint(u, v = new THREE.Vector3()) {
      const a = u * turns, lead = Math.min(a, dead), tail = Math.max(0, a - (turns - dead)), mid = a - lead - tail;
      return v.set((lead + tail) * 2 * wire + mid * pitch, radius * Math.cos(a * Math.PI * 2 + phase), radius * Math.sin(a * Math.PI * 2 + phase));
    }
  }
  return new THREE.TubeGeometry(new Coil(), Math.round(turns * seg), wire, 8, false);
}

// A pale seamless floor under one big soft top light, plus sky light for the contact shading; black cards in the
// reflections. Returns { sun, sky } so the set can keep them over the part of the floor the camera is looking at.
export function studio(S) {
  const { scene } = S;
  K.env(S, { top: '#f3f1ec', horizon: '#d9d8d4', bottom: '#b8b4ac', intensity: 0.44, panels: [
    { pos: [-2, 16, 5], size: [30, 12], color: '#ffffff', power: 5.5 },
    { pos: [-20, 5, 10], size: [3, 14], color: '#fff3df', power: 6 },
    { pos: [0, 13, 13], size: [34, 1.1], color: '#ffffff', power: 16 },
    { pos: [20, 3, 12], size: [10, 12], color: '#050505', power: 1 },
    { pos: [14, -9, -14], size: [34, 16], color: '#060606', power: 1 },
    { pos: [-22, 1, -6], size: [8, 6], color: '#080808', power: 1 },
    { pos: [-15, -2.5, 17], size: [40, 3.2], color: '#0a0a0a', power: 1 },
  ] });
  const sun = K.sun(S, { pos: [-9, 26, 13], target: [0, 0, 0], color: '#fffaf2', power: 2.9, size: 16, soft: 2.6, mapSize: 4096 });
  const sky = K.skyLight(S, { color: '#eef2ff', power: 0.7, size: 16, mapSize: 2048 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: '#dedbd5', roughness: 0.95, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  scene.fog = new THREE.Fog(PAPER, 120, 320);
  return { sun, sky };
}
// keep the lights' shadow box over `at` (half-width `size`), keeping the light's direction
export function aimLights({ sun, sky }, at, size = 16) {
  sun.target.position.set(at[0], 0, at[2]); sun.position.set(at[0] - 9, 26, at[2] + 13);
  sky.target.position.set(at[0], 0, at[2]);
  for (const l of [sun, sky]) {
    const c = l.shadow.camera;
    if (c.right !== size) { c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.updateProjectionMatrix(); }
  }
}

export function finishes() {
  const P = THREE.MeshPhysicalMaterial, M = THREE.MeshStandardMaterial;
  const rings = K.canvasTex(8, 512, (ctx, w, h) => { const r = K.rng(3); for (let y = 0; y < h; y++) { const v = 150 + Math.floor(r() * 90); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(0, y, w, 1); } }, { data: true, repeat: [1, 2] });
  const dimples = K.canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const x = (i + (j % 2) * 0.5) * 32 + 8, y = j * 32 + 16, g = ctx.createRadialGradient(x, y, 1, x, y, 11); g.addColorStop(0, '#000'); g.addColorStop(1, '#808080'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 7, 11, 0, 0, 7); ctx.fill(); }
  }, { data: true, repeat: [9, 2] });
  const moulded = (color, o = {}) => new P({ color, roughness: 0.42, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.3, ...o });
  const glassy = (tint, o = {}) => new P({ color: '#ffffff', metalness: 0, roughness: 0.06, transmission: 1, thickness: 0.22, ior: 1.5, attenuationColor: new THREE.Color(tint), attenuationDistance: 0.4, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.05, ...o });
  return {
    chrome: new M({ color: '#e6e8ec', metalness: 1, roughness: 0.12 }),
    steel: new M({ color: '#c9ccd1', metalness: 1, roughness: 0.26 }),
    satin: new M({ color: '#b9bcc2', metalness: 1, roughness: 0.42, bumpMap: rings, bumpScale: 0.4 }),
    brass: new M({ color: '#d8a445', metalness: 1, roughness: 0.3, roughnessMap: rings, bumpMap: rings, bumpScale: 0.5 }),
    rubber: new P({ color: '#17181b', roughness: 0.78, metalness: 0, sheen: 0.6, sheenColor: new THREE.Color('#8a8f9a'), sheenRoughness: 0.55, bumpMap: dimples, bumpScale: 1.6 }),
    clear: glassy('#9fbfdd'),
    nylon: new P({ color: '#f1eee6', roughness: 0.5, metalness: 0, clearcoat: 0.2 }),
    orange: moulded('#f2641f'),
    shadowOnly: new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
    // biology colours, in the same moulded-plastic finish
    moulded, glassy, dimples,
    redRubber: new P({ color: '#c8323a', roughness: 0.6, metalness: 0, sheen: 0.5, sheenColor: new THREE.Color('#ff9a9a'), sheenRoughness: 0.5, bumpMap: dimples, bumpScale: 0.8 }),
  };
}

// ---------------------------------------------------------------- callouts
// Numbered balloons with leader lines (and plain labels), drawn in the 2D overlay so they stay sharp. A callout:
//   { n (number, or null for a plain label), name, at: () => [x,y,z] world point, on, off, dx, dy (px from the
//     point to the balloon), side (1 = text right of the balloon, -1 = left), color }
// draw(ctx, t) projects every point with the camera of this frame.
export function makeCallouts(S) {
  const { camera, W, H } = S, v = new THREE.Vector3(), R = 30, NAME = 54;
  const screen = (p) => { v.set(p[0], p[1], p[2]).project(camera); return [(v.x * 0.5 + 0.5) * W, (0.5 - v.y * 0.5) * H, v.z < 1]; };
  const halo = (ctx, draw) => { ctx.save(); ctx.strokeStyle = HALO; ctx.lineJoin = 'round'; draw(true); ctx.restore(); draw(false); };
  const list = [];
  const draw = (ctx, t) => {
    camera.updateMatrixWorld();
    ctx.textBaseline = 'middle'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const c of list) {
      const u = t - c.on; if (u <= 0 || t > c.off) continue;
      const fade = 1 - K.seg(t, c.off - 0.3, c.off);
      const [ax, ay, front] = screen(c.at(t)); if (!front) continue;
      const bx = ax + c.dx, by = ay + c.dy, side = c.side || (c.dx >= 0 ? 1 : -1), ink = c.color || INK;
      ctx.globalAlpha = fade;
      if (c.n != null) {
        const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, k = K.seg(u, 0.04, 0.3, K.ease.out), l = Math.max(0, d - R) * k;
        halo(ctx, (h) => { ctx.lineWidth = h ? 9 : 3; if (!h) ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + dx / d * l, ay + dy / d * l); ctx.stroke(); });
        const dot = K.ease.outBack(K.seg(u, 0, 0.16));
        ctx.fillStyle = '#f2eee5'; ctx.beginPath(); ctx.arc(ax, ay, 10 * dot, 0, 7); ctx.fill(); ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(ax, ay, 6.5 * dot, 0, 7); ctx.fill();
        const b = K.ease.outBack(K.seg(u, 0.22, 0.42));
        if (b > 0) {
          ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(bx, by, R * b, 0, 7); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.font = `600 ${Math.round(36 * b)}px "IBM Plex Mono"`; ctx.letterSpacing = '0px'; ctx.textAlign = 'center'; ctx.fillText(String(c.n), bx, by + 2);
        }
      }
      // name: wipes in from the balloon (or from its own start, for a plain label)
      const w = K.seg(u, c.n != null ? 0.3 : 0, c.n != null ? 0.6 : 0.3, K.ease.out);
      if (w > 0) {
        const size = c.size || NAME;
        ctx.font = `600 ${size}px "IBM Plex Mono"`; ctx.letterSpacing = '2px'; ctx.textAlign = side > 0 ? 'left' : 'right';
        const tw = ctx.measureText(c.name).width, tx = c.n != null ? bx + side * (R + 16) : bx;
        ctx.save(); ctx.beginPath();
        if (side > 0) ctx.rect(tx - 8, by - size, (tw + 20) * w, size * 2); else ctx.rect(tx + 8 - (tw + 20) * w, by - size, (tw + 20) * w, size * 2);
        ctx.clip();
        halo(ctx, (h) => { if (h) { ctx.lineWidth = 12; ctx.strokeText(c.name, tx, by + 3); } else { ctx.fillStyle = c.n != null ? INK_DARK : ink; ctx.fillText(c.name, tx, by + 3); } });
        ctx.restore(); ctx.letterSpacing = '0px';
      }
    }
    ctx.globalAlpha = 1;
  };
  return { add: (c) => list.push(c), draw, screen };
}

// The reference's part motion: out on a spring past the mark and back, home with a small wind-up. 0 = together.
export const apart = (t, leave, home) => K.clamp(K.spring(t - leave, 1.7, 0.56) * (1 - K.ease.inBack(K.seg(t, home - 0.42, home), 1.2)), -0.2, 1.3);
