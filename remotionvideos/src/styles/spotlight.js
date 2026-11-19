// Spotlight Stage kit: the toy theatre from the reference style (prompt-spotlightstage.txt, styles/spotlight-stage.js),
// copied unchanged: lamps that are real spot lights with matching ray-marched beams (stopped by a depth pre-pass),
// dust that shows only inside beams, the velvet house curtain and valance, the satin boards and black drapes, and
// cutout() / hung() / onSlot() for painted card scenery. Change: it is a function, makeTheatre(S), that returns its
// parts, plus updateLamps(t) for the per-frame haze and dust bookkeeping the reference did at the end of update(t).
import '../kit';

export function makeTheatre(S) {
      const { THREE, K, scene, camera } = S;
      const TAU = Math.PI * 2;
      const add = (geo, mat, pos, parent = scene, cast = true) => { const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(pos[0], pos[1], pos[2]); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };

      // ------------------------------------------------------------ the stage (world units: the opening is 9 wide and about 5 high)
      const CURTAIN_Z = 0.15, CURTAIN_TOP = 9, WING_X = 6.8, OPEN_X = 4.5, HEM_Y = 5.15, BACK_Z = -4.4;
      // Everything stands in shallow layers, like the grooves of a toy theatre. Upstage is -z.
      const Z = { sky: -3.0, far: -2.5, wind: -2.3, wall: -2.1, hang: -1.9, mid: -1.85, men: -1.6, frame: -1.45, bench: -1.3, flyer: -1.2, front: -0.8, easel: 0.75 };

      // ------------------------------------------------------------ two things every beam needs to know about the scene
      const HAZE_GAIN = 0.4;   // how thick the air is: one number for all beams
      const gateU = { value: new THREE.Vector3(CURTAIN_Z, OPEN_X, HEM_Y) };   // the proscenium: z of the curtain line, half width of the opening, height of the valance hem
      // Depth pre-pass: just before the beams are drawn, the solid scene is drawn once more into a depth texture from
      // the very same camera, so a beam can stop at the first surface in front of it instead of glowing through it.
      // (An invisible mesh that sorts ahead of the beams triggers it, the way three's Reflector renders its mirror.)
      const depthRT = new THREE.WebGLRenderTarget(S.W, S.H, { depthTexture: new THREE.DepthTexture(S.W, S.H), minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      const pre = { tDepth: { value: depthRT.depthTexture }, uProjInv: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2(S.W, S.H) } };
      const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
      const probe = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3)), new THREE.MeshBasicMaterial({ transparent: true, colorWrite: false, depthWrite: false, depthTest: false }));
      probe.frustumCulled = false; probe.renderOrder = 4; scene.add(probe);
      let inPre = false;
      probe.onBeforeRender = (renderer, sc, cam) => {
        if (inPre) return; inPre = true;
        const rt = renderer.getRenderTarget(), auto = renderer.shadowMap.autoUpdate, hide = [dust, probe, ...lamps.map((L) => L.beam)].filter((o) => o.visible);
        hide.forEach((o) => { o.visible = false; }); sc.overrideMaterial = depthOnly; renderer.shadowMap.autoUpdate = false;
        renderer.setRenderTarget(depthRT); renderer.clear(); renderer.render(sc, cam);
        sc.overrideMaterial = null; renderer.shadowMap.autoUpdate = auto; hide.forEach((o) => { o.visible = true; });
        renderer.setRenderTarget(rt); pre.uProjInv.value.copy(cam.projectionMatrix).invert();
        inPre = false;
      };

      // ------------------------------------------------------------ LAMPS: real light + visible beam, always in step
      // The beam is a cone mesh whose shader walks the camera ray through the cone and adds up the light scattered by
      // haze on the way. It uses the same apex, angle and soft edge as the THREE.SpotLight, so the lit pool on the
      // scenery is always exactly where the shaft ends.
      const BEAM_VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
      const HAZE = `
        float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
        // smoke that drifts slowly across the stage: thick and thin patches, never even
        float haze(vec3 p, float t){ return 0.45 + 0.85 * vn(p * 0.5 + vec3(0.11, -0.05, 0.07) * t) + 0.5 * vn(p * 1.5 + vec3(-0.16, 0.09, 0.12) * t); }
        // the proscenium stops light: a point on the far side of the curtain line from the lamp is lit only if the
        // straight line from the lamp to it passes through the opening (between the curtains, under the valance)
        uniform vec3 uGate;   // curtain z, half width of the opening, height of the valance hem
        float gate(vec3 p, vec3 apex){
          float a = apex.z - uGate.x, b = p.z - uGate.x; if (a * b >= 0.0) return 1.0;
          vec3 h = mix(apex, p, a / (a - b));
          return smoothstep(0.0, 0.2, uGate.y - abs(h.x)) * smoothstep(0.0, 0.2, uGate.z - h.y);
        }`;
      const BEAM_FS = `
        uniform vec3 uApex, uDir, uColor; uniform float uCosO, uCosI, uNear, uLen, uTime, uSeed, uWingX;
        uniform sampler2D tDepth; uniform mat4 uProjInv; uniform vec2 uRes;
        varying vec3 vW;
        ${HAZE}
        void main(){
          vec3 ro = cameraPosition, rd = normalize(vW - ro), co = ro - uApex;
          // where the view ray is inside the cone (apex uApex, axis uDir, half angle acos(uCosO))
          float dv = dot(rd, uDir), cv = dot(co, uDir), c2 = uCosO * uCosO;
          float a = dv * dv - c2, b = dv * cv - dot(rd, co) * c2, c = cv * cv - dot(co, co) * c2, disc = b * b - a * c;
          if (disc <= 0.0 || abs(a) < 1e-6) discard;
          float sq = sqrt(disc), tA = (-b - sq) / a, tB = (-b + sq) / a, t0, t1;
          if (a < 0.0) { t0 = tB; t1 = tA; if (cv + dv * 0.5 * (t0 + t1) < 0.0) discard; }   // crossing the cone: in through one side, out through the other
          else if (dv > 0.0) { t0 = max(tA, tB); t1 = 1e4; } else { t0 = -1e4; t1 = min(tA, tB); }   // looking along the cone: inside from one root onwards
          // the beam starts at the lens and ends at its length, the floor or the back wall
          float sN = (uNear - cv) / dv, sL = (uLen - cv) / dv;
          t0 = max(t0, min(sN, sL)); t1 = min(t1, max(sN, sL));
          float tf = (0.005 - ro.y) / rd.y; if (rd.y < 0.0) t1 = min(t1, tf); else t0 = max(t0, tf);
          // ...or at the first solid thing the camera sees along this ray (depth from the pre-pass above)
          vec2 suv = gl_FragCoord.xy / uRes;
          vec4 vp = uProjInv * vec4(suv * 2.0 - 1.0, texture2D(tDepth, suv).x * 2.0 - 1.0, 1.0);
          t1 = min(t1, length(vp.xyz / vp.w));
          t0 = max(t0, 0.0);
          if (t1 <= t0) discard;
          const int N = 26;
          float dt = (t1 - t0) / float(N), jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uSeed) * 43758.5453), sum = 0.0;
          for (int i = 0; i < N; i++) {
            vec3 p = ro + rd * (t0 + (float(i) + jit) * dt), q = p - uApex;
            float h = dot(q, uDir), ca = h / length(q);
            float edge = smoothstep(uCosO, uCosI, ca);                        // the same soft edge as the spot light
            float fall = pow(uNear / h, 1.5);                                 // light thins out as the cone widens
            float wing = (p.z < uGate.x && abs(p.x) > uWingX) ? 0.0 : 1.0;    // the wings swallow what leaves the stage
            sum += edge * fall * haze(p, uTime) * gate(p, uApex) * wing;
          }
          float fwd = 0.75 + 0.9 * pow(0.5 - 0.5 * dv, 2.0);                  // haze scatters more light forwards, towards a camera the lamp faces
          gl_FragColor = vec4(uColor * sum * dt * fwd, 1.0);
        }`;
      const unitCone = new THREE.ConeGeometry(1, 1, 56, 1, false); unitCone.translate(0, -0.5, 0); unitCone.rotateX(Math.PI);   // apex at the origin, opening along +Y
      const lamps = [], yAxis = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), tmp = new THREE.Vector3();

      // makeLamp({ pos, power (candela at full), angle, penumbra, lens (radius), haze (how strongly its beam shows),
      // dust, shadow, soft }) -> lamp.set(aim [x,y,z], level 0..1+, { color: [r,g,b] linear, angle, reach }) to be
      // called from update(t). reach: how far past the aim point the beam still shows (default: until it hits something).
      function makeLamp(o) {
        const L = { o, color: new THREE.Color('#ffffff'), level: 0, apex: new THREE.Vector3(), dir: new THREE.Vector3(0, -1, 0), cosO: 1, cosI: 1 };
        L.light = K.spot(S, { pos: o.pos, target: [0, 0, 0], power: 0, angle: o.angle, penumbra: o.penumbra, soft: o.soft == null ? 0.08 : o.soft, shadow: o.shadow !== false, mapSize: o.mapSize || 2048, near: 0.6, far: 40, bias: -0.0006 });
        L.uni = { uApex: { value: L.apex }, uDir: { value: L.dir }, uColor: { value: new THREE.Color() }, uCosO: { value: 1 }, uCosI: { value: 1 }, uNear: { value: 1 }, uLen: { value: 30 }, uTime: { value: 0 }, uSeed: { value: 0 }, uWingX: { value: WING_X + 0.4 }, uGate: gateU, tDepth: pre.tDepth, uProjInv: pre.uProjInv, uRes: pre.uRes };
        L.beam = new THREE.Mesh(unitCone, new THREE.ShaderMaterial({ vertexShader: BEAM_VS, fragmentShader: BEAM_FS, uniforms: L.uni, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
        L.beam.frustumCulled = false; L.beam.renderOrder = 5; scene.add(L.beam);
        L.set = (aim, level, q = {}) => {
          const ang = q.angle == null ? o.angle : q.angle, lensR = o.lens || 0.14;
          if (q.color) L.color.setRGB(q.color[0], q.color[1], q.color[2]);
          dir.set(aim[0] - o.pos[0], aim[1] - o.pos[1], aim[2] - o.pos[2]).normalize();
          const near = lensR / Math.tan(ang);                                   // the cone's apex sits this far behind the lens
          L.apex.set(o.pos[0], o.pos[1], o.pos[2]).addScaledVector(dir, -near); L.dir.copy(dir); L.level = level;
          L.cosO = Math.cos(ang); L.cosI = Math.cos(ang * (1 - o.penumbra));
          L.light.position.copy(L.apex); L.light.target.position.set(aim[0], aim[1], aim[2]); L.light.angle = ang; L.light.color.copy(L.color); L.light.intensity = o.power * level;
          const u = L.uni; u.uCosO.value = L.cosO; u.uCosI.value = L.cosI; u.uNear.value = near;
          u.uColor.value.copy(L.color).multiplyScalar(level * (o.haze == null ? 1 : o.haze) * HAZE_GAIN);
          const len = q.reach == null ? 30 : tmp.set(aim[0], aim[1], aim[2]).sub(L.apex).length() + q.reach, r = len * Math.tan(ang) * 1.04;
          u.uLen.value = len;
          L.beam.position.copy(L.apex); L.beam.quaternion.setFromUnitVectors(yAxis, dir); L.beam.scale.set(r, len, r); L.beam.visible = level > 0.002;
        };
        lamps.push(L); return L;
      }
      // The rig: two follow spots and two washes out in the house, a top light over the stage, a special for the easel.
      const follow = makeLamp({ pos: [-5.5, 6.9, 12], power: 950, angle: 0.15, penumbra: 0.5, lens: 0.16, haze: 1.5, soft: 0.12 });
      const follow2 = makeLamp({ pos: [6, 6.6, 12], power: 1150, angle: 0.07, penumbra: 0.45, lens: 0.16, haze: 1.0, soft: 0.1 });
      const wash = [-1, 1].map((s) => makeLamp({ pos: [s * 5.6, 5.6, 10.5], power: 620, angle: 0.5, penumbra: 0.85, lens: 0.2, haze: 0.05, dust: 0.15, soft: 0.16, mapSize: 2048 }));
      const top = makeLamp({ pos: [0.3, 8.8, -0.35], power: 1300, angle: 0.17, penumbra: 0.6, lens: 0.14, haze: 2.4, soft: 0.06 });
      const cardLamp = makeLamp({ pos: [1.6, 6.4, 11], power: 760, angle: 0.15, penumbra: 0.45, lens: 0.14, haze: 0.1, dust: 0.3, soft: 0.1, mapSize: 1024 });
      // Horizon lights: a row of small lamps on the floor behind the last sand flat, shining up the sky cloth (a "ground row").
      const horizon = [-6, -3, 0, 3, 6].map((x) => { const l = new THREE.PointLight('#ffffff', 0, 8, 1.3); l.position.set(x, 0.9, Z.sky + 0.45); scene.add(l); return l; });

      // ------------------------------------------------------------ dust: specks that only show where a beam passes
      const NL = lamps.length, NDUST = 2400, dr = K.rng(7), dp = new Float32Array(NDUST * 3), ds = new Float32Array(NDUST * 4);
      for (let i = 0; i < NDUST; i++) { dp.set([dr.range(-6, 6), dr.range(0.1, 6.5), dr.range(-2.5, 6)], i * 3); ds.set([dr(), dr(), dr(), dr()], i * 4); }
      const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(ds, 4));
      const dustU = { uTime: { value: 0 }, uA: { value: lamps.map(() => new THREE.Vector3()) }, uD: { value: lamps.map(() => new THREE.Vector3()) }, uC: { value: lamps.map(() => new THREE.Color()) }, uK: { value: lamps.map(() => new THREE.Vector3()) }, uGate: gateU, uPx: { value: S.H / (2 * Math.tan(15 * Math.PI / 180)) } };
      const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
        uniforms: dustU, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
        vertexShader: `uniform float uTime, uPx; uniform vec3 uA[${NL}], uD[${NL}], uC[${NL}], uK[${NL}]; attribute vec4 aSeed; varying vec3 vC;
          ${HAZE}
          void main(){
            // slow drift, a little different for every speck
            vec3 p = position + vec3(sin(uTime * 0.31 + aSeed.x * 6.28) * 0.22 + uTime * 0.035, uTime * (0.02 + 0.03 * aSeed.y) + sin(uTime * 0.5 + aSeed.z * 6.28) * 0.06, cos(uTime * 0.27 + aSeed.w * 6.28) * 0.2);
            vec3 c = vec3(0.0);
            for (int i = 0; i < ${NL}; i++) { vec3 q = p - uA[i]; float h = dot(q, uD[i]); if (h > uK[i].z) c += uC[i] * smoothstep(uK[i].x, uK[i].y, h / length(q)) * pow(uK[i].z / h, 1.5) * gate(p, uA[i]); }
            float glint = 0.25 + 0.75 * pow(abs(sin(uTime * (0.8 + 2.4 * aSeed.y) + aSeed.x * 40.0)), 8.0);   // flakes turn and catch the light
            vC = c * glint;
            vec4 mv = viewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv; gl_PointSize = (0.011 + 0.01 * aSeed.z) * uPx / -mv.z;
          }`,
        fragmentShader: 'varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC * smoothstep(0.5, 0.15, d), 1.0); }',
      }));
      dust.frustumCulled = false; dust.renderOrder = 6; scene.add(dust);

      // ------------------------------------------------------------ the house curtain and its valance: the frame of the picture
      const velvetMap = K.canvasTex(512, 1024, (c, w, h) => {
        c.fillStyle = '#6a0812'; c.fillRect(0, 0, w, h);
        const r = K.rng(3);
        for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${r.chance(0.5) ? '40,0,6' : '190,40,50'},${r.range(0.02, 0.07)})`; c.fillRect(r.range(0, w), 0, r.range(1, 3), h); }   // the nap runs top to bottom
        const g = c.createLinearGradient(0, h * 0.925, 0, h * 0.965); g.addColorStop(0, '#6b4a12'); g.addColorStop(0.3, '#e0b04a'); g.addColorStop(0.7, '#c8962f'); g.addColorStop(1, '#5a3c0c');
        c.fillStyle = g; c.fillRect(0, h * 0.925, w, h * 0.04);                                                // gold braid above the hem
        for (let x = 0; x < w; x += 8) { c.fillStyle = r.chance(0.5) ? '#d39a2c' : '#a8701a'; c.fillRect(x, h * 0.966, 5, h * 0.034); }   // bullion fringe
      }, { repeat: [5, 1] });
      // Curtain warmers: the soft glow a house curtain is given so it never quite disappears. A real lamp would spill
      // onto the stage, so this light exists only inside the velvet's own shader: a dim key from the front plus the
      // pile catching light where a fold turns away.
      const warmU = { value: new THREE.Color('#ffb48a').multiplyScalar(0.2) };
      const velvetMat = (map) => {
        const m = new THREE.MeshPhysicalMaterial({ map, roughness: 0.92, sheen: 1, sheenColor: new THREE.Color('#e02a34'), sheenRoughness: 0.4, side: THREE.DoubleSide });
        m.onBeforeCompile = (sh) => {
          sh.uniforms.uWarm = warmU;
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uWarm;').replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
            { vec3 wl = normalize((viewMatrix * vec4(0.3, 0.5, 0.8, 0.0)).xyz); float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
              reflectedLight.directDiffuse += uWarm * material.diffuseColor * (max(dot(normal, wl), 0.0) + 2.5 * rim); }`);
        };
        return m;
      };
      const velvet = velvetMat(velvetMap);
      // Each half is a strip of cloth 1.45 times wider than the opening it would close, gathered at the side: the
      // same cloth in less width makes the deep folds. `lag` lets the hem trail and swing.
      const NF = 9, CLOTH = 1.45 * (WING_X + 0.12);
      function makeCurtain(side) {
        const NU = 162, NV = 26, geo = new THREE.PlaneGeometry(1, 1, NU, NV), pos = geo.attributes.position, uv = geo.attributes.uv, r = K.rng(side + 5);
        const foldAmp = Array.from({ length: NF + 2 }, () => r.range(0.75, 1.2)), foldPh = Array.from({ length: NF + 2 }, () => r.range(-0.5, 0.5));
        const mesh = add(geo, velvet, null); mesh.frustumCulled = false;
        let last = '';
        mesh.userData.set = (lead, lag) => {
          const key = lead.toFixed(4) + '|' + lag.toFixed(4); if (key === last) return; last = key;   // same pose as the last call: nothing to do
          const span = WING_X - lead, lam = span / NF;
          const amp = K.clamp(lam / (2 * Math.PI) * Math.sqrt(2 * Math.max(0, (CLOTH / span) ** 2 - 1)) * 0.7, 0.08, 0.2);   // keeps the cloth's width roughly constant
          for (let i = 0; i < pos.count; i++) {
            const u = uv.getX(i), v = uv.getY(i), cf = u * NF, k = Math.floor(cf), f = cf - k;
            const a = K.lerp(foldAmp[k], foldAmp[k + 1], f) * (0.8 + 0.35 * (1 - v)), ph = K.lerp(foldPh[k], foldPh[k + 1], f) * (1 - v) * 0.9;
            const s = 2 * Math.PI * (cf + ph * 0.25);
            const z = amp * a * (Math.sin(s) + 0.28 * Math.sin(2 * s + 1.1 + 2.2 * v));
            const hang = (1 - v) * (1 - v) * (0.25 + 0.75 * u);                                         // the hem trails behind the track, most at the leading edge
            pos.setXYZ(i, side * (WING_X - span * u - lag * hang), 0.02 + v * (CURTAIN_TOP - 0.02), CURTAIN_Z + z + (side > 0 ? 0.07 : 0));
          }
          pos.needsUpdate = true; geo.computeVertexNormals();
        };
        return mesh;
      }
      const curtains = [makeCurtain(-1), makeCurtain(1)];
      {   // the valance: a pleated strip of the same velvet across the top, braid and fringe along its hem
        const map = velvetMap.clone(); map.repeat.set(7, 1); map.needsUpdate = true;
        const geo = new THREE.PlaneGeometry(15, 2.6, 240, 8), p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.07 * Math.sin(x * 7.3) + 0.03 * Math.sin(x * 17 + 1.3)); p.setY(i, y + (y < -1.2 ? 0.05 * Math.cos(x * 7.3) : 0)); }
        geo.computeVertexNormals();
        add(geo, velvetMat(map), [0, HEM_Y + 1.3, CURTAIN_Z + 0.24]);
      }

      // ------------------------------------------------------------ the boards, the black drapes and the slots the scenery runs in
      const boards = K.canvasTex(1024, 1024, (c, w, h) => {
        const r = K.rng(21), NP = 14, pw = w / NP;
        for (let p = 0; p < NP; p++) {
          let y = -r.range(0, h * 0.6);
          while (y < h) {                                                    // boards of different lengths, butt-jointed
            const len = r.range(h * 0.45, h * 0.9), tone = r.range(0.75, 1.15);
            c.fillStyle = `rgb(${Math.round(64 * tone)},${Math.round(40 * tone)},${Math.round(24 * tone)})`; c.fillRect(p * pw, y, pw, len);
            for (let k = 0; k < 26; k++) { c.fillStyle = `rgba(${r.chance(0.5) ? '20,10,4' : '120,84,50'},${r.range(0.04, 0.12)})`; c.fillRect(p * pw + r.range(0, pw), y, r.range(0.6, 2), len); }   // grain
            c.fillStyle = 'rgba(8,5,3,0.9)'; c.fillRect(p * pw, y + len - 2, pw, 2.5);
            for (const nx of [0.22, 0.78]) { c.fillStyle = 'rgba(10,8,6,0.8)'; c.beginPath(); c.arc(p * pw + pw * nx, y + len - 12, 2.2, 0, 7); c.fill(); }   // nail heads
            y += len;
          }
          c.fillStyle = 'rgba(6,4,2,0.95)'; c.fillRect(p * pw - 1, 0, 2.2, h);
        }
        for (let k = 0; k < 420; k++) {                                       // scuffs from years of scenery
          const x = r.range(0, w), y = r.range(0, h), l = r.range(10, 90), a = r.range(-0.5, 0.5);
          c.strokeStyle = `rgba(150,110,70,${r.range(0.03, 0.12)})`; c.lineWidth = r.range(0.6, 3);
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(a) * l, y + Math.cos(a) * l); c.stroke();
        }
      }, { repeat: [20, 20] });
      // a real reflection, blurred like satin varnish: this is what makes the boards "catch the light"
      K.mirrorFloor(S, { y: 0, color: '#ffffff', surfaceRoughness: 0.5, roughness: 0.3, strength: 0.55, fresnel: true, material: { map: boards } });
      const drape = new THREE.MeshBasicMaterial({ color: '#000000' });   // black velour: it is there to swallow light
      add(new THREE.PlaneGeometry(40, 14), drape, [0, 7, BACK_Z], scene, false);
      const wood = new THREE.MeshStandardMaterial({ color: '#7a5330', roughness: 0.7 }), steel = new THREE.MeshStandardMaterial({ color: '#8a8d93', roughness: 0.45, metalness: 0.6 });
      const groove = new THREE.MeshBasicMaterial({ color: '#070504' });
      for (const z of [Z.far, Z.wall, Z.mid, Z.men, Z.bench, Z.front]) { const m = add(new THREE.PlaneGeometry(16, 0.045).rotateX(-Math.PI / 2), groove, [0, 0.006, z], scene, false); m.receiveShadow = false; }

      // ------------------------------------------------------------ CUT-OUTS: everything on the stage is a painted card
      // A piece of art is a list of items in card units (y up, origin at the foot):
      //   { pts, fill, holes?, ink?, cut? }  a filled outline. It is painted AND sawn out of the card (cut: false = paint only)
      //   { line, w, color }                 a painted line
      //   { draw(ctx) }                      free painting
      // cutout() paints the list on a canvas and extrudes the same outlines into one thick card, so the silhouette
      // you see is real geometry: it throws real shadows on the layer behind and stops the beams.
      const INK = '#2a1c12', CARD = '#e6d9bb';
      const ell = (cx, cy, rx, ry = rx, n = 26, a0 = 0, a1 = TAU) => Array.from({ length: n }, (_, i) => { const a = a0 + (a1 - a0) * i / (a1 - a0 > TAU - 1e-6 ? n : n - 1); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
      const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const round = (pts, it = 3) => { for (let k = 0; k < it; k++) { const o = []; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; o.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]); }); pts = o; } return pts; };   // corner cutting: a smooth blob from a rough polygon
      const strip = (line, w) => {   // a line given thickness (w: number, or a function of 0..1 along it)
        const Lf = [], Rt = [], n = line.length, wf = typeof w === 'function' ? w : () => w;
        line.forEach((p, i) => { const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, h = wf(i / (n - 1)) / 2; Lf.push([p[0] - dy / l * h, p[1] + dx / l * h]); Rt.unshift([p[0] + dy / l * h, p[1] - dx / l * h]); });
        return Lf.concat(Rt);
      };
      const limb = (x1, y1, x2, y2, r1, r2 = r1) => { const a = Math.atan2(y2 - y1, x2 - x1); return ell(x2, y2, r2, r2, 9, a - Math.PI / 2, a + Math.PI / 2).concat(ell(x1, y1, r1, r1, 9, a + Math.PI / 2, a + Math.PI * 1.5)); };   // a tapered capsule
      const hull = (pts) => { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = []; for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
      const place = (items, s = 1, dx = 0, dy = 0, flip = 1) => items.map((it) => { const f = (a) => a.map(([x, y]) => [dx + flip * s * x, dy + s * y]), o = Object.assign({}, it); if (it.pts) o.pts = f(it.pts); if (it.holes) o.holes = it.holes.map(f); if (it.line) o.line = f(it.line); return o; });
      const label = (c, text, x, y, size, font, color, align = 'center') => { c.save(); c.translate(x, y); c.scale(size / 100, -size / 100); c.font = font; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(text, 0, 0); c.restore(); };

      function cutout(items, o = {}) {
        const cut = items.filter((it) => it.pts && it.cut !== false), pad = 0.04;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const it of cut) for (const p of it.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
        x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
        const w = x1 - x0, h = y1 - y0, res = Math.min(o.res || 280, 4000 / w, 4000 / h), T = o.thick || 0.045;
        const tex = K.canvasTex(Math.ceil(w * res), Math.ceil(h * res), (c, W, H) => {
          c.fillStyle = CARD; c.fillRect(0, 0, W, H);
          c.setTransform(res, 0, 0, -res, -x0 * res, y1 * res);     // card units, y up
          c.lineJoin = 'round'; c.lineCap = 'round';
          const trace = (pts) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
          for (const it of items) {
            if (it.draw) { c.save(); it.draw(c); c.restore(); continue; }
            if (it.line) { c.beginPath(); it.line.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.strokeStyle = it.color || INK; c.lineWidth = it.w || 0.011; c.stroke(); continue; }
            if (!it.fill) continue;
            c.beginPath(); trace(it.pts); (it.holes || []).forEach(trace);
            c.fillStyle = it.fill; c.fill('evenodd');
            if (it.ink !== 0) { c.strokeStyle = INK; c.lineWidth = it.ink || 0.011; c.stroke(); }   // the printed ink line
          }
          c.setTransform(1, 0, 0, 1, 0, 0);                         // paper grain over the paint
          const r = K.rng(o.seed || 11), n = W * H / 260;
          for (let i = 0; i < n; i++) { c.fillStyle = r.chance(0.5) ? `rgba(255,244,220,${r.range(0.02, 0.07)})` : `rgba(40,25,10,${r.range(0.02, 0.07)})`; c.fillRect(r.range(0, W), r.range(0, H), r.range(1, 3.5), r.range(1, 3.5)); }
        });
        const v2 = (a) => a.map((p) => new THREE.Vector2(p[0], p[1]));
        const geo = new THREE.ExtrudeGeometry(cut.map((it) => { const s = new THREE.Shape(v2(it.pts)); (it.holes || []).forEach((hh) => s.holes.push(new THREE.Path(v2(hh)))); return s; }), { depth: T, bevelEnabled: false, curveSegments: 1 });
        geo.translate(0, 0, -T / 2);
        const uv = geo.attributes.uv, p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x0) / w, (p.getY(i) - y0) / h);                  // the faces take the painting
        for (const g of geo.groups) if (g.materialIndex === 1) for (let i = g.start; i < g.start + g.count; i++) uv.setXY(i, 0.4 * pad / w, 0.4 * pad / h);   // the sawn edges take the margin of the sheet
        geo.clearGroups();
        const mesh = add(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }), null, o.parent || scene);
        mesh.userData.box = { x0, y0, x1, y1 };
        return mesh;
      }
      // Two ways a cut-out gets onto the stage.
      // hung(): flown from above on thin rods (pass the points on the card where the rods are fixed).
      const rodGeo = new THREE.CylinderGeometry(0.011, 0.011, 10, 6).translate(0, 5, 0), wireGeo = new THREE.CylinderGeometry(0.005, 0.005, 10, 5).translate(0, 5, 0);
      function hung(mesh, z, rods, geo = rodGeo) { const g = new THREE.Group(); g.position.z = z; scene.add(g); g.add(mesh); for (const r of rods) add(geo, steel, [r[0], r[1], -0.03], g, false); return g; }
      // onSlot(): standing on a wooden slider in a floor slot, pushed from a wing by a long wire.
      function onSlot(mesh, z, wing, baseW) { const g = new THREE.Group(); g.position.z = z; scene.add(g); mesh.position.y = 0.05; g.add(mesh); add(K.roundedBox(baseW, 0.05, 0.13, 0.012, 2), wood, [0, 0.03, 0], g); add(new THREE.CylinderGeometry(0.009, 0.009, 14, 6).rotateZ(Math.PI / 2), steel, [wing * (7 + baseW / 2), 0.035, 0], g, false); g.userData.card = mesh; return g; }

  const updateLamps = (t) => {
    lamps.forEach((L, i) => {
      L.uni.uTime.value = t; L.uni.uSeed.value = (t * 977) % 61;
      dustU.uA.value[i].copy(L.apex); dustU.uD.value[i].copy(L.dir); dustU.uC.value[i].copy(L.color).multiplyScalar(L.level * (L.o.dust == null ? 1 : L.o.dust) * 5);
      dustU.uK.value[i].set(L.cosO, L.cosI, L.uni.uNear.value);
    });
    dustU.uTime.value = t;
  };
  return { add, TAU, Z, CURTAIN_Z, OPEN_X, HEM_Y, WING_X, lamps, follow, follow2, wash, top, cardLamp, horizon, curtains, updateLamps,
    cutout, hung, onSlot, ell, rect, round, strip, limb, hull, place, label, INK, CARD, wood, steel, rodGeo, wireGeo };
}
