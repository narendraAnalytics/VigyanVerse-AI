'use client';

// "Bindu explains": a tutor answer played as a whiteboard lesson. Bindu's voice (Bulbul audio from
// voice-speak, charged once as bindu_explain) first says a short welcome while the topic heading is written,
// then the marker writes each line while she reads it. A full board is wiped with the felt eraser (a faint
// trace stays) and writing continues from the top; the heading stays. The VigyanVerse logo hangs on a small
// bookmark ribbon from the top-right corner. Replay is free. English only for now.
// Drawing: whiteboard-draw.ts (owner's Whiteboard Explainer style). Timing: board-script.ts.
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import { useReducedMotion } from '@/lib/device';
import { planLesson, type InkTone, type LessonPlan } from '@/lib/board-script';
import {
  BX0, BX1, BY0, BY1, H, W, boardLayer, clamp, easeInOut, frameLayer, grainTiles, handPath, marker, markerInHand, mText, sheen, tip, type Pt,
} from './whiteboard-draw';

const INK: Record<InkTone, string> = { ink: '#1d1f26', blue: '#1f4fc2', red: '#d4262f', green: '#16884a' };
const TEXT_X = 70;
const TEXT_R = BX1 - 50;
const TITLE_Y = 104;
const BODY_Y = 196;
const LINE_H = 60;
/** Lines per board before the eraser wipes it (the citation always fits under the last line). */
const PAGE_ROWS = 6;
/** Area the eraser wipes: everything under the heading. */
const BODY_TOP = 146;
const BODY_BOT = BY1 - 4;
const WIPE = 0.75;
/** How much of the old board the eraser takes away (the rest is the faint trace a real felt leaves). */
const TRACE = 0.985;
/** Bookmark ribbon with the logo, hanging from the top frame (right corner). */
const RIBBON = { x: 958, w: 84, len: 150, logo: 70 };
const EMERALD = '#1f5f5b';

interface Row { text: string; tone: InkTone; y: number; page: number; start: number; end: number; seed: number; last: boolean }
interface Wipe { from: number; to: number }
interface Layout {
  plan: LessonPlan;
  /** Heading timing: letters until `write`, then the two underline strokes. */
  heading: { write: number; u1: number; u2: number };
  titleFont: string;
  title: string;
  underline: [Pt[], Pt[]];
  rows: Row[];
  /** wipes[p - 1] clears page p - 1 before page p is written. */
  wipes: Wipe[];
  cite: { text: string; font: string; y: number; check: Pt[] };
}

type Phase = 'preparing' | 'playing' | 'paused' | 'done';
type Fonts = { marker: string; hand: string };

const bodyFont = (f: Fonts) => `400 46px ${f.hand}`;

function cssFont(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Wrap one board line into rows that fit the text column. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && ctx.measureText(next).width > maxW) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

function buildLayout(ctx: CanvasRenderingContext2D, fonts: Fonts, p: { answer: string; spokenText: string; seconds: number; title: string; greeting: string; citation: string | null }): Layout {
  const plan = planLesson(p.answer, p.spokenText, p.seconds, p.greeting);
  const write = Math.min(plan.titleEnd * 0.8, 2.4);
  const heading = { write, u1: write + 0.22, u2: write + 0.4 };
  const title = p.title.toUpperCase();
  let size = 48;
  ctx.font = `400 ${size}px ${fonts.marker}`;
  const tw = ctx.measureText(title).width;
  const maxTitle = RIBBON.x - 24 - TEXT_X;
  if (tw > maxTitle) size = Math.max(28, Math.floor((size * maxTitle) / tw));
  const titleFont = `400 ${size}px ${fonts.marker}`;
  ctx.font = titleFont;
  const uw = Math.min(maxTitle, ctx.measureText(title).width + 20);
  const underline: [Pt[], Pt[]] = [
    handPath([[TEXT_X - 6, TITLE_Y + 22], [TEXT_X + uw * 0.5, TITLE_Y + 19], [TEXT_X + uw, TITLE_Y + 15]], 1, 2.2),
    handPath([[TEXT_X + 10, TITLE_Y + 35], [TEXT_X + uw * 0.55, TITLE_Y + 31], [TEXT_X + uw * 0.85, TITLE_Y + 29]], 2, 2.2),
  ];

  // Rows, split into boards of up to PAGE_ROWS. A line that does not fit on the current board moves whole to
  // the next one (no lonely last words). Before each new board the eraser wipes the last one: the wipe starts
  // when the last line is finished and the new board's first lines wait for it.
  ctx.font = bodyFont(fonts);
  const rows: Row[] = [];
  const wipes: Wipe[] = [];
  let prevEnd = 0;
  let page = 0;
  let slot = 0; // next free line on the current board
  plan.segments.forEach((s, si) => {
    const parts = wrap(ctx, s.text, TEXT_R - TEXT_X);
    const total = parts.reduce((n, x) => n + x.length, 0) || 1;
    let done = 0;
    const newBoard = (a: number) => {
      const from = Math.max(prevEnd, a - WIPE * 0.5);
      wipes.push({ from, to: from + WIPE });
      page++; slot = 0;
    };
    if (slot > 0 && slot + parts.length > PAGE_ROWS && parts.length <= PAGE_ROWS) newBoard(s.start);
    parts.forEach((x, pi) => {
      let a = s.start + (done / total) * (s.end - s.start);
      done += x.length;
      let b = s.start + (done / total) * (s.end - s.start);
      if (slot === PAGE_ROWS) newBoard(a);
      const lastWipe = wipes[page - 1];
      if (lastWipe) a = Math.max(a, lastWipe.to);
      a = Math.max(a, prevEnd);
      b = Math.max(b, a + 0.25);
      prevEnd = b;
      rows.push({ text: x, tone: s.tone, y: BODY_Y + slot * LINE_H, page, start: a, end: b, seed: 100 + si * 13 + pi, last: pi === parts.length - 1 });
      slot++;
    });
  });
  // Delays from wiping push the citation (and the end) later.
  const citeStart = Math.max(plan.citeStart, prevEnd + 0.15);
  const lessonPlan = { ...plan, citeStart, end: plan.end + (citeStart - plan.citeStart) };
  const citeY = BODY_Y + slot * LINE_H + 14;
  const citeFont = `400 32px ${fonts.marker}`;
  const citeText = p.citation ?? "That's it!";
  ctx.font = citeFont;
  const cx = TEXT_X + ctx.measureText(citeText).width + 26;
  const check = handPath([[cx, citeY - 18], [cx + 14, citeY + 2], [cx + 48, citeY - 44]], 23, 0.8);
  return { plan: lessonPlan, heading, titleFont, title, underline, rows, wipes, cite: { text: citeText, font: citeFont, y: citeY, check } };
}

/** The eraser's three strokes over the board body (left to right, back, and again). */
const BANDS = 3;
function wipeState(q: number) {
  const bandH = (BODY_BOT - BODY_TOP) / BANDS;
  const pass = Math.min(BANDS - 1, Math.floor(q * BANDS));
  const local = clamp(q * BANDS - pass);
  const x0 = BX0 - 10, x1 = BX1 + 10;
  const ltr = pass % 2 === 0;
  const ex = ltr ? x0 + (x1 - x0) * easeInOut(local) : x1 - (x1 - x0) * easeInOut(local);
  const rects: [number, number, number, number][] = [];
  for (let i = 0; i < pass; i++) rects.push([x0, BODY_TOP + i * bandH, x1 - x0, bandH]);
  const y = BODY_TOP + pass * bandH;
  rects.push(ltr ? [x0, y, ex - x0, bandH] : [ex, y, x1 - ex, bandH]);
  return { rects, ex, ey: y + bandH / 2, bandH };
}

/** Writing windows (marker squeak) and wiping windows (eraser rub). */
function soundWindows(L: Layout): { a: number; b: number; kind: 'write' | 'erase' }[] {
  const h = L.heading;
  const writes: [number, number][] = [[0, h.write], [h.write, h.u1], [h.u1, h.u2], ...L.rows.map((r) => [r.start, r.end] as [number, number]), [L.plan.citeStart, L.plan.citeStart + 0.6]];
  return [...writes.map(([a, b]) => ({ a, b, kind: 'write' as const })), ...L.wipes.map((w) => ({ a: w.from, b: w.to, kind: 'erase' as const }))];
}

export function WhiteboardLesson({ src, answer, spokenText, title, greeting, citation, onClose }: {
  /** The paid audio (data URL). Each mount makes its own player: a media element can join only one AudioContext. */
  src: string;
  answer: string;
  spokenText: string;
  /** Board heading: the topic from the textbook section. */
  title: string;
  /** Bindu's welcome at the start of the audio (spoken while the heading is written). */
  greeting: string;
  citation: string | null;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('preparing');
  const ctl = useRef<{ play: () => void; pause: () => void; replay: () => void } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current, box = wrapRef.current;
    if (!canvas || !box) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const audio = new Audio(src);
    const logo = new Image();
    logo.src = '/logo.png';
    let alive = true;
    let raf = 0;
    let t = 0;
    let last = 0;
    let playing = false;
    let voiceStarted = false;
    let layout: Layout | null = null;
    let fonts: Fonts = { marker: '"Permanent Marker", cursive', hand: '"Patrick Hand", cursive' };
    let layers: { board: HTMLCanvasElement; frame: HTMLCanvasElement; grain: HTMLCanvasElement[]; scale: number } | null = null;
    let ac: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let sfx: GainNode | null = null;
    let noiseBuf: AudioBuffer | null = null;
    let level = 0;
    const wave = new Uint8Array(512);

    const fit = () => {
      const cw = box.clientWidth;
      if (!cw) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round((cw * dpr * H) / W);
      const scale = canvas.width / W;
      if (!layers || Math.abs(layers.scale - scale) > 0.01) layers = { board: boardLayer(scale, fonts), frame: frameLayer(scale), grain: grainTiles(scale), scale };
      draw();
    };

    /** Paint the clean board back over a rectangle (logical units); alpha < 1 leaves a faint trace. */
    function rub(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number) {
      if (!layers || w <= 0 || h <= 0) return;
      const s = layers.scale;
      c.save(); c.globalAlpha = alpha;
      c.drawImage(layers.board, x * s, y * s, w * s, h * s, x, y, w, h);
      c.restore();
    }

    /** The felt eraser held in hand, centred at (x, y). */
    function eraser(c: CanvasRenderingContext2D, x: number, y: number) {
      c.save(); c.translate(x, y); c.rotate(-0.06);
      c.save(); c.filter = 'blur(6px)'; c.fillStyle = 'rgba(40,50,60,0.25)'; c.fillRect(-26, -66, 64, 140); c.restore();
      const g = c.createLinearGradient(-30, 0, 30, 0); g.addColorStop(0, '#5b6470'); g.addColorStop(1, '#2c323a');
      c.fillStyle = g; c.beginPath(); c.roundRect(-30, -72, 52, 144, 6); c.fill();
      c.fillStyle = '#3e3e3e'; c.fillRect(-36, -68, 8, 136);
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(-24, -64, 6, 128);
      c.restore();
    }

    /** Small bookmark ribbon with the logo, hanging over the top frame; the logo pulses with the voice. */
    function ribbon(c: CanvasRenderingContext2D, shown: number) {
      if (shown <= 0) return;
      const { x, w, len, logo: ls } = RIBBON, notch = 18, drop = len * easeInOut(shown);
      c.save();
      c.save(); c.filter = 'blur(5px)'; c.fillStyle = 'rgba(30,40,40,0.28)';
      c.beginPath(); c.moveTo(x + 5, 0); c.lineTo(x + w + 5, 0); c.lineTo(x + w + 5, drop + 6); c.lineTo(x + w / 2 + 5, drop - notch + 6); c.lineTo(x + 5, drop + 6); c.fill(); c.restore();
      const g = c.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#174845'); g.addColorStop(0.45, EMERALD); g.addColorStop(1, '#16403d');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x + w, 0); c.lineTo(x + w, drop); c.lineTo(x + w / 2, drop - notch); c.lineTo(x, drop); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(201,162,74,0.7)'; c.lineWidth = 1.5; c.setLineDash([5, 4]);
      c.beginPath(); c.moveTo(x + 7, 0); c.lineTo(x + 7, drop - 6); c.moveTo(x + w - 7, 0); c.lineTo(x + w - 7, drop - 6); c.stroke();
      c.setLineDash([]);
      const cy = drop - notch - ls / 2 - 10;
      if (cy > 20) {
        c.fillStyle = '#fdf8ec';
        c.beginPath(); c.arc(x + w / 2, cy, ls / 2 + 3, 0, 7); c.fill();
        if (logo.complete && logo.naturalWidth) {
          const s = ls * (1 + level * 0.07);
          c.drawImage(logo, x + w / 2 - s / 2, cy - s / 2, s, s);
        }
      }
      c.restore();
    }

    function draw() {
      if (!ctx || !canvas || !layers) return;
      const scale = canvas.width / W;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(layers.board, 0, 0);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      tip.at = null;
      const pr = (a: number, b: number) => (reduced ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
      let eraserAt: [number, number] | null = null;
      if (layout) {
        const L = layout;
        mText(ctx, L.title, TEXT_X, TITLE_Y, L.titleFont, INK.ink, 3, pr(0, L.heading.write), -0.012);
        marker(ctx, L.underline[0], INK.blue, 7, 101, pr(L.heading.write, L.heading.u1));
        marker(ctx, L.underline[1], INK.blue, 6, 102, pr(L.heading.u1, L.heading.u2));
        // Which board is up: page p once its wipe has started.
        const page = L.wipes.filter((w) => t >= w.from).length;
        const wiping = page > 0 && t < L.wipes[page - 1].to;
        const font = bodyFont(fonts);
        const drawRow = (r: Row) => {
          mText(ctx, r.text, TEXT_X, r.y, font, INK[r.tone], r.seed, pr(r.start, r.end));
          if (r.tone === 'green' && r.last) {
            ctx.save(); ctx.font = font;
            const w = Math.min(TEXT_R - TEXT_X, ctx.measureText(r.text).width);
            ctx.restore();
            marker(ctx, handPath([[TEXT_X - 4, r.y + 14], [TEXT_X + w * 0.5, r.y + 11], [TEXT_X + w + 6, r.y + 13]], r.seed, 1.6), INK.green, 5, r.seed + 7, pr(r.end, r.end + 0.3));
          }
        };
        if (page > 0) {
          // The previous board: being wiped now, or already wiped (a faint trace stays).
          L.rows.filter((r) => r.page === page - 1).forEach(drawRow);
          if (wiping && !reduced) {
            const w = L.wipes[page - 1];
            const st = wipeState(clamp((t - w.from) / (w.to - w.from)));
            st.rects.forEach(([x, y, rw, rh]) => rub(ctx, x, y, rw, rh, TRACE));
            eraserAt = [st.ex, st.ey];
          } else {
            rub(ctx, BX0, BODY_TOP, BX1 - BX0, BODY_BOT - BODY_TOP, TRACE);
          }
        }
        tip.at = null; // finished rows are not being written
        for (const r of L.rows) {
          if (r.page !== page || t < r.start) continue;
          drawRow(r);
        }
        const cs = L.plan.citeStart;
        mText(ctx, L.cite.text, TEXT_X, L.cite.y, L.cite.font, INK.green, 21, pr(cs, cs + 0.6), -0.01);
        marker(ctx, L.cite.check, INK.green, 8, 608, pr(cs + 0.6, cs + 0.85));
      }
      // brand printed small in the bottom-right corner, like a real whiteboard
      ctx.save(); ctx.font = `400 19px ${fonts.marker}`; ctx.fillStyle = 'rgba(31,95,91,0.55)'; ctx.textAlign = 'right';
      ctx.fillText('VigyanVerse AI', BX1 - 16, BY1 - 14);
      ctx.restore();
      sheen(ctx, reduced ? 0 : t);
      if (eraserAt) eraser(ctx, eraserAt[0], eraserAt[1]);
      else if (tip.at && !reduced) markerInHand(ctx, tip.at);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(layers.frame, 0, 0);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ribbon(ctx, layout ? pr(0, 0.7) : 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(layers.grain[Math.floor(t * 12) % 3], 0, 0);
      if (barRef.current && layout) barRef.current.style.width = `${(clamp(t / layout.plan.end) * 100).toFixed(1)}%`;
    }

    // ---- sound: voice loudness drives the logo pulse; quiet marker squeak and eraser rub ----
    function ensureAudio() {
      if (ac) return;
      try {
        ac = new AudioContext();
        const node = ac.createMediaElementSource(audio);
        analyser = ac.createAnalyser(); analyser.fftSize = 512;
        node.connect(analyser); analyser.connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        let s = 7;
        for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
      } catch {
        ac = null; analyser = null; // plays without the pulse or the effects
      }
    }
    function stopEffects() { sfx?.disconnect(); sfx = null; }
    function effectsFrom(from: number) {
      stopEffects();
      if (!ac || !noiseBuf || !layout || reduced) return;
      const bus = ac.createGain(); bus.gain.value = 1; bus.connect(ac.destination);
      sfx = bus;
      const now = ac.currentTime + 0.02;
      let k = 1;
      for (const { a, b, kind } of soundWindows(layout)) {
        const erase = kind === 'erase';
        for (let x = Math.max(a, from); x < b; x += (erase ? 0.07 : 0.05) + ((k * 7919) % 13) / 1000) {
          k++;
          const at = now + (x - from), dur = (erase ? 0.08 : 0.045) + ((k * 31) % 10) / 1000;
          const s = ac.createBufferSource(); s.buffer = noiseBuf;
          const f = ac.createBiquadFilter(); f.type = 'bandpass';
          f.frequency.value = (erase ? 800 : 2900) * (0.8 + ((k * 17) % 40) / 100); f.Q.value = erase ? 0.8 : 2.2;
          const g = ac.createGain();
          g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(erase ? 0.08 : 0.045, at + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
          s.connect(f); f.connect(g); g.connect(bus);
          s.start(at, (k * 0.137) % 0.8); s.stop(at + dur + 0.02);
        }
      }
    }
    function voiceLevel() {
      const voice = layout && playing && t >= layout.plan.voiceStart && t < layout.plan.voiceEnd;
      let target = 0;
      if (voice && analyser) {
        analyser.getByteTimeDomainData(wave);
        let sum = 0;
        for (let i = 0; i < wave.length; i++) { const v = (wave[i] - 128) / 128; sum += v * v; }
        target = clamp((Math.sqrt(sum / wave.length) - 0.015) * 9);
      }
      level = reduced ? 0 : level * 0.6 + target * 0.4;
    }

    function tick(now: number) {
      if (!alive || !layout) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const P = layout.plan;
      if (playing) {
        if (t < P.voiceStart) {
          t += dt;
          if (t >= P.voiceStart && !voiceStarted) { voiceStarted = true; audio.currentTime = 0; void audio.play().catch(() => {}); }
        } else if (t < P.voiceEnd && !audio.ended) {
          if (!voiceStarted) { voiceStarted = true; void audio.play().catch(() => {}); }
          t = Math.max(t, P.voiceStart + audio.currentTime);
          if (audio.paused && audio.currentTime === 0) t += dt; // play() refused: keep the board moving
        } else {
          t = Math.max(t, P.voiceEnd) + dt;
        }
        if (t >= P.end) { t = P.end; playing = false; stopEffects(); setPhase('done'); }
      }
      voiceLevel();
      draw();
      raf = playing || level > 0.02 ? requestAnimationFrame(tick) : 0;
    }
    const loop = () => { last = 0; if (!raf) raf = requestAnimationFrame(tick); };

    ctl.current = {
      play() {
        if (!layout) return;
        ensureAudio(); void ac?.resume();
        playing = true; setPhase('playing');
        if (t >= layout.plan.voiceStart && t < layout.plan.voiceEnd) {
          voiceStarted = true;
          audio.currentTime = Math.max(0, t - layout.plan.voiceStart);
          void audio.play().catch(() => {});
        }
        effectsFrom(t);
        loop();
      },
      pause() {
        playing = false; audio.pause(); stopEffects(); setPhase('paused');
      },
      replay() {
        audio.pause(); audio.currentTime = 0; t = 0; voiceStarted = false;
        ctl.current?.play();
      },
    };

    (async () => {
      fonts = { marker: cssFont('--font-marker', fonts.marker), hand: cssFont('--font-board', fonts.hand) };
      try {
        await Promise.all([
          document.fonts.load(`400 48px ${fonts.marker}`, 'AZ'),
          document.fonts.load(bodyFont(fonts), 'Az'),
          logo.decode().catch(() => {}),
        ]);
      } catch { /* draw anyway */ }
      const seconds = await new Promise<number>((resolve) => {
        const ok = () => resolve(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : spokenText.length / 14);
        if (audio.readyState >= 1) ok(); else { audio.addEventListener('loadedmetadata', ok, { once: true }); audio.addEventListener('error', ok, { once: true }); audio.load(); }
      });
      if (!alive) return;
      layers = null;
      layout = buildLayout(ctx, fonts, { answer, spokenText, seconds, title, greeting, citation });
      fit();
      if (process.env.NODE_ENV !== 'production') {
        // Development only: jump to a time for visual checks (window.__lessonSeek(8)).
        (window as unknown as { __lessonSeek?: (s: number) => void }).__lessonSeek = (s: number) => { ctl.current?.pause(); t = s; level = 0; draw(); };
      }
      ctl.current?.play();
    })();

    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      audio.pause();
      stopEffects();
      void ac?.close();
    };
    // One lesson per mount: the parent remounts it for a new answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = phase === 'preparing' ? 'Getting the board ready…' : phase === 'playing' ? 'Bindu is explaining…' : phase === 'paused' ? 'Paused' : 'Done! Replay is free.';

  return (
    <div className="mt-2.5 overflow-hidden rounded-md border-[1.5px] border-ink/20 bg-[#dfe4e3] shadow-[2px_3px_0_rgba(34,30,23,.12)]">
      <div ref={wrapRef} className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas ref={canvasRef} className="block h-full w-full" role="img" aria-label={`Whiteboard lesson: ${title}. ${spokenText}`} />
      </div>
      <div className="flex min-w-0 items-center gap-1.5 border-t border-ink/15 bg-[#fffaf0] px-2 py-1.5">
        {phase === 'playing' ? (
          <button type="button" onClick={() => ctl.current?.pause()} className="shrink-0 rounded-full p-1.5 text-ink-soft hover:bg-ink/5 hover:text-emerald" aria-label="Pause the lesson"><Pause aria-hidden className="h-4 w-4" /></button>
        ) : phase === 'done' ? (
          <button type="button" onClick={() => ctl.current?.replay()} className="shrink-0 rounded-full p-1.5 text-ink-soft hover:bg-ink/5 hover:text-emerald" aria-label="Replay the lesson (free)"><RotateCcw aria-hidden className="h-4 w-4" /></button>
        ) : (
          <button type="button" disabled={phase === 'preparing'} onClick={() => ctl.current?.play()} className="shrink-0 rounded-full p-1.5 text-ink-soft hover:bg-ink/5 hover:text-emerald disabled:opacity-40" aria-label="Play the lesson"><Play aria-hidden className="h-4 w-4" /></button>
        )}
        <div className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-ink/10" aria-hidden>
          <div ref={barRef} className="h-full w-0 rounded-full bg-emerald" />
        </div>
        <span className="font-hand hidden truncate text-sm text-ink-soft sm:inline" aria-live="polite">{label}</span>
        {phase !== 'done' && phase !== 'preparing' && (
          <button type="button" onClick={() => ctl.current?.replay()} className="shrink-0 rounded-full p-1.5 text-ink-faint hover:bg-ink/5 hover:text-emerald" aria-label="Start again (free)"><RotateCcw aria-hidden className="h-3.5 w-3.5" /></button>
        )}
        <button type="button" onClick={onClose} className="shrink-0 rounded-full p-1.5 text-ink-faint hover:bg-ink/5 hover:text-pencil" aria-label="Close the lesson"><X aria-hidden className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
