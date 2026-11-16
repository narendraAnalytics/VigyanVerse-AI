'use client';

// Diagrams the backend's code-only Diagram agent asks for (owner 2026-11-16):
//   ray    -> an exact mirror / lens ray diagram, drawn here from the backend's numbers
//   ask    -> where is the object? (needed before a converging mirror / lens can be drawn)
//   figure -> the NCERT figure that shows it (number, caption, chapter, page from the textbook)
// The drawing only plots what the backend calculated (src/verify/optics.ts); it never decides
// where the image is.
import { useId } from 'react';
import { BookOpen, PencilRuler } from 'lucide-react';
import type { Diagram } from '@/lib/api';

type Ray = Extract<Diagram, { kind: 'ray' }>;
type Pt = { x: number; y: number };

export function DiagramBlock({ diagram }: { diagram: Diagram }) {
  if (diagram.kind === 'ray') return <RayDiagram d={diagram} />;
  if (diagram.kind === 'ask') {
    const thing = `${diagram.type} ${diagram.element}`;
    const where = diagram.element === 'mirror' ? 'beyond C, at C, between F and C, at F, or between P and F' : 'beyond 2F₁, at 2F₁, between F₁ and 2F₁, at F₁, or between F₁ and O';
    return (
      <p className="mt-3 flex items-start gap-2 rounded-md border border-dashed border-ink/25 px-3 py-2 text-sm text-ink-soft">
        <PencilRuler aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <span>To draw the ray diagram for a {thing}, tell me where the object is: {where} (or give the distances).</span>
      </p>
    );
  }
  return (
    <p className="mt-3 flex items-start gap-2 rounded-md border border-gold-deep/40 bg-gold/10 px-3 py-2 text-sm">
      <BookOpen aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" />
      <span>
        <span className="font-semibold">See the diagram in your textbook: Figure {diagram.figure}</span>
        {diagram.caption ? `, “${diagram.caption}”` : ''}
        {' '}({diagram.chapterNumber ? `Chapter ${diagram.chapterNumber}, ` : ''}{diagram.pageStart === diagram.pageEnd ? `page ${diagram.pageStart}` : `pages ${diagram.pageStart}–${diagram.pageEnd}`}).
        <span className="block text-ink-soft">Copy it with these labels, and practise drawing it from memory.</span>
      </span>
    </p>
  );
}

const fmt = (n: number) => String(Math.round(Math.abs(n) * 10) / 10);

const POSITION: Record<Ray['element'], Record<Ray['position'], string>> = {
  mirror: { infinity: 'at infinity', beyond_2f: 'beyond C', at_2f: 'at C', between_f_2f: 'between F and C', at_f: 'at F', inside_f: 'between P and F', finite: 'in front of the mirror' },
  lens: { infinity: 'at infinity', beyond_2f: 'beyond 2F₁', at_2f: 'at 2F₁', between_f_2f: 'between F₁ and 2F₁', at_f: 'at F₁', inside_f: 'between F₁ and O', finite: 'in front of the lens' },
};

function imageWhere(d: Ray): string {
  if (d.v === null) return 'at infinity';
  if (d.u === null) return d.element === 'mirror' ? (d.nature === 'real' ? 'at F, in front of the mirror' : 'at F, behind the mirror') : d.nature === 'real' ? 'at F₂' : 'at F₁, on the same side as the object';
  const dist = `${fmt(d.v)} cm`;
  if (d.element === 'mirror') return d.nature === 'real' ? `${dist} in front of the mirror` : `${dist} behind the mirror`;
  return d.nature === 'real' ? `${dist} on the other side of the lens` : `${dist} on the same side as the object`;
}

function RayDiagram({ d }: { d: Ray }) {
  const W = 600, H = 300;
  const F = d.focalLength;
  const f = d.f; // signed: the focus the parallel ray goes through (or seems to come from)
  const out = d.element === 'mirror' ? -1 : 1; // light leaves to the left (mirror) or right (lens)
  const h = 1; // object height (drawing units)
  const objAtInf = d.u === null;
  const imgAtInf = d.v === null;
  const u = d.u ?? -3 * F;
  const real = d.nature === 'real';

  // Image point: at infinity -> none; object at infinity -> point image at the focus.
  const img: Pt | null = imgAtInf ? null : objAtInf ? { x: d.v!, y: 0 } : { x: d.v!, y: (d.m ?? 0) * h };

  // World window: object, image, both foci and C / 2F, with a margin; a huge image is clipped.
  const near = Math.max(Math.abs(u), 2 * F);
  const xsBase = [u, -2 * F, 2 * F, 0];
  const imgInView = img && Math.abs(img.x) <= 2.2 * near && Math.abs(img.y) <= 3.2;
  const xs = imgInView ? [...xsBase, img!.x] : xsBase;
  const span = Math.max(...xs) - Math.min(...xs);
  const x0 = Math.min(...xs) - span * 0.12, x1 = Math.max(...xs) + span * 0.12;
  const yMax = Math.max(1.6, imgInView ? Math.abs(img!.y) * 1.25 : 1.6);
  const X = (x: number) => ((x - x0) / (x1 - x0)) * W;
  const Y = (y: number) => H / 2 - (y / yMax) * (H / 2 - 22);
  const P = (p: Pt) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`;

  // Point where a line from s in direction dir leaves the window (for solid outgoing rays).
  const toEdge = (s: Pt, dir: Pt): Pt => {
    let t = Infinity;
    if (dir.x > 0) t = Math.min(t, (x1 - s.x) / dir.x);
    if (dir.x < 0) t = Math.min(t, (x0 - s.x) / dir.x);
    if (dir.y > 0) t = Math.min(t, (yMax - s.y) / dir.y);
    if (dir.y < 0) t = Math.min(t, (-yMax - s.y) / dir.y);
    return { x: s.x + dir.x * t, y: s.y + dir.y * t };
  };
  // Backward (dashed) extension of an outgoing ray to the virtual image's x.
  const backTo = (s: Pt, dir: Pt, x: number): Pt => ({ x, y: s.y + (dir.y / dir.x) * (x - s.x) });

  type Path = { from: Pt; hit: Pt; dir: Pt; colour: string };
  const rays: Path[] = [];
  const focus = { x: f, y: 0 };
  const parallel = (y: number, colour: string): Path => {
    const hit = { x: 0, y };
    let dir = { x: focus.x - hit.x, y: focus.y - hit.y };
    if (Math.sign(dir.x) !== out) dir = { x: -dir.x, y: -dir.y };
    return { from: { x: x0, y }, hit, dir, colour };
  };
  if (objAtInf) {
    rays.push(parallel(0.75, 'var(--chemistry)'), parallel(-0.75, 'var(--physics)'));
  } else {
    const A = { x: u, y: h };
    const r1 = parallel(h, 'var(--chemistry)');
    rays.push({ ...r1, from: A });
    // Through the pole (mirror: reflects symmetrically) / optical centre (lens: goes straight on).
    const pole = { x: 0, y: 0 };
    rays.push({ from: A, hit: pole, dir: d.element === 'mirror' ? { x: u, y: -h } : { x: -u, y: -h }, colour: 'var(--physics)' });
  }

  const marks: { x: number; label: string }[] = d.element === 'mirror'
    ? [{ x: 0, label: 'P' }, { x: f, label: 'F' }, { x: 2 * f, label: 'C' }]
    : [{ x: 0, label: 'O' }, { x: -F, label: 'F₁' }, { x: F, label: 'F₂' }, { x: -2 * F, label: '2F₁' }, { x: 2 * F, label: '2F₂' }];

  // The mirror / lens at x = 0.
  const ex = X(0), top = Y(1.45), bot = Y(-1.45), bow = 12;
  const element = d.element === 'mirror'
    ? (() => {
        // Concave: hollow faces the object, ")" ; convex: bulges toward it, "(" . The back is hatched.
        // Quadratic curve with equal ends: x(t) = ex + e(1 - 2t)², y linear from top to bottom.
        const e = d.type === 'concave' ? -9 : 9;
        const hatch = Array.from({ length: 10 }, (_, i) => {
          const t = (i + 0.5) / 10, y = top + (bot - top) * t;
          const xb = ex + e * Math.pow(1 - 2 * t, 2);
          return <line key={i} x1={xb + 2} y1={y} x2={xb + 10} y2={y - 7} stroke="var(--ink-faint)" strokeWidth={1} />;
        });
        return (
          <g>
            <path d={`M ${ex + e} ${top} Q ${ex - e} ${(top + bot) / 2} ${ex + e} ${bot}`} fill="none" stroke="var(--ink)" strokeWidth={2.5} />
            {hatch}
          </g>
        );
      })()
    : d.type === 'convex'
      ? <path d={`M ${ex} ${top} Q ${ex + 2 * bow} ${(top + bot) / 2} ${ex} ${bot} Q ${ex - 2 * bow} ${(top + bot) / 2} ${ex} ${top} Z`} fill="var(--image)" fillOpacity={0.12} stroke="var(--ink)" strokeWidth={2} />
      : <path d={`M ${ex - bow} ${top} L ${ex + bow} ${top} Q ${ex - bow * 0.6} ${(top + bot) / 2} ${ex + bow} ${bot} L ${ex - bow} ${bot} Q ${ex + bow * 0.6} ${(top + bot) / 2} ${ex - bow} ${top} Z`} fill="var(--image)" fillOpacity={0.12} stroke="var(--ink)" strokeWidth={2} />;

  // Labels under the axis (P/O, F, C, 2F, the feet B and B'): ones at the same spot are merged
  // ("B, C" for an object at C) instead of printed on top of each other.
  const raw: { px: number; text: string; colour: string }[] = marks.map((m) => ({ px: X(m.x) + (m.x === 0 ? (d.element === 'lens' ? 20 : 8) : 0), text: m.label, colour: 'var(--ink)' }));
  if (!objAtInf) raw.push({ px: X(u), text: 'B', colour: 'var(--ink)' });
  if (img && imgInView && !objAtInf && img.y >= 0) raw.push({ px: X(img.x), text: 'B′', colour: 'var(--emerald)' });
  const axisLabels: typeof raw = [];
  for (const l of [...raw].sort((a, b) => a.px - b.px)) {
    const last = axisLabels[axisLabels.length - 1];
    if (last && l.px - last.px < 18) Object.assign(last, { text: `${last.text}, ${l.text}`, colour: 'var(--ink)', px: last.px + 4 });
    else axisLabels.push({ ...l });
  }

  const name = `${d.type[0].toUpperCase()}${d.type.slice(1)} ${d.element}`;
  const objectText = objAtInf ? 'object at infinity' : `object ${d.assumed ? '' : `at ${fmt(u)} cm, `}${POSITION[d.element][d.position]}`;
  const sizeText = d.size === 'point-sized' ? 'point-sized' : d.size;
  const summary = `${name}${d.assumed ? '' : `, f = ${fmt(F)} cm`}, ${objectText}. Image ${imageWhere(d)}: ${imgAtInf ? 'highly magnified' : `${d.nature}, ${d.orientation}, ${sizeText}`}.`;
  const id = `rd${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const COLOURS = { o: 'var(--chemistry)', b: 'var(--physics)', k: 'var(--ink)', g: 'var(--emerald)' } as const;
  const arrow = (c: keyof typeof COLOURS) => `url(#${id}-${c})`;
  const key = (colour: string) => (Object.entries(COLOURS).find(([, v]) => v === colour)?.[0] ?? 'k') as keyof typeof COLOURS;

  return (
    <figure className="mt-3 overflow-hidden rounded-md border border-ink/15 bg-white/90 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ray diagram. ${summary}`} className="h-auto w-full">
        <defs>
          <clipPath id={id}><rect x={0} y={0} width={W} height={H} /></clipPath>
          {/* one arrowhead per colour (context-stroke is not supported everywhere) */}
          {Object.entries(COLOURS).map(([k, c]) => (
            <marker key={k} id={`${id}-${k}`} viewBox="0 0 10 10" refX={5} refY={5} markerWidth={7} markerHeight={7} orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill={c} />
            </marker>
          ))}
        </defs>
        <g clipPath={`url(#${id})`}>
          {/* principal axis */}
          <line x1={0} y1={Y(0)} x2={W} y2={Y(0)} stroke="var(--ink-faint)" strokeWidth={1} />
          {marks.map((m) => <circle key={m.label} cx={X(m.x)} cy={Y(0)} r={2.5} fill="var(--ink)" />)}
          {axisLabels.map((l) => (
            <text key={l.text} x={l.px} y={Y(0) + 16} textAnchor="middle" fontSize={13} fill={l.colour}>{l.text}</text>
          ))}
          {element}
          {/* rays: incoming, outgoing to the edge, and dashed extensions to a virtual image */}
          {rays.map((r, i) => {
            const end = toEdge(r.hit, r.dir);
            const midIn = { x: (r.from.x + r.hit.x) / 2, y: (r.from.y + r.hit.y) / 2 };
            const midOut = { x: (r.hit.x + end.x) / 2, y: (r.hit.y + end.y) / 2 };
            const back = !real && img && !imgAtInf ? backTo(r.hit, r.dir, img.x) : null;
            return (
              <g key={i} stroke={r.colour} strokeWidth={1.6} fill="none">
                <path d={`M ${P(r.from)} L ${P(midIn)} L ${P(r.hit)}`} markerMid={arrow(key(r.colour))} />
                <path d={`M ${P(r.hit)} L ${P(midOut)} L ${P(end)}`} markerMid={arrow(key(r.colour))} />
                {back && <path d={`M ${P(r.hit)} L ${P(back)}`} strokeDasharray="5 4" strokeWidth={1.2} />}
              </g>
            );
          })}
          {/* object AB */}
          {!objAtInf && (
            <g>
              <line x1={X(u)} y1={Y(0)} x2={X(u)} y2={Y(h)} stroke="var(--ink)" strokeWidth={2.5} markerEnd={arrow('k')} />
              <text x={X(u) - 6} y={Y(h) - 6} textAnchor="end" fontSize={13} fill="var(--ink)">A</text>
            </g>
          )}
          {/* image A'B' (dashed when virtual); a point image for an object at infinity */}
          {img && imgInView && (objAtInf ? (
            <circle cx={X(img.x)} cy={Y(0)} r={4.5} fill="var(--emerald)" />
          ) : (
            <g>
              <line x1={X(img.x)} y1={Y(0)} x2={X(img.x)} y2={Y(img.y)} stroke="var(--emerald)" strokeWidth={2.5} strokeDasharray={real ? undefined : '6 4'} markerEnd={arrow('g')} />
              <text x={X(img.x) + 6} y={Y(img.y) + (img.y < 0 ? 16 : -6)} fontSize={13} fill="var(--emerald)">A′</text>
              {img.y < 0 && <text x={X(img.x) + 6} y={Y(0) - 6} fontSize={13} fill="var(--emerald)">B′</text>}
            </g>
          ))}
        </g>
        {img && !imgInView && <text x={W - 8} y={18} textAnchor="end" fontSize={12} fill="var(--ink-soft)">Image too far to fit: {imageWhere(d)}</text>}
        {imgAtInf && <text x={d.element === 'mirror' ? 8 : W - 8} y={18} textAnchor={d.element === 'mirror' ? 'start' : 'end'} fontSize={12} fill="var(--ink-soft)">Rays are parallel: image at infinity</text>}
      </svg>
      <figcaption className="px-1 pb-0.5 pt-1 text-xs leading-snug text-ink-soft">
        {summary}
        {d.assumed && <span className="block italic">No distances were given, so the drawing uses typical distances for this position.</span>}
      </figcaption>
    </figure>
  );
}
