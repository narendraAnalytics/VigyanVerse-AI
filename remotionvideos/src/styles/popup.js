// Paper Pop-Up kit: the pop-up book from the reference style (prompt-paperpopup.txt, styles/paper-pop-up.js), kept as
// close to the original as possible: the paper (fibre, cockle, ink speckle), the die-cutter (marching squares around
// whatever is drawn, a cream margin, bare card on the cut edge), the fold mechanisms ('v', 'box', 'float', slide), the
// ribbon of words, the page-turn clock, the book, the wooden table, its offcuts, mug and pencil, and the lamp light.
// Changes for the intro video (2026-11-22):
//   - content comes in as options: makePopupBook(S, { C, SPREADS, TURNS, TURN, cover, pull }) returns update(t) and parts
//   - a real front cover: the left half of the book (its board, page block and a printed cloth cover with a pasted
//     paper label) lies folded over the right half and swings open; its hinge pulls the first spread up, so opening
//     the cover IS the first page turn. cover: { open: [t0, seconds], draw(a), label: { size, at, draw(a) }, cloth }
//   - leaves: leaf j carries the right page of spread j on its front and the left page of spread j + 1 on its back
//     (the reference started on an endpaper); TURNS[j] is when leaf j turns (one fewer than the spreads)
//   - pieces may set `bob` (a slow idle sway, radians), `spin(t)` (floats: turn about the glue point) and `show(t)` (visible only part of the time, for a piece that
//     changes, e.g. a laptop screen that lights up); the ribbon takes an optional `em` (letter size)
//   - fold 'stand': a card standing on the page (signs) or sliding along a track (tokens), see MAKE.stand
//   - the lamp spot is returned (`lamp`, `lampPower`) so the story can dim or brighten it
//   - close: [t0, seconds] (2026-11-23): at the end the whole left half (cover, its block and every turned leaf) swings
//     back over as one stack, so the book shuts on its cover again; the last spread's pieces fold flat as it comes over.
//     pull.back = [t0, t1] slides the pull tab back in first.
// Camera and sound stay in the story file.
import '../kit';

export function makePopupBook(S, opts) {
  const { THREE, K, scene } = S;
  const { C, SPREADS } = opts;
  const PAGE_W = opts.PAGE_W || 5.6, PAGE_D = opts.PAGE_D || 6.4;
  const TURN = opts.TURN || 1.25, TURNS = opts.TURNS || [];
  const COVER = opts.cover;
  const PULL = opts.pull;   // { spread, at: [t0, t1], x: [x0, x1], z }
  const pulled = (t) => (PULL ? K.seg(t, PULL.at[0], PULL.at[1], K.ease.inOut) * (PULL.back ? 1 - K.seg(t, PULL.back[0], PULL.back[1], K.ease.inOut) : 1) : 0);
  const CLOSE = opts.close;   // [t0, seconds]: the book shuts again at the end

  // ---------------------------------------------------------------- the book's clock
  // How far a leaf has turned: 0 = lying on the right, PI = lying on the left. Lifted slowly, swings over, lands with
  // some speed left and bounces once on the air and the folded paper under it.
  const flipFor = (dur) => (t, t0) => { const u = (t - t0) / dur; if (u <= 0) return 0; if (u < 1) return Math.PI * u * u * (2.2 - 1.2 * u); const v = t - t0 - dur; return Math.PI - 0.034 * Math.abs(Math.sin(v * 11)) * Math.exp(-v * 6); };
  const flip = flipFor(TURN);
  const coverFlip = COVER ? flipFor(COVER.open[1]) : null;
  const coverPhi = (t) => (COVER ? coverFlip(t, COVER.open[0]) : Math.PI);
  // how far the left half has swung back over to close the book (0 = open, PI = shut), with the same landing bounce
  const closeFlip = CLOSE ? flipFor(CLOSE[1]) : null;
  const closing = (t) => (CLOSE ? closeFlip(t, CLOSE[0]) : 0);
  // when spread s has landed open (its pieces tremble from then on)
  const landed = (s) => (s === 0 ? (COVER ? COVER.open[0] + COVER.open[1] : -1) : TURNS[s - 1] + TURN);

  S.renderer.localClippingEnabled = true;                    // sliders are cut off where they pass through the page
  const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => mul(a, 1 / Math.hypot(a[0], a[1], a[2])), rad = (d) => d * Math.PI / 180;

  // ------------------------------------------------------------ 1. paper
  const CARD_T = 0.03, LEAF_T = 0.045, PX = 150;             // thickness of a cut-out and of a page; print resolution in pixels per unit
  const fibre = K.canvasTex(1024, 1024, (ctx, w, h) => {
    const n = K.noise(3), r = K.rng(8), im = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 128 + 70 * n.fbm(x * 0.006, y * 0.006, 0, 2) + 34 * n.fbm(x * 0.05, y * 0.05, 3, 3) + 14 * (K.hash(x, y) - 0.5); im.data.set([v, v, v, 255], (y * w + x) * 4); }
    ctx.putImageData(im, 0, 0); ctx.lineCap = 'round';
    for (let i = 0; i < 5200; i++) { const x = r.range(0, w), y = r.range(0, h), q = r.range(0, 6.3), len = r.range(8, 34); ctx.strokeStyle = `rgba(255,255,255,${r.range(0.05, 0.3)})`; ctx.lineWidth = r.range(0.8, 1.8); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(q + 0.6) * len * 0.5, y + Math.sin(q + 0.6) * len * 0.5, x + Math.cos(q) * len, y + Math.sin(q) * len); ctx.stroke(); }
  }, { data: true });
  fibre.wrapS = fibre.wrapT = THREE.RepeatWrapping;
  const bumpFor = (w, h) => { const b = fibre.clone(); b.repeat.set(w / 3.2, h / 3.2); b.needsUpdate = true; return b; };
  const speck = document.createElement('canvas'); speck.width = speck.height = 256;
  { const x = speck.getContext('2d'), im = x.createImageData(256, 256), r = K.rng(2); for (let i = 0; i < 65536; i++) { const v = 255 - 30 * Math.pow(r(), 3) - (r.chance(0.012) ? 60 : 0); im.data.set([v, v, v * 0.985, 255], i * 4); } x.putImageData(im, 0, 0); }
  const grain = (ctx, w, h) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ctx.createPattern(speck, 'repeat'); ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'source-over'; };
  const paper = (map, w, h) => new THREE.MeshStandardMaterial({ map, bumpMap: bumpFor(w, h), bumpScale: 0.45, roughness: 0.93, metalness: 0 });
  const core = new THREE.MeshStandardMaterial({ color: '#fbf5e6', roughness: 0.95 });

  // the pen every `art` and `floor` function draws with: world units, y up
  const pen = (ctx, back) => {
    const a = {
      ctx, back,
      path(col, fn) { ctx.fillStyle = col; ctx.beginPath(); fn(ctx); ctx.fill(); return a; },
      disc(col, x, y, rx, ry = rx, rot = 0) { return a.path(col, (c) => c.ellipse(x, y, rx, ry, rot, 0, 7)); },
      box(col, x, y, w, h, r = 0) { return a.path(col, (c) => c.roundRect(x, y, w, h, r)); },
      line(col, w, fn, dash) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = ctx.lineJoin = 'round'; ctx.setLineDash(dash || []); ctx.beginPath(); fn(ctx); ctx.stroke(); ctx.setLineDash([]); return a; },
      ridge(col, x0, x1, top, y0 = -0.1) { return a.path(col, (c) => { c.moveTo(x0, y0); for (let x = x0; x <= x1 + 1e-6; x += 0.1) c.lineTo(x, top(x)); c.lineTo(x1, y0); }); },
      clip(fn, inside) { ctx.save(); ctx.beginPath(); fn(ctx); ctx.clip(); inside(); ctx.restore(); return a; },
      text(str, x, y, size, col, align = 'center', font = '700 100px "Fraunces"') { if (a.back) return a; ctx.save(); ctx.translate(x, y); ctx.scale(size / 100, -size / 100); ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = col; ctx.fillText(str, 0, 0); ctx.restore(); return a; },
      // an image (e.g. the logo) centred at x, y, `size` wide, upright on the page
      image(img, x, y, size) { if (a.back) return a; const h = size * img.height / img.width; ctx.save(); ctx.translate(x, y); ctx.scale(1, -1); ctx.drawImage(img, -size / 2, -h / 2, size, h); ctx.restore(); return a; },
    };
    return a;
  };
  const ruler = document.createElement('canvas').getContext('2d');
  const widthOf = (str, size, font = '700 100px "Fraunces"') => { ruler.font = font; return ruler.measureText(str).width * size / 100; };

  // ------------------------------------------------------------ 2. the die-cutter (unchanged)
  function trace(f, w, h, level, i0, i1) {
    const at = (i, j) => (i < i0 || i > i1 || j < 0 || j >= h ? 0 : f[j * w + i]), EW = w + 3;
    const id = (i, j, upright) => ((j + 1) * EW + i + 1) * 2 + upright, next = new Map(), where = new Map();
    const SEG = [[], [3, 2], [2, 1], [3, 1], [1, 0], [3, 2, 1, 0], [2, 0], [3, 0], [0, 3], [0, 2], [0, 3, 2, 1], [0, 1], [1, 3], [1, 2], [2, 3], []];
    for (let j = -1; j < h; j++) for (let i = Math.max(-1, i0 - 1); i <= Math.min(w - 1, i1); i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1), seg = SEG[(a >= level ? 8 : 0) | (b >= level ? 4 : 0) | (c >= level ? 2 : 0) | (d >= level ? 1 : 0)];
      if (!seg.length) continue;
      const ids = [id(i, j, 0), id(i + 1, j, 1), id(i, j + 1, 0), id(i, j, 1)];
      const pts = [[i + (level - a) / (b - a), j], [i + 1, j + (level - b) / (c - b)], [i + (level - d) / (c - d), j + 1], [i, j + (level - a) / (d - a)]];
      for (let k = 0; k < seg.length; k += 2) { next.set(ids[seg[k]], ids[seg[k + 1]]); where.set(ids[seg[k]], pts[seg[k]]); where.set(ids[seg[k + 1]], pts[seg[k + 1]]); }
    }
    const loops = [];
    while (next.size) { const start = next.keys().next().value, loop = []; let k = start; do { loop.push(where.get(k)); const n = next.get(k); next.delete(k); k = n; } while (k !== start && k !== undefined); loops.push(loop); }
    return loops;
  }
  function simplify(pts, tol) {
    const n = pts.length; if (n < 8) return pts;
    let far = 0, fd = 0; for (let i = 1; i < n; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
    const keep = new Uint8Array(n + 1), P = (i) => pts[i % n], stack = [[0, far], [far, n]]; keep[0] = keep[far] = 1;
    while (stack.length) {
      const [i0, i1] = stack.pop(), a = P(i0), b = P(i1), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1e-9; let m = -1, md = tol;
      for (let i = i0 + 1; i < i1; i++) { const p = P(i), d = Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len; if (d > md) { md = d; m = i; } }
      if (m > 0) { keep[m] = 1; stack.push([i0, m], [m, i1]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  const areaOf = (l) => { let s = 0; for (let i = 0; i < l.length; i++) { const p = l[i], q = l[(i + 1) % l.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; };
  const inside = (p, l) => { let c = false; for (let i = 0, j = l.length - 1; i < l.length; j = i++) if ((l[i][1] > p[1]) !== (l[j][1] > p[1]) && p[0] < (l[j][0] - l[i][0]) * (p[1] - l[i][1]) / (l[j][1] - l[i][1]) + l[i][0]) c = !c; return c; };

  const MARGIN = 0.045;
  function dieCut(x0, y0, w, h, draw) {
    const cw = Math.ceil(w * PX / 4) * 4, ch = Math.ceil(h * PX / 2) * 2, mw = cw / 2, mh = ch / 2; w = cw / PX; h = ch / PX;
    const art = document.createElement('canvas'); art.width = cw; art.height = ch;
    const ctx = art.getContext('2d'); ctx.setTransform(PX, 0, 0, -PX, -x0 * PX, (y0 + h) * PX); draw(pen(ctx));
    const soft = document.createElement('canvas'); soft.width = mw; soft.height = mh;
    const sx = soft.getContext('2d', { willReadFrequently: true }); sx.filter = `blur(${(MARGIN * PX / 2 / 0.84).toFixed(2)}px)`; sx.drawImage(art, 0, 0, mw, mh);
    const px = sx.getImageData(0, 0, mw, mh).data, f = new Float32Array(mw * mh); for (let i = 0; i < f.length; i++) f[i] = px[i * 4 + 3] / 255;
    const print = (back) => K.canvasTex(cw, ch, (c) => { c.fillStyle = C.card; c.fillRect(0, 0, cw, ch); if (back) { c.setTransform(PX, 0, 0, -PX, -x0 * PX, (y0 + h) * PX); draw(pen(c, true)); } else c.drawImage(art, 0, 0); grain(c, cw, ch); });
    const tex = print(false), rear = print(true);
    const mid = Math.round(-x0 * PX / 2);
    const outline = (side) => {
      const loops = trace(f, mw, mh, 0.2, side > 0 ? mid : 0, side < 0 ? mid - 1 : mw - 1)
        .map((l) => simplify(l.map(([i, j]) => { const x = x0 + (2 * i + 1) / PX; return [side && Math.abs(x) < 2.4 / PX ? 0 : x, y0 + h - (2 * j + 1) / PX]; }), 0.004))
        .filter((l) => l.length > 2 && Math.abs(areaOf(l)) > 0.004);
      const sign = Math.sign(areaOf(loops.reduce((a, b) => (Math.abs(areaOf(b)) > Math.abs(areaOf(a)) ? b : a), loops[0])));
      const solid = loops.filter((l) => Math.sign(areaOf(l)) === sign).map((l) => ({ l, shape: new THREE.Shape(l.map((p) => new THREE.Vector2(p[0], p[1]))) }));
      loops.filter((l) => Math.sign(areaOf(l)) !== sign).forEach((hole) => { const o = solid.find((s) => inside(hole[0], s.l)); if (o) o.shape.holes.push(new THREE.Path(hole.map((p) => new THREE.Vector2(p[0], p[1])))); });
      return solid.map((s) => s.shape);
    };
    return { tex, rear, outline, x0, y0, w, h };
  }
  let cards = 1;
  function card(cut, side, parent) {
    const g = new THREE.ExtrudeGeometry(cut.outline(side), { depth: CARD_T, bevelEnabled: false }); g.translate(0, 0, -CARD_T / 2);
    const p = g.attributes.position, uv = g.attributes.uv, nm = g.attributes.normal, r = K.rng(cards++), bx = r.range(-0.05, 0.05), by = r.range(0.03, 0.08) * r.sign();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = nm.getZ(i); uv.setXY(i, (x - cut.x0) / cut.w, (y - cut.y0) / cut.h);
      if (Math.abs(z) > 0.9) { const k = 1 / Math.hypot(1, bx * x, by * (y - 1)); nm.setXYZ(i, -bx * x * k * z, -by * (y - 1) * k * z, z * k); }
    }
    const all = g.groups.slice(); g.clearGroups();
    all.forEach((q) => { if (q.materialIndex) g.addGroup(q.start, q.count, 1); else { g.addGroup(q.start, q.count / 2, 2); g.addGroup(q.start + q.count / 2, q.count / 2, 0); } });
    const m = new THREE.Mesh(g, [paper(cut.tex, cut.w, cut.h), core, paper(cut.rear, cut.w, cut.h)]); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; m.frustumCulled = false; parent.add(m);
    return m;
  }
  const seat = (m, X, Y, O) => { const Z = cross(X, Y); m.matrix.set(X[0], Y[0], Z[0], O[0], X[1], Y[1], Z[1], O[1], X[2], Y[2], Z[2], O[2], 0, 0, 0, 1); m.matrixWorldNeedsUpdate = true; };

  // ------------------------------------------------------------ 3. the fold mechanisms (unchanged, plus bob / show)
  function hinge(aL, aR) {
    const psi = (Math.PI - aL + aR) / 2, a = Math.min((aL + aR) / 2, Math.PI / 2 - 0.004), s = Math.sin(a), c = Math.cos(a);
    const b = [Math.cos(psi), Math.sin(psi), 0], x = [Math.sin(psi), -Math.cos(psi), 0];
    return { a, b, dL: add(mul(x, -c), b, s), dR: add(mul(x, c), b, s), nL: add(mul(x, s), b, c), nR: add(mul(x, -s), b, c) };
  }
  function solveV(h, alpha, beta, point) {
    const sa = Math.sin(alpha), ca = Math.cos(alpha), A = sa * Math.sin(h.a), g = Math.atan2(A, ca) + Math.acos(K.clamp(Math.cos(beta) / Math.hypot(A, ca), -1, 1));
    const c = [h.b[0] * Math.sin(g), h.b[1] * Math.sin(g), point * Math.cos(g)], out = (d) => { const gl = [d[0] * sa, d[1] * sa, point * ca]; return unit(add(gl, c, -dot(gl, c))); };
    return { c, uL: out(h.dL), uR: out(h.dR) };
  }
  const showAt = (o, meshes, t) => { if (o.show) { const v = o.show(t); meshes.forEach((m) => { m.visible = v; }); } };
  const MAKE = {
    v(o, byId, group) {
      const cut = dieCut(-o.size[0] / 2, -0.1, o.size[0], o.size[1] + 0.25, o.art), L = card(cut, -1, group), R = card(cut, 1, group);
      const slit = o.slide ? [new THREE.Plane(), new THREE.Plane()] : null;
      if (slit) [L, R].forEach((m, i) => m.material.forEach((mt, k) => { if (k) m.material[k] = mt = mt.clone(); mt.clippingPlanes = [slit[i]]; mt.clipShadows = true; }));
      const part = { o, meshes: [L, R], pose(h, t) {
        const v = solveV(h, rad(o.alpha), rad(o.beta || 90), o.point === 'back' ? 1 : -1), up = o.slide ? o.slide(t) : 0, O = [v.c[0] * up, v.c[1] * up, o.z + v.c[2] * up];
        part.wing = { '-1': { X: mul(v.uL, -1), Y: v.c, O, n: h.nL }, 1: { X: v.uR, Y: v.c, O, n: h.nR } };
        seat(L, part.wing[-1].X, v.c, O); seat(R, v.uR, v.c, O);
        if (slit) { slit[0].normal.set(...h.nL); slit[1].normal.set(...h.nR); slit[0].constant = slit[1].constant = -LEAF_T / 2; }
        showAt(o, part.meshes, t);
      } };
      return part;
    },
    box(o, byId, group) {
      const side = o.span[0] < 0 ? -1 : 1, cut = dieCut(o.span[0], -0.1, o.span[1] - o.span[0], o.height + 0.25, o.art), front = card(cut, 0, group);
      const g = new THREE.BoxGeometry(0.5, o.depth, CARD_T); g.translate((o.span[0] + o.span[1]) / 2, o.depth / 2, 0);
      const strap = new THREE.Mesh(g, core); strap.castShadow = strap.receiveShadow = true; strap.matrixAutoUpdate = false; group.add(strap);
      // slide (intro): the piece rises through a slit in its page, cut off below the page like the reference's V slider
      const slit = o.slide ? new THREE.Plane() : null;
      if (slit) { front.material = front.material.map((mt) => { const m = mt.clone(); m.clippingPlanes = [slit]; m.clipShadows = true; return m; }); strap.material = strap.material.clone(); strap.material.clippingPlanes = [slit]; strap.material.clipShadows = true; }
      const part = { o, meshes: [front, strap], pose(h, t) {
        const w = byId[o.on].wing[side], out = cross(w.X, w.n), up = o.slide ? o.slide(t) : 0, O = add(add(w.O, out, o.depth), w.Y, up);
        seat(front, w.X, w.Y, O); seat(strap, w.X, mul(out, -1), add(O, w.Y, o.strap));
        if (slit) { slit.normal.set(...(side < 0 ? h.nL : h.nR)); slit.constant = -LEAF_T / 2; }
        part.frame = { O, X: w.X, Y: w.Y, n: cross(w.X, w.Y) };   // where the piece is, for lights that follow it
        showAt(o, [front, strap], t);
      } };
      return part;
    },
    float(o, byId, group, s) {
      const [x0, y0, x1, y1] = o.area, cut = dieCut(x0, y0, x1 - x0, y1 - y0, o.art), m = card(cut, 0, group);
      return { o, meshes: [m], pose(h, t) {
        const w = byId[o.on].wing[o.side], lift = o.gap * Math.max(0, dot(w.Y, w.n)) + CARD_T * K.clamp((Math.PI / 2 - h.a) * 8), dt = t - landed(s);
        const open = K.clamp((Math.PI / 2 - h.a) * 3);   // the idle bob fades in as the spread opens
        const q = (dt > 0 ? 0.085 * (o.sway || 0) * Math.sin(dt * 21) * Math.exp(-dt * 2.4) : 0) + (o.bob || 0) * open * Math.sin(t * (o.bobRate || 2.1) + (o.bobPhase || 0)) + (o.spin ? o.spin(t) : 0);   // spin: turns about the glue point (a clock hand), radians, + = anticlockwise
        const X = add(mul(w.X, Math.cos(q)), w.Y, Math.sin(q)), Y = add(mul(w.Y, Math.cos(q)), w.X, -Math.sin(q));
        let O = add(add(w.O, w.X, o.at[0]), w.Y, o.at[1]); O = add(add(O, X, -o.at[0]), Y, -o.at[1]);
        seat(m, X, Y, add(O, cross(w.X, w.Y), lift));
        showAt(o, [m], t);
      } };
    },
    // stand (intro 2026-11-22): a small card that stands up on the page itself (a "floating layer" on a short tab),
    // facing the reader. It lies flat while the book is shut and stands up as the spread opens. o.at = [x, y] on the
    // open spread (x across, 0 = gutter; y = toward the back), or o.path(t) -> [x, y] for a token that slides along a
    // track like a pull-tab slider; o.size = [w, h]; o.hop(t) lifts it (a station reacting); `show(t)` as usual.
    stand(o, byId, group) {
      const [w, hgt] = o.size, cut = dieCut(-w / 2, -0.1, w, hgt + 0.15, o.art), m = card(cut, 0, group);
      return { o, meshes: [m], pose(h, t) {
        const [x, y] = o.path ? o.path(t) : o.at, side = x < 0 ? -1 : 1, d = side < 0 ? h.dL : h.dR, n = side < 0 ? h.nL : h.nR;
        const th = (Math.PI / 2) * K.ease.inOut(K.clamp(1 - h.a / (Math.PI / 2) * 1.6));   // stands up in the last part of the opening
        const X = side < 0 ? mul(d, -1) : d, Y = add(mul(n, Math.sin(th)), [0, 0, -1], Math.cos(th));
        const O = add(add(mul(d, Math.abs(x)), [0, 0, -y]), n, LEAF_T / 2 + 0.004 + (o.hop ? o.hop(t) : 0));
        seat(m, X, Y, O);
        showAt(o, [m], t);
      } };
    },
  };
  const ribbon = ([left, right], em = 0.76) => {
    const gap = 0.2, H = 1.0, xl = -(gap + widthOf(left, em) + 0.3), xr = gap + widthOf(right, em) + 0.3, tail = 0.42;
    return { fold: 'v', z: 1.95, alpha: 78, size: [2 * (Math.max(-xl, xr) + tail) + 0.1, H], art(a) {
      a.path(C.cream, (c) => { c.moveTo(xl - tail, -0.1); c.lineTo(xl - tail + 0.26, H / 2 - 0.05); c.lineTo(xl - tail, H); c.lineTo(xr + tail, H); c.lineTo(xr + tail - 0.26, H / 2 - 0.05); c.lineTo(xr + tail, -0.1); });
      a.box(C.coral, xl - tail + 0.32, H - 0.15, xr - xl + 2 * tail - 0.64, 0.055); a.box(C.coral, xl - tail + 0.32, 0.06, xr - xl + 2 * tail - 0.64, 0.055);
      a.text(left, -gap, 0.27, em, C.navy, 'right'); a.text(right, gap, 0.27, em, C.navy, 'left');
    } };
  };
  const spreads = SPREADS.map((sp, s) => {
    const group = new THREE.Group(), byId = {}; scene.add(group);
    const parts = [...sp.parts, ...(sp.words ? [ribbon(sp.words, sp.em)] : [])].map((o) => { const p = MAKE[o.fold](o, byId, group, s); if (o.id) byId[o.id] = p; return p; });   // ids are per spread
    return { group, parts, byId };
  });
  // the paper engineer's check: shut every spread and see that nothing sticks out of the closed book
  const corner = new THREE.Vector3();
  spreads.forEach((sp, s) => {
    const h = hinge(0, Math.PI - 0.02); sp.parts.forEach((p) => p.pose(h, 99));
    sp.parts.forEach((p, i) => { let over = 0; p.meshes.forEach((m) => { const q = m.geometry.attributes.position; for (let k = 0; k < q.count; k += 3) { corner.fromBufferAttribute(q, k).applyMatrix4(m.matrix); over = Math.max(over, -corner.x - PAGE_W, Math.abs(corner.z) - PAGE_D / 2); } }); if (over > 0.02 && !p.o.slide && p.o.fold !== 'stand') console.error(`pop-up: piece ${i} of spread ${s + 1} (${p.o.id || p.o.fold}) sticks ${over.toFixed(2)} out of the closed book`); });
  });

  // ------------------------------------------------------------ 4. the book
  const FPX = 128, book = new THREE.Group(); scene.add(book);
  const printed = (side, draw) => K.canvasTex(Math.round(PAGE_W * FPX), Math.round(PAGE_D * FPX), (ctx, w, h) => {
    ctx.fillStyle = C.card; ctx.fillRect(0, 0, w, h); ctx.setTransform(FPX, 0, 0, -FPX, side < 0 ? PAGE_W * FPX : 0, PAGE_D / 2 * FPX); draw(pen(ctx));
    ctx.setTransform(1, 0, 0, 1, 0, 0); const g = ctx.createLinearGradient(side < 0 ? w : 0, 0, side < 0 ? w - 60 : 60, 0); g.addColorStop(0, 'rgba(70,50,30,0.3)'); g.addColorStop(1, 'rgba(70,50,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h);
  });
  const face = (side, draw, back) => { const t = printed(side, draw); if (back) { t.center.set(0.5, 0.5); t.rotation = Math.PI; } return paper(t, PAGE_W, PAGE_D); };
  const leaves = TURNS.map((_, j) => {
    const g = new THREE.BoxGeometry(PAGE_W, LEAF_T, PAGE_D); g.translate(PAGE_W / 2, 0, 0);
    const m = new THREE.Mesh(g, [core, core, face(1, SPREADS[j].floor), face(-1, SPREADS[j + 1].floor, true), core, core]);
    m.castShadow = m.receiveShadow = true; book.add(m); return m;
  });
  const BLOCK_H = 0.3, TABLE_Y = -BLOCK_H - 0.06;
  const edges = new THREE.MeshStandardMaterial({ roughness: 0.95, map: K.canvasTex(32, 256, (ctx, w, h) => { ctx.fillStyle = '#f4ecda'; ctx.fillRect(0, 0, w, h); for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? 'rgba(120,96,60,0.5)' : 'rgba(150,126,90,0.35)'; ctx.fillRect(0, (k + 0.5) * h / 7, w, 2.5); } }) });
  const block = (side, top, parent) => { const g = new THREE.BoxGeometry(PAGE_W, BLOCK_H, PAGE_D); g.translate(side * PAGE_W / 2, -BLOCK_H / 2, 0); const m = new THREE.Mesh(g, [edges, edges, top, edges, edges, edges]); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  // the left half of the book swings on the gutter: it is the front cover while the book is shut
  const coverGroup = new THREE.Group(); book.add(coverGroup);
  const blockL = block(-1, face(-1, SPREADS[0].floor), coverGroup), blockR = block(1, face(1, SPREADS[SPREADS.length - 1].floor), book);
  const weave = K.canvasTex(256, 256, (ctx) => { ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 256, 256); for (let i = 0; i < 256; i += 4) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(i, 0, 2, 256); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, i, 256, 2); } }, { data: true, repeat: [14, 9] });
  const cloth = new THREE.MeshStandardMaterial({ color: (COVER && COVER.cloth) || '#1f4a4b', roughness: 0.82, bumpScale: 2.5, bumpMap: weave });
  const BOARD = [PAGE_W + 0.22, PAGE_D + 0.44];
  for (const side of [-1, 1]) { const b = new THREE.Mesh(K.roundedBox(BOARD[0], 0.07, BOARD[1], 0.025, 3), cloth); b.position.set(side * (PAGE_W / 2 + 0.17), TABLE_Y + 0.035, 0); b.castShadow = b.receiveShadow = true; (side < 0 ? coverGroup : book).add(b); }
  const spine = new THREE.Mesh(K.roundedBox(0.5, 0.05, BOARD[1], 0.02, 2), cloth); spine.position.set(0, TABLE_Y + 0.025, 0); spine.receiveShadow = true; book.add(spine);
  // the printed cloth cover and its pasted paper label, on the outside (underside) of the left board. Seated so the
  // picture reads upright from the reader's side when the book is shut: picture x -> world +x, picture y -> away (-z).
  const coverCenter = [-(PAGE_W / 2 + 0.17), TABLE_Y - 0.0015, 0];
  if (COVER) {
    const CW = BOARD[0] - 0.05, CD = BOARD[1] - 0.05, CPX = 200;
    const tex = K.canvasTex(Math.round(CW * CPX), Math.round(CD * CPX), (ctx, w, h) => { ctx.setTransform(CPX, 0, 0, -CPX, w / 2, h / 2); COVER.draw(pen(ctx), CW, CD); });
    const print = new THREE.Mesh(new THREE.PlaneGeometry(CW, CD), new THREE.MeshStandardMaterial({ map: tex, bumpMap: weave, bumpScale: 1.6, roughness: 0.78 }));
    print.matrixAutoUpdate = false; print.receiveShadow = true; coverGroup.add(print);
    seat(print, [-1, 0, 0], [0, 0, -1], coverCenter);
    if (COVER.label) {
      const [lw, lh] = COVER.label.size, [lx, ly] = COVER.label.at || [0, 0];
      const cut = dieCut(-lw / 2, -lh / 2, lw, lh, COVER.label.draw), m = card(cut, 0, coverGroup);
      seat(m, [-1, 0, 0], [0, 0, -1], [coverCenter[0] - lx, TABLE_Y - 0.003 - CARD_T / 2, -ly]);
    }
  }
  let tab = null;
  if (PULL) {
    const grip = dieCut(-0.6, -0.32, 1.2, 0.64, (a) => { a.box(C.coral, -0.52, -0.25, 1.04, 0.5, 0.16); for (const x of [-0.24, 0.06]) a.line(C.cream, 0.09, (c) => { c.moveTo(x, 0.12); c.lineTo(x + 0.16, 0); c.lineTo(x, -0.12); }); });
    tab = card(grip, 0, blockR); tab.rotation.x = -Math.PI / 2; tab.matrixAutoUpdate = true;
  }

  // ------------------------------------------------------------ 5. the table and the lamp (unchanged)
  const wood = K.canvasTex(1024, 1024, (ctx, w, h) => {
    const n = K.noise(12), r = K.rng(6), im = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) { const plank = Math.floor(y / 128), tone = 0.82 + 0.3 * K.hash(plank, 3); for (let x = 0; x < w; x++) { const v = K.clamp(0.5 + 1.25 * n.fbm(x * 0.0016 + plank * 9, y * 0.035, plank, 4) + 0.12 * n.n2(x * 0.02, y * 0.7)) * tone; im.data.set([40 + 78 * v, 23 + 46 * v, 12 + 24 * v, 255], (y * w + x) * 4); } }
    ctx.putImageData(im, 0, 0);
    for (let i = 0; i < 2200; i++) { ctx.fillStyle = `rgba(12,6,2,${r.range(0.1, 0.4)})`; ctx.fillRect(r.range(0, w), r.range(0, h), r.range(6, 40), 1); }
    for (let p = 0; p < 8; p++) { ctx.fillStyle = 'rgba(8,4,2,0.75)'; ctx.fillRect(0, p * 128, w, 2); }
  }, { repeat: [5, 5] });
  const table = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: wood, bumpMap: wood, bumpScale: 1.2, roughness: 0.58 }));
  table.rotation.x = -Math.PI / 2; table.position.y = TABLE_Y; table.receiveShadow = true; scene.add(table);
  const bits = K.rng(31), inks = [C.coral, C.yellow, C.leaf, C.cream, C.pink];
  [[-7.2, 2.6], [-6.7, 3.6], [6.9, 3.1], [7.5, 1.6], [6.6, -3.6], [-7.0, -2.9], [-3.2, 4.4], [2.2, 4.3], [-6.5, -4.6], [4.2, -4.7]].forEach(([x, z], i) => {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(bits.range(0.5, 1.3), bits.range(-0.1, 0.2)); sh.lineTo(bits.range(0.2, 0.9), bits.range(0.35, 0.8)); if (i % 2) sh.lineTo(bits.range(-0.2, 0.1), bits.range(0.4, 0.7));
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: CARD_T, bevelEnabled: false }), [new THREE.MeshStandardMaterial({ color: inks[i % inks.length], roughness: 0.93 }), core]);
    m.rotation.set(-Math.PI / 2, 0, bits.range(0, 6.3)); m.position.set(x, TABLE_Y + 0.002, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  });
  const glaze = new THREE.MeshStandardMaterial({ color: '#1d3a44', roughness: 0.3 }), mug = new THREE.Group(); mug.position.set(-6.9, TABLE_Y, -6.2); scene.add(mug);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.85, 2.0, 40), glaze); cup.position.y = 1.0; const ear = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.13, 12, 32), glaze); ear.position.set(1.05, 1.0, 0.3); ear.rotation.y = -0.3; mug.add(cup, ear); mug.traverse((m) => { m.castShadow = m.receiveShadow = true; });
  const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5.2, 6), new THREE.MeshStandardMaterial({ color: '#d99a1e', roughness: 0.45 })); pencil.rotation.set(Math.PI / 2, 0, 1.25); pencil.position.set(6.6, TABLE_Y + 0.1, -5.4); pencil.castShadow = pencil.receiveShadow = true; scene.add(pencil);

  K.env(S, { top: '#2a2119', horizon: '#3d3024', bottom: '#6b5740', intensity: 1.0, panels: [{ pos: [9, 11, 7], size: [7, 7], color: '#ffd9a6', power: 3 }, { pos: [-12, 6, -9], size: [6, 8], color: '#8fa8ff', power: 1.1 }] });
  const lampPower = 1250;
  const lamp = K.spot(S, { pos: [4.5, 9.5, 11], target: [-0.2, 0.8, 0], color: '#ffe9d0', power: lampPower, angle: 0.62, penumbra: 0.85, soft: 1.3, mapSize: 4096 });
  K.spot(S, { pos: [-8, 5.5, -10], target: [0, 1, 0], color: '#c2d0ff', power: 150, angle: 0.5, penumbra: 1, shadow: false });
  K.skyLight(S, { color: '#ffe8d2', power: 1.1, size: 9, center: [0, 0, 0] });

  const riseOf = (j, t) => K.seg(t, TURNS[j], TURNS[j] + TURN * 0.5, K.ease.inOut), sinkOf = (j, t) => K.seg(t, TURNS[j] + TURN * 0.6, TURNS[j] + TURN, K.ease.inOut);
  return {
    C, PAGE_W, PAGE_D, TABLE_Y, CARD_T, pen, widthOf, lamp, lampPower, spreads, landed, coverPhi, flip, pulled, closing,
    update(t) {
      // closing: the left stack turns back as one rigid piece about a gutter line at y = piv, so its top leaf lands on
      // the right page and the cover ends on top, in the same pose as before the cover opened. While the book is open
      // the kit sinks the left block into the table (the open spread stays flat), which leaves the cover board inside
      // the stack: in the first 20 degrees of the swing (e) the board, print and label move back under the block, and
      // in the second half (e2) the right block sinks and the pivot drops, so the shut book is as thick as at the start.
      const k = closing(t), sk = Math.sin(k), ck = Math.cos(k), DL = LEAF_T * TURNS.length;
      const e = K.seg(k, 0, 0.35, K.ease.inOut), e2 = K.seg(k, 0.5 * Math.PI, Math.PI, K.ease.inOut), PIV = LEAF_T / 2 - DL * e2 / 2;
      const phi = TURNS.map((t0) => flip(t, t0) - k), cphi = coverPhi(t) - k;
      coverGroup.rotation.z = cphi - Math.PI;
      const v = -DL * e - PIV; coverGroup.position.set(v * sk, v * ck + PIV, 0);
      // the cloth spine wraps the side of the shut book and lies flat under the gutter when it is open
      const sr = (Math.PI - cphi) / 2; spine.rotation.z = sr; spine.position.set(-0.06 * Math.sin(sr), (TABLE_Y + 0.025) * Math.cos(sr), 0); spine.scale.x = K.lerp(1, 1.6, Math.sin(sr));
      let onRight = 0, onLeft = 0;
      leaves.forEach((m, j) => { let below = 0; for (let i = 0; i < j; i++) below += 1 - riseOf(i, t); for (let i = j + 1; i < leaves.length; i++) below += sinkOf(i, t); m.rotation.z = phi[j]; const y = -LEAF_T * below; m.position.set((y - PIV) * sk, (y - PIV) * ck + PIV, 0); onRight += 1 - riseOf(j, t); onLeft += sinkOf(j, t); });
      blockR.position.y = LEAF_T / 2 - LEAF_T * onRight - DL * e2; blockL.position.y = LEAF_T / 2 - LEAF_T * onLeft + DL * e;
      if (tab) tab.position.set(K.lerp(PULL.x[0], PULL.x[1], pulled(t)), CARD_T / 2 + 0.004, PULL.z);
      spreads.forEach((sp, s) => {
        const aL = s === 0 ? Math.PI - cphi : Math.PI - phi[s - 1], aR = s < leaves.length ? phi[s] : 0;
        sp.group.visible = aL + aR < Math.PI - 0.02;
        if (sp.group.visible) { const h = hinge(aL, aR); sp.parts.forEach((p) => p.pose(h, t)); }
      });
    },
  };
}
