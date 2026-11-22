// Hover cursors (owner 2026-11-22): over anything clickable, a coloured pencil in the open section's
// colour, and a fountain pen on the account pages (sign in, create account, new password), as if
// signing your library card. Only the hover cursor changes; the normal arrow and the text cursor stay.
// 32x32 SVG (MDN's advice; browsers drop cursors over 128x128), tip at the top left = the click point,
// keyword fallback `pointer`. Used by globals.css via --cursor-link (mouse / trackpad only).
import type { SectionId } from './sections';

const OUTLINE = '#2b2117';
const HALO = '#fffaf0';

/** A pencil pointing up-left, its body and graphite tip in `color`. */
function pencil(color: string): string {
  // drawn pointing up (tip at 16,1.5), then turned -45 degrees around the centre
  return `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
<g transform='rotate(-45 16 16)' stroke-linejoin='round'>
<path d='M16 1.5 L20.5 9 V30 H11.5 V9 Z' fill='none' stroke='${HALO}' stroke-width='3'/>
<path d='M11.5 9 H20.5 L16 1.5 Z' fill='#f1d3a1'/>
<path d='M14.6 4 H17.4 L16 1.5 Z' fill='${color}'/>
<rect x='11.5' y='9' width='9' height='15.5' fill='${color}'/>
<rect x='11.5' y='9' width='2.6' height='15.5' fill='#ffffff' fill-opacity='.28'/>
<rect x='11.5' y='24.5' width='9' height='2.4' fill='#c9a24a'/>
<rect x='11.5' y='26.9' width='9' height='3.1' fill='#e7a0a4'/>
<path d='M16 1.5 L20.5 9 V30 H11.5 V9 Z' fill='none' stroke='${OUTLINE}' stroke-width='1.1'/>
<path d='M11.5 9 H20.5' stroke='${OUTLINE}' stroke-width='.8'/>
</g></svg>`;
}

/** A fountain pen pointing up-left: gold nib, emerald barrel (the sign-in page colours). */
function fountainPen(): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
<g transform='rotate(-45 16 16)' stroke-linejoin='round'>
<path d='M16 1.5 C18.6 5 20.2 8 20.2 11 V29 C20.2 30.2 19.5 30.8 16 30.8 C12.5 30.8 11.8 30.2 11.8 29 V11 C11.8 8 13.4 5 16 1.5 Z' fill='none' stroke='${HALO}' stroke-width='3'/>
<path d='M16 1.5 C18.6 5 20.2 8 20.2 11 H11.8 C11.8 8 13.4 5 16 1.5 Z' fill='#d8b25a'/>
<path d='M16 3.2 V8.4' stroke='${OUTLINE}' stroke-width='.8'/>
<circle cx='16' cy='8.6' r='.9' fill='${OUTLINE}'/>
<rect x='12.2' y='11' width='7.6' height='3' fill='#2b2117'/>
<path d='M11.8 14 H20.2 V29 C20.2 30.2 19.5 30.8 16 30.8 C12.5 30.8 11.8 30.2 11.8 29 Z' fill='#1f5f5b'/>
<rect x='12.6' y='14' width='2.2' height='15.5' fill='#ffffff' fill-opacity='.22'/>
<rect x='11.8' y='18.5' width='8.4' height='1.4' fill='#c9a24a'/>
<path d='M16 1.5 C18.6 5 20.2 8 20.2 11 V29 C20.2 30.2 19.5 30.8 16 30.8 C12.5 30.8 11.8 30.2 11.8 29 V11 C11.8 8 13.4 5 16 1.5 Z' fill='none' stroke='${OUTLINE}' stroke-width='1.1'/>
</g></svg>`;
}

// The tip lands at about (5.8, 5.8) after the turn.
const asCursor = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}") 6 6, pointer`;

/** Pencil colour per section (the section's own ink; front and back matter in sepia gold). */
const PENCIL: Partial<Record<SectionId, string>> = {
  home: '#9c7a2c',
  physics: '#2e4a7a',
  chemistry: '#c4651f',
  biology: '#3d7a45',
  story: '#8a5a1c',
  tutor: '#1f5f5b',
  learning: '#9b3a2a',
};
const DEFAULT_PENCIL = '#9c7a2c';
const PEN_SECTIONS: SectionId[] = ['sign-in', 'sign-up', 'reset-password'];

const cache = new Map<string, string>();

/** The CSS `cursor` value for clickable things in this section. */
export function linkCursor(section: SectionId): string {
  const key = PEN_SECTIONS.includes(section) ? 'pen' : (PENCIL[section] ?? DEFAULT_PENCIL);
  let v = cache.get(key);
  if (!v) {
    v = asCursor(key === 'pen' ? fountainPen() : pencil(key));
    cache.set(key, v);
  }
  return v;
}
