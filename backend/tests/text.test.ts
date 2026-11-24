import { describe, expect, it } from 'vitest';
import { stripPrivateUse } from '../src/shared/text.ts';
import { toItems } from '../src/ingest/textbook.ts';

const EXT = ''; // Adobe Symbol arrow extender, as the NCERT PDF text layer gives it

describe('stripPrivateUse', () => {
  it('removes the PDF arrow-extender glyphs and keeps the arrow and the condition word', () => {
    expect(stripPrivateUse(`2AgBr(s) Sunlight ${EXT} →${EXT}${EXT}${EXT}${EXT} 2Ag(s) + Br2(g)`)).toBe('2AgBr(s) Sunlight → 2Ag(s) + Br2(g)');
    expect(stripPrivateUse(`2FeSO4(s) ${EXT}${EXT}${EXT}${EXT}Heat → Fe2O3(s)`)).toBe('2FeSO4(s) Heat → Fe2O3(s)');
  });

  it('keeps line breaks and leaves clean text untouched', () => {
    expect(stripPrivateUse(`line one ${EXT}\nline two`)).toBe('line one\nline two');
    const clean = 'V = IR\n2H₂ + O₂ → 2H₂O';
    expect(stripPrivateUse(clean)).toBe(clean);
  });
});

describe('ingestion drops private-use glyphs', () => {
  it('chunk lines carry no U+E000-U+F8FF characters', () => {
    const items = toItems([`Science 10\n2AgBr(s) Sunlight ${EXT} →${EXT}${EXT} 2Ag(s) + Br2(g)`], 1, 0);
    const text = JSON.stringify(items);
    expect(text).not.toMatch(/[-]/);
    expect(text).toContain('2AgBr(s) Sunlight → 2Ag(s) + Br2(g)');
  });
});
