'use client';

// One small hands-on plate per subject, each built on a fact from the NCERT chapter it names.
// Values live in stores so the copy on a turning page shows the same picture.
import { useId } from 'react';
import { createStore, useStore } from '@/lib/store';
import { usePreview } from '@/components/book/page-context';
import { useReducedMotion } from '@/lib/device';

function Slider({ label, value, min, max, step, unit, onChange, color }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; color: string; onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="w-28 shrink-0 text-sm text-ink-soft">{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer" style={{ accentColor: color }} />
      <output htmlFor={id} className="w-16 text-right font-display text-lg tabular-nums">{value}{unit}</output>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Physics, Chapter 11 Electricity: Ohm's law, V = I R
// ---------------------------------------------------------------------------
const ohm = createStore({ volts: 6, ohms: 10 });

export function OhmLab() {
  const { volts, ohms } = useStore(ohm);
  const preview = usePreview();
  const reduced = useReducedMotion();
  const current = volts / ohms; // A
  const power = volts * current; // W
  const glow = Math.min(1, power / 14);
  const speed = Math.max(0.6, 6 / Math.max(current, 0.05)); // seconds per lap: faster with more current
  const animate = !preview && !reduced;
  const wire = 'M60 40 H300 V170 H60 Z';

  return (
    <figure className="m-0">
      <svg viewBox="0 0 360 210" className="w-full" role="img" aria-label={`Circuit: ${volts} volts across ${ohms} ohms gives ${current.toFixed(2)} amperes`}>
        <path d={wire} fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
        {/* electrons drifting round the circuit */}
        <path id="ohm-wire" d={wire} fill="none" stroke="var(--physics)" strokeWidth="3" strokeDasharray="2 22" strokeLinecap="round" opacity=".85">
          {animate && <animate attributeName="stroke-dashoffset" from="0" to="-48" dur={`${(speed / 10).toFixed(2)}s`} repeatCount="indefinite" />}
        </path>
        {/* cell */}
        <rect x="40" y="70" width="40" height="70" fill="var(--paper)" />
        <line x1="44" y1="98" x2="76" y2="98" stroke="var(--ink)" strokeWidth="3" />
        <line x1="52" y1="112" x2="68" y2="112" stroke="var(--ink)" strokeWidth="6" />
        <text x="18" y="100" className="font-display" fontSize="15" fill="var(--ink)">+</text>
        <text x="18" y="122" className="font-display" fontSize="18" fill="var(--ink)">−</text>
        {/* resistor (zig-zag) */}
        <rect x="150" y="160" width="90" height="20" fill="var(--paper)" />
        <path d="M150 170 l8 -10 l12 20 l12 -20 l12 20 l12 -20 l12 20 l12 -20 l8 10" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
        <text x="178" y="200" fontSize="13" fill="var(--ink-soft)" fontStyle="italic">R = {ohms} Ω</text>
        {/* bulb */}
        <circle cx="180" cy="40" r={30 + glow * 16} fill="#ffd66b" opacity={glow * 0.45} />
        <circle cx="180" cy="40" r="16" fill={`color-mix(in srgb, #ffd66b ${Math.round(glow * 100)}%, var(--paper))`} stroke="var(--ink)" strokeWidth="3" />
        <path d="M172 40 q4 -8 8 0 q4 8 8 0" fill="none" stroke="var(--ink)" strokeWidth="2" />
        {/* ammeter */}
        <circle cx="300" cy="105" r="18" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" />
        <text x="293" y="111" className="font-display" fontSize="17" fill="var(--ink)">A</text>
      </svg>
      <div className="mt-2 space-y-2">
        <Slider label="Voltage (V)" value={volts} min={1} max={12} step={1} unit=" V" color="var(--physics)" onChange={(v) => ohm.set({ volts: v })} />
        <Slider label="Resistance (R)" value={ohms} min={2} max={20} step={1} unit=" Ω" color="var(--physics)" onChange={(v) => ohm.set({ ohms: v })} />
      </div>
      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-4 text-[0.95rem]">
        <span className="font-display text-2xl text-physics">I = V ÷ R = {current.toFixed(2)} A</span>
        <span className="text-ink-soft">Power P = V × I = {power.toFixed(1)} W</span>
      </figcaption>
      <p className="mt-1 text-sm italic text-ink-faint">Ohm’s law, from Chapter 11, Electricity. Double the voltage and the current doubles.</p>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Chemistry, Chapter 2 Acids, Bases and Salts: the pH scale and universal indicator
// Approximate pH values are those in the NCERT chapter's figure of common substances.
// ---------------------------------------------------------------------------
const ph = createStore({ value: 7 });
const SUBSTANCES: { ph: number; name: string }[] = [
  { ph: 1.2, name: 'Gastric juice' },
  { ph: 2.2, name: 'Lemon juice' },
  { ph: 7, name: 'Pure water' },
  { ph: 7.4, name: 'Blood' },
  { ph: 10, name: 'Milk of magnesia' },
  { ph: 14, name: 'Sodium hydroxide solution' },
];
const INDICATOR = ['#d62b26', '#e4492a', '#ef6c2d', '#f39a32', '#f6c13a', '#e4d43c', '#b8d147', '#5fb35a', '#2e9a63', '#1d8a8a', '#2563a8', '#2f4a9e', '#43348f', '#4e2a7c', '#3c1f63'];

export function PhLab() {
  const { value } = useStore(ph);
  const colour = INDICATOR[Math.round(value)];
  const nearest = SUBSTANCES.reduce((a, b) => (Math.abs(b.ph - value) < Math.abs(a.ph - value) ? b : a));
  const nature = value < 7 ? 'acidic' : value > 7 ? 'basic' : 'neutral';

  return (
    <figure className="m-0">
      <svg viewBox="0 0 360 200" className="w-full" role="img" aria-label={`pH ${value}: ${nature}, universal indicator turns this colour`}>
        {/* beaker */}
        <path d="M120 30 V160 Q120 180 140 180 H220 Q240 180 240 160 V30" fill="rgba(255,255,255,.35)" stroke="var(--ink)" strokeWidth="3" />
        <path d={`M123 80 H237 V160 Q237 177 220 177 H140 Q123 177 123 160 Z`} fill={colour} opacity=".85" style={{ transition: 'fill .4s' }} />
        <path d="M112 30 H248" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        {[100, 120, 140].map((y) => <line key={y} x1="124" x2="140" y1={y} y2={y} stroke="var(--ink)" strokeWidth="1.5" />)}
       <text x="252" y="120" className="font-hand" fontSize="17" fill="var(--pencil)">{nature}!</text>
      </svg>
      <div className="mt-1 h-3 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${INDICATOR.join(',')})` }} aria-hidden />
      <div className="mt-1 flex justify-between text-xs text-ink-faint" aria-hidden><span>0 acidic</span><span>7 neutral</span><span>14 basic</span></div>
      <div className="mt-2">
        <Slider label="pH value" value={value} min={0} max={14} step={1} unit="" color="var(--chemistry)" onChange={(v) => ph.set({ value: v })} />
      </div>
      <figcaption className="mt-2 text-[0.95rem]">
        <span className="font-display text-2xl text-chemistry">pH {value}</span>
        <span className="ml-3 text-ink-soft">Close to: {nearest.name} (about pH {nearest.ph})</span>
      </figcaption>
      <p className="mt-1 text-sm italic text-ink-faint">From Chapter 2, Acids, Bases and Salts. Below 7 is acidic, above 7 is basic.</p>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Biology, Chapter 8 Heredity: Mendel's tall (T) and short (t) pea plants
// ---------------------------------------------------------------------------
const GENOTYPES = ['TT', 'Tt', 'tt'] as const;
type Genotype = (typeof GENOTYPES)[number];
const cross = createStore<{ a: Genotype; b: Genotype }>({ a: 'Tt', b: 'Tt' });

function Pea({ tall }: { tall: boolean }) {
  return (
    <svg viewBox="0 0 40 60" className="h-12 w-8" aria-hidden>
      <path d={tall ? 'M20 58 V8' : 'M20 58 V34'} stroke="var(--biology)" strokeWidth="3" />
      {(tall ? [16, 28, 40] : [44]).map((y, i) => (
        <path key={y} d={i % 2 ? `M20 ${y} q10 -8 16 -2 q-8 8 -16 2` : `M20 ${y} q-10 -8 -16 -2 q8 8 16 2`} fill="#7cbf6c" stroke="var(--biology)" strokeWidth="1.5" />
      ))}
      <circle cx="20" cy={tall ? 7 : 33} r="4" fill="#c7a6e8" />
    </svg>
  );
}

export function PeaLab() {
  const { a, b } = useStore(cross);
  const kids = [a[0] + b[0], a[0] + b[1], a[1] + b[0], a[1] + b[1]].map((g) => g.split('').sort().join('') as string);
  const tall = kids.filter((k) => k.includes('T')).length;
  const pick = (which: 'a' | 'b', label: string) => (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">{label}</legend>
      <span className="w-20 text-sm text-ink-soft">{label}</span>
      {GENOTYPES.map((g) => (
        <label key={g} className={`cursor-pointer rounded-full border px-3 py-0.5 font-display text-lg ${(which === 'a' ? a : b) === g ? 'border-biology bg-biology text-paper' : 'border-ink/30 hover:border-biology'}`}>
          <input type="radio" className="sr-only" name={`parent-${which}`} checked={(which === 'a' ? a : b) === g} onChange={() => cross.set({ [which]: g })} />
          {g}
        </label>
      ))}
    </fieldset>
  );

  return (
    <figure className="m-0">
      <div className="space-y-2">{pick('a', 'Parent 1')}{pick('b', 'Parent 2')}</div>
      <table className="mx-auto mt-4 border-collapse text-center" aria-label="Punnett square">
        <thead>
          <tr>
            <th className="h-8 w-10" />
            <th className="w-24 font-display text-xl text-biology">{a[0]}</th>
            <th className="w-24 font-display text-xl text-biology">{a[1]}</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1].map((row) => (
            <tr key={row}>
              <th className="font-display text-xl text-biology">{b[row]}</th>
              {[0, 1].map((col) => {
                const g = (a[col] + b[row]).split('').sort().join('');
                return (
                  <td key={col} className="border-[1.5px] border-ink/50 p-1">
                    <div className="flex items-center justify-center gap-1"><Pea tall={g.includes('T')} /><span className="font-display text-lg">{g}</span></div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="mt-3 text-[0.95rem]">
        <span className="font-display text-2xl text-biology">{tall} tall : {4 - tall} short</span>
        <span className="ml-3 text-ink-soft">T (tall) is dominant over t (short)</span>
      </figcaption>
      <p className="mt-1 text-sm italic text-ink-faint">From Chapter 8, Heredity: Mendel’s cross of Tt × Tt gives tall and short plants in the ratio 3 : 1.</p>
    </figure>
  );
}
