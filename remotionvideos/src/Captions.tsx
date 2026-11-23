// Word-by-word captions for a narrated video (intro, 2026-11-22). Home-page videos often play muted, so the words are
// on screen too. Each narration line is split into short phrases (at , . ? ! or every 7 words); a phrase appears on a
// cream paper card at the bottom, and each word lights up exactly when it is spoken (Edge TTS word timings, saved by
// scripts/voice.mjs). Spoken words are navy, the word being said is coral, words still to come are faint.
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export type CaptionLine = { at: number; text: string; words?: [string, number, number][] };
type Word = { text: string; s: number; e: number };

const MAX_WORDS = 7;
function phrases(line: CaptionLine): Word[][] {
  const timed = line.words || [];
  const tokens = line.text.split(/\s+/).filter(Boolean);
  // show the script's own spelling and punctuation when it lines up word for word with the timings
  const words: Word[] = timed.map(([w, s, e], i) => ({ text: tokens.length === timed.length ? tokens[i] : w, s: line.at + s, e: line.at + e }));
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (/[,.?!;:]$/.test(w.text) || cur.length >= MAX_WORDS) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}

export const Captions: React.FC<{ lines: CaptionLine[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const all = lines.flatMap(phrases);
  // the phrase on screen: from just before its first word until the next phrase (or 0.6 s after its last word)
  const i = all.findIndex((p, k) => t >= p[0].s - 0.12 && t < Math.min(all[k + 1] ? all[k + 1][0].s - 0.12 : Infinity, p[p.length - 1].e + 0.6));
  if (i < 0) return null;
  const p = all[i];
  const inF = (p[0].s - 0.12) * fps, outT = p[p.length - 1].e + 0.6;
  const pop = spring({ frame: frame - inF, fps, config: { damping: 16, stiffness: 180 } });
  const next = all[i + 1];
  const fade = next && next[0].s - 0.12 < outT ? 1 : interpolate(t, [outT - 0.25, outT], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 64, pointerEvents: 'none' }}>
      <div
        style={{
          maxWidth: 1240, padding: '18px 40px 22px', borderRadius: 18, background: 'rgba(251,243,223,0.96)',
          boxShadow: '0 10px 30px rgba(20,12,4,0.35), inset 0 0 0 2px rgba(226,96,74,0.35)',
          fontFamily: 'Fraunces', fontWeight: 700, fontSize: 50, lineHeight: 1.2, textAlign: 'center', letterSpacing: 0.2,
          opacity: pop * fade, transform: `translateY(${(1 - pop) * 18}px) scale(${0.94 + 0.06 * pop})`,
        }}
      >
        {p.map((w, k) => {
          const said = t >= w.s, now = t >= w.s && t < w.e + 0.05;
          return (
            <span key={k} style={{ color: now ? '#e2604a' : said ? '#22364e' : 'rgba(34,54,78,0.32)', transition: 'none' }}>
              {w.text}
              {k < p.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
