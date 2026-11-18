// Soft Clay kit: the clay surface, material and hand-shaping, copied unchanged from the reference style
// (prompt.txt, styles/soft-clay.js). Needs the kit loaded first (window.THREE and window.K).
import '../kit';

const K = window.K, THREE = window.THREE;

  // 1. THE SURFACE. One tiling height map of what hands and tools leave behind: fingerprints (a shallow dent with
  //    ridges in it), knife drags with a burr, pits, specks, joins that were smoothed over. Grey = untouched.
  let SURFACE = null;
  function claySurface() {
    if (SURFACE) return SURFACE;
    const N = 1024, r = K.rng(3);
    SURFACE = K.canvasTex(N, N, (ctx) => {
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, N, N);
      // draw something at (x, y) and again wherever it crosses the edge, so the map tiles
      const tiled = (x, y, pad, draw) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { if (x + ox < -pad || x + ox > N + pad || y + oy < -pad || y + oy > N + pad) continue; ctx.save(); ctx.translate(x + ox, y + oy); draw(); ctx.restore(); } };
      const pc = document.createElement('canvas'); pc.width = pc.height = 440; const p = pc.getContext('2d');
      for (let i = 0; i < 8; i++) {                                   // fingerprints
        const R = r.range(80, 160), sp = r.range(13, 17), ph = [r.range(0, 6.3), r.range(0, 6.3)], sx = r.range(0.62, 0.82);
        p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.clearRect(0, 0, 440, 440);
        p.translate(220, 220); p.rotate(r.range(0, 6.3));
        let g = p.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, 'rgba(0,0,0,0.26)'); g.addColorStop(0.75, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        p.fillStyle = g; p.fillRect(-220, -220, 440, 440);            // the press: a shallow dent
        p.strokeStyle = 'rgba(255,255,255,0.5)'; p.lineWidth = sp * 0.4; p.lineJoin = 'round';
        for (let k = 1; k * sp < R * 1.6; k++) {                      // the ridges: loops that crowd toward one side, like a real print
          p.beginPath();
          for (let a = 0; a < 6.283; a += 0.05) { const rr = k * sp * (1 + 0.07 * Math.sin(3 * a + ph[0]) + 0.04 * Math.sin(5 * a + ph[1] + k * 0.4)), X = rr * Math.cos(a) * sx, Y = rr * Math.sin(a) * 1.15 + k * sp * 0.42; if (a === 0) p.moveTo(X, Y); else p.lineTo(X, Y); }
          p.closePath(); p.stroke();
        }
        p.globalCompositeOperation = 'destination-in'; g = p.createRadialGradient(0, 0, R * 0.25, 0, 0, R); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        p.fillStyle = g; p.fillRect(-220, -220, 440, 440);
        tiled(r.range(0, N), r.range(0, N), 230, () => ctx.drawImage(pc, -220, -220));
      }
      ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {                                  // tool marks: a drag with a raised burr beside it
        const L = r.range(120, 430), a = r.range(0, 6.3), w = r.range(2, 5), bend = r.range(-30, 30);
        tiled(r.range(0, N), r.range(0, N), 460, () => {
          ctx.rotate(a);
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.quadraticCurveTo(0, bend, L / 2, 0); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = w * 0.8; ctx.beginPath(); ctx.moveTo(-L / 2, w); ctx.quadraticCurveTo(0, bend + w, L / 2, w); ctx.stroke();
        });
      }
      for (let i = 0; i < 4; i++) {                                   // joins: two pieces pushed together and smoothed over
        const a = r.range(0, 6.3), pts = Array.from({ length: 9 }, (_, k) => [(k - 4) * 85, r.range(-26, 26)]);
        tiled(r.range(0, N), r.range(0, N), 420, () => {
          ctx.rotate(a);
          for (const [dy, style, w] of [[0, 'rgba(0,0,0,0.4)', 3.5], [5, 'rgba(255,255,255,0.22)', 5]]) { ctx.strokeStyle = style; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy))); ctx.stroke(); }
        });
      }
      for (let i = 0; i < 170; i++) {                                 // pits (dark) and specks of stuck clay (light)
        const rad = r.range(1.5, 4.5) * (r.chance(0.08) ? 2.4 : 1), up = r.chance(0.22);
        tiled(r.range(0, N), r.range(0, N), 16, () => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad); g.addColorStop(0, up ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.8)'); g.addColorStop(1, up ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 7); ctx.fill(); });
      }
      const im = ctx.getImageData(0, 0, N, N), d = im.data;           // a fine tooth over everything
      for (let i = 0; i < d.length; i += 4) { const v = d[i] + r.range(-7, 7); d[i] = d[i + 1] = d[i + 2] = v; }
      ctx.putImageData(im, 0, 0);
    }, { data: true, repeat: [1, 1] });
    return SURFACE;
  }

  // 2. THE MATERIAL. clay(colour, { marble, marbleAmount, marbleSize, bump, lump, roughness, sheen, tile }) -> a plasticine material
  //    for ANY geometry: no UVs needed. The surface map is projected from three sides in object space (so marks stay
  //    stuck to the object when it moves or squashes), soft dents are added as noise, a second colour is streaked
  //    through, pressed places come out slightly darker and shinier, and a sheen gives the waxy, velvety edge light.
  const CLAY_GLSL = `
    uniform sampler2D uSurf; uniform vec3 uOff, uMarble; uniform float uTile, uBump, uLump, uLumpSize, uMarbleAmt, uMarbleSize;
    varying vec3 vClayP, vClayN;
    float cHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float cNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
      return mix(mix(mix(cHash(i), cHash(i + vec3(1,0,0)), f.x), mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x), mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
    // x: height of the surface in world units (fine marks + soft dents), y: the fine marks alone, -0.5..0.5
    vec2 clayH(vec3 p, vec3 w){
      vec3 q = p / uTile + uOff;
      float fine = dot(w, vec3(texture2D(uSurf, q.zy).r, texture2D(uSurf, q.xz).r, texture2D(uSurf, q.xy).r)) - 0.5;
      vec3 l = p / uLumpSize + uOff * 9.0;
      return vec2(uBump * fine + uLump * (cNoise(l) + 0.5 * cNoise(l * 2.3 + 5.0) - 0.75), fine);
    }
    // bend the normal by a height difference per pixel (Mikkelsen's bump mapping, in true units so it holds at any distance)
    vec3 clayBump(vec3 pos, vec3 n, vec2 dH, float face){
      vec3 sx = dFdx(pos), sy = dFdy(pos), r1 = cross(sy, n), r2 = cross(n, sx);
      float det = dot(sx, r1) * face;
      return normalize(abs(det) * n - sign(det) * (dH.x * r1 + dH.y * r2));
    }`;
  let clayCount = 0;
  function clay(colour, o = {}) {
    const [base, mix] = Array.isArray(colour) ? colour : [colour, o.marble || colour], c = new THREE.Color(base), r = K.rng(101 + clayCount++);
    const m = new THREE.MeshPhysicalMaterial({ color: c, roughness: o.roughness == null ? 0.6 : o.roughness, metalness: 0,
      sheen: o.sheen == null ? 0.4 : o.sheen, sheenRoughness: 0.5, sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.2) });
    const u = { uSurf: { value: claySurface() }, uOff: { value: new THREE.Vector3(r(), r(), r()) }, uMarble: { value: new THREE.Color(mix) },
      uTile: { value: o.tile || 1.5 }, uBump: { value: o.bump == null ? 0.007 : o.bump }, uLump: { value: o.lump == null ? 0.02 : o.lump }, uLumpSize: { value: o.lumpSize || 0.3 },
      uMarbleAmt: { value: o.marbleAmount == null ? 0.4 : o.marbleAmount }, uMarbleSize: { value: o.marbleSize || 0.5 } };
    m.userData.clay = u;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vClayP, vClayN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvClayP = position; vClayN = normal;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + CLAY_GLSL)
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec3 cW = pow(abs(normalize(vClayN)), vec3(4.0)); cW /= cW.x + cW.y + cW.z;
          vec2 cH = clayH(vClayP, cW);
          vec2 cD = vec2(clayH(vClayP + dFdx(vClayP), cW).x, clayH(vClayP + dFdy(vClayP), cW).x) - cH.x;
          float cM = cNoise(vClayP * 0.7 / uMarbleSize + uOff * 5.0);
          float cS = smoothstep(0.3, 0.95, sin(dot(vClayP, vec3(1.1, 1.8, 0.9)) / uMarbleSize + cM * 9.0 + uOff.x * 40.0)) * (0.35 + cM);
          diffuseColor.rgb = mix(diffuseColor.rgb, uMarble, clamp(uMarbleAmt * cS, 0.0, 1.0));
          diffuseColor.rgb *= 1.0 + 0.3 * cH.y;`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + 0.55 * cH.y + 0.12 * (cM - 0.5), 0.32, 1.0);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = clayBump(-vViewPosition, normal, cD, faceDirection);');
    };
    m.customProgramCacheKey = () => 'soft-clay';
    return m;
  }

  // 3. THE HANDS. lumpy(geometry, { amount, size, dents, dentSize, dentDepth, seed }) -> a copy that was shaped by
  //    fingers: every point is pushed by a smooth 3D field (so nothing stays symmetrical, and split vertices on hard
  //    edges never crack apart), then a few thumb dents are pressed in. Normals follow the warp exactly.
  function lumpy(geo, o = {}) {
    const amount = o.amount == null ? 0.03 : o.amount, f = 1 / (o.size || 0.6), seed = o.seed || 1;
    const g = geo.clone(), n = K.noise(seed), r = K.rng(seed + 77), P = g.attributes.position, N = g.attributes.normal, dents = [];
    for (let i = 0; i < (o.dents || 0); i++) { const k = r.int(0, P.count - 1); dents.push([P.getX(k), P.getY(k), P.getZ(k), N.getX(k), N.getY(k), N.getZ(k), (o.dentSize || 0.25) * r.range(0.7, 1.3), (o.dentDepth || 0.04) * r.range(0.6, 1.2)]); }
    const warp = (x, y, z, out) => {
      let dx = 2 * amount * n.n3(x * f + 31.4, y * f, z * f), dy = 2 * amount * n.n3(x * f, y * f + 47.2, z * f), dz = 2 * amount * n.n3(x * f, y * f, z * f + 12.9);
      for (const d of dents) { const q = Math.hypot(x - d[0], y - d[1], z - d[2]) / d[6]; if (q < 1) { const k = d[7] * (1 - q * q) * (1 - q * q); dx -= d[3] * k; dy -= d[4] * k; dz -= d[5] * k; } }
      return out.set(x + dx, y + dy, z + dz);
    };
    const p = new THREE.Vector3(), nn = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), E = 2e-3;
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i); nn.fromBufferAttribute(N, i);
      t1.set(0, 1, 0); if (Math.abs(nn.y) > 0.9) t1.set(1, 0, 0);
      t1.crossVectors(nn, t1).normalize(); t2.crossVectors(nn, t1);                       // two directions lying in the surface
      warp(p.x, p.y, p.z, a); warp(p.x + t1.x * E, p.y + t1.y * E, p.z + t1.z * E, b); warp(p.x + t2.x * E, p.y + t2.y * E, p.z + t2.z * E, c);
      b.sub(a); c.sub(a); nn.crossVectors(b, c).normalize();                              // the warped surface's own normal
      P.setXYZ(i, a.x, a.y, a.z); N.setXYZ(i, nn.x, nn.y, nn.z);
    }
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }
  const part = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; };

export { claySurface, clay, lumpy, part };
