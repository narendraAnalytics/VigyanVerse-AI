// Screen furniture for the Life Processes video (Scale Zoom style): labels that wipe in on a leader, big words that
// rise through their own baseline, subtitles bottom left with a sun bar, the field-of-view instrument bottom right,
// and the VigyanVerse logo badge top right. Text never fades: it wipes or rises in and leaves the same way backwards.
import React, { useId } from 'react';
import { Img, staticFile } from 'remotion';
import { C, FONT, LINES, clamp, eo, ei, lerp, seg, spr, H } from './theme';

const TAG = { fontFamily: FONT, fontWeight: 600, fontSize: 18, letterSpacing: 3 } as const;

/** Wipe progress for a label shown from tIn to tOut (enters left to right, leaves right to left). */
export const wipeK = (t: number, tIn: number, tOut: number, dur = 0.45) => eo(seg(t, tIn, tIn + dur)) * (1 - ei(seg(t, tOut, tOut + dur * 0.8)));

/** A small-caps tag above one cream line, joined to its anchor by a 2.5 px leader with one elbow. */
export const Label: React.FC<{ t: number; tIn: number; tOut: number; ax: number; ay: number; lx: number; ly: number; tag: string; line: string; tagColor?: string }> = ({ t, tIn, tOut, ax, ay, lx, ly, tag, line, tagColor = C.sun }) => {
  const id = useId().replace(/:/g, '');
  const k = wipeK(t, tIn + 0.15, tOut);
  const lead = eo(seg(t, tIn, tIn + 0.3)) * (1 - ei(seg(t, tOut + 0.2, tOut + 0.5)));
  if (lead <= 0 && k <= 0) return null;
  const w = Math.max(tag.length * 13.5, line.length * 16.5) + 20;
  // the leader comes in from the side the anchor is on, with one elbow, and ends just outside the plate
  const right = ax > lx + w / 2;
  const ex = right ? lx + w + 22 : lx - 22, ey = ly - 8;
  const mx = right ? Math.max(ex + 30, lerp(ax, ex, 0.6)) : Math.min(ex - 30, lerp(ax, ex, 0.6));
  const pts = [[ax, ay], [mx, ey], [ex, ey]];
  const total = Math.hypot(mx - ax, ey - ay) + Math.abs(ex - mx);
  return (
    <g>
      <circle cx={ax} cy={ay} r={6 * Math.min(1, lead * 3)} fill={C.sun} />
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.cream} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${total * lead} ${total}`} />
      <clipPath id={id}>
        <rect x={lx - 16} y={ly - 54} width={(w + 32) * k} height={110} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect x={lx - 16} y={ly - 50} width={w + 32} height={82} rx={10} fill={C.night} />
        <text x={lx} y={ly - 22} style={TAG} fill={tagColor}>{tag}</text>
        <text x={lx} y={ly + 18} fontFamily={FONT} fontWeight={600} fontSize={32} fill={C.cream}>{line}</text>
      </g>
    </g>
  );
};

/** Big words that rise from below their own baseline through a clip (spring, small overshoot). */
export const RiseText: React.FC<{ t: number; tIn: number; tOut?: number; x: number; y: number; size: number; text: string; color?: string; weight?: number; spacing?: number }> = ({ t, tIn, tOut = 1e9, x, y, size, text, color = C.cream, weight = 700, spacing = -2 }) => {
  const id = useId().replace(/:/g, '');
  const up = spr(t, tIn, 15, 7.5) * (1 - eo(seg(t, tOut, tOut + 0.35)));
  if (t < tIn) return null;
  return (
    <g>
      <clipPath id={id}>
        <rect x={x - 20} y={y - size * 1.05} width={size * text.length * 0.8 + 60} height={size * 1.3} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <text x={x} y={y + size * 1.15 * (1 - up)} fontFamily={FONT} fontWeight={weight} fontSize={size} letterSpacing={spacing} fill={color}>{text}</text>
      </g>
    </g>
  );
};

/** Plain wipe-in line (subtitle of a title card, small caps tags). */
export const WipeText: React.FC<{ t: number; tIn: number; tOut?: number; x: number; y: number; text: string; size: number; color: string; weight?: number; spacing?: number; caps?: boolean }> = ({ t, tIn, tOut = 1e9, x, y, text, size, color, weight = 500, spacing = 0, caps }) => {
  const id = useId().replace(/:/g, '');
  const k = wipeK(t, tIn, tOut, 0.6);
  if (k <= 0) return null;
  return (
    <g>
      <clipPath id={id}>
        <rect x={x - 4} y={y - size * 1.1} width={(text.length * size * (caps ? 0.78 : 0.56) + 40) * k} height={size * 1.5} />
      </clipPath>
      <text clipPath={`url(#${id})`} x={x} y={y} fontFamily={FONT} fontWeight={weight} fontSize={size} letterSpacing={spacing} fill={color}>{text}</text>
    </g>
  );
};

// ---------- subtitles: bottom left, one line, a 5 px sun bar, words light up as they are spoken ----------
type Word = { text: string; s: number; e: number };
const MAX_WORDS = 8;
function phrases(): Word[][] {
  const out: Word[][] = [];
  for (const line of LINES) {
    const tokens = line.text.split(/\s+/).filter(Boolean);
    const words: Word[] = line.words.map(([w, s, e], i) => ({ text: tokens.length === line.words.length ? tokens[i] : w, s: line.at + s, e: line.at + e }));
    // clauses end at punctuation; a long clause splits into balanced parts (never one orphan word)
    let cur: Word[] = [];
    const flush = () => {
      const parts = Math.ceil(cur.length / MAX_WORDS), size = Math.ceil(cur.length / parts);
      for (let i = 0; i < cur.length; i += size) out.push(cur.slice(i, i + size));
      cur = [];
    };
    for (const w of words) {
      cur.push(w);
      if (/[,.?!;:]$/.test(w.text)) flush();
    }
    if (cur.length) flush();
  }
  return out;
}
const PHRASES = phrases();

export const Subtitles: React.FC<{ t: number }> = ({ t }) => {
  const i = PHRASES.findIndex((p, k) => t >= p[0].s - 0.1 && t < Math.min(PHRASES[k + 1] ? PHRASES[k + 1][0].s - 0.1 : Infinity, Math.max(p[p.length - 1].e + 0.6, p[0].s + 1.8)));
  if (i < 0) return null;
  const p = PHRASES[i];
  const rise = eo(seg(t, p[0].s - 0.1, p[0].s + 0.06));
  const size = 38, y0 = H - 62;
  const w = p.reduce((a, w) => a + w.text.length + 1, 0) * size * 0.5 + 40;
  return (
    <g>
      <clipPath id="subclip">
        <rect x={60} y={y0 - 50} width={w + 80} height={66} />
      </clipPath>
      <g clipPath="url(#subclip)" transform={`translate(0,${(1 - rise) * 60})`}>
        <rect x={62} y={y0 - 44} width={w + 40} height={60} rx={10} fill={C.night} />
        <rect x={74} y={y0 - 34} width={5} height={40} rx={2.5} fill={C.sun} />
        <text x={96} y={y0} fontFamily={FONT} fontWeight={500} fontSize={size}>
          {p.map((wd, k) => (
            <tspan key={k} fill={t >= wd.s ? C.cream : C.mist}>{wd.text + (k < p.length - 1 ? ' ' : '')}</tspan>
          ))}
        </text>
      </g>
    </g>
  );
};

// ---------- the corner instrument: field of view (log scale) ----------
export type Stop = { at: number; color: string; label: string };
const LOG0 = -4, LOG1 = 1;   // 100 µm .. 10 m
export const fmtM = (m: number) => {
  const pick = (v: number, u: string) => `${v >= 10 ? Math.round(v) : v.toFixed(1)} ${u}`;
  if (m < 1e-3) return pick(m * 1e6, 'µm');
  if (m < 1e-2) return pick(m * 1e3, 'mm');
  if (m < 1) return pick(m * 100, 'cm');
  return pick(m, 'm');
};

export const Instrument: React.FC<{ logf: number; stops: Stop[]; show: number }> = ({ logf, stops, show }) => {
  if (show <= 0) return null;
  const x0 = 1470, x1 = 1850, y = 1030;
  const at = (l: number) => lerp(x0, x1, clamp((l - LOG0) / (LOG1 - LOG0)));
  const cur = at(logf);
  return (
    <g transform={`translate(0,${(1 - show) * 140})`}>
      <rect x={x0 - 24} y={y - 104} width={x1 - x0 + 48} height={128} rx={12} fill={C.night} />
      <text x={x0} y={y - 74} style={TAG} fill={C.mist}>FIELD OF VIEW</text>
      <text x={x0} y={y - 30} fontFamily={FONT} fontWeight={600} fontSize={36} fill={C.cream}>{fmtM(Math.pow(10, logf))}</text>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={C.n3} strokeWidth={4} strokeLinecap="round" />
      <line x1={x0} y1={y} x2={cur} y2={y} stroke={C.sun} strokeWidth={4} strokeLinecap="round" />
      {stops.map((s, i) => {
        const reached = logf >= s.at - 0.02;
        const px = at(s.at);
        const pop = reached ? 1 : 0.55;
        return (
          <g key={i}>
            <circle cx={px} cy={y} r={9 * pop + 2} fill={C.night} />
            <circle cx={px} cy={y} r={8 * pop} fill={reached ? s.color : C.n3} />
          </g>
        );
      })}
      <circle cx={cur} cy={y} r={6} fill={C.sun} />
    </g>
  );
};

/** VigyanVerse logo badge, top right, on every shot. */
export const LogoBadge: React.FC = () => (
  <div style={{ position: 'absolute', right: 44, top: 40, width: 96, height: 96, borderRadius: '50%', background: C.cream, display: 'grid', placeItems: 'center' }}>
    <Img src={staticFile('logo.png')} style={{ width: 76, height: 76, objectFit: 'contain' }} />
  </div>
);
