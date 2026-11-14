import { describe, expect, it } from 'vitest';
import { linkFormulaLines, rebuildFormulaLines, rebuildFormulaText, type TextItem } from '../src/ingest/layout.ts';

// Real item coordinates from the NCERT PDFs (scripts/probe-pdf-items.ts), as [str, x, y, w, size].
type Raw = [string, number, number, number, number];
const items = (raw: Raw[]): TextItem[] => raw.map(([str, x, y, w, size]) => ({ str, x, y, w, size }));
const line = (raw: Raw[]) => ({ items: items(raw), text: raw.map((r) => r[0]).join(''), y: raw.find((r) => r[0].trim())?.[2] ?? null });

// jesc102.pdf p16: "calcium sulphate hemihydrate (CaSO4·½H2O). This is called Plaster of"
const plaster = [
  line([['On heating gypsum at 373 K, it loses water molecules and becomes', 180.0, 143.0, 354.0, 10.5]]),
  line([['calcium sulphate hemihydrate (', 180.0, 117.4, 157.5, 10.5], [' ', 337.5, 117.4, 30.5, 10.5], ['4', 367.9, 115.7, 3.7, 5.9], [' ', 371.6, 115.7, 26.8, 5.9], ['2', 398.4, 115.7, 3.7, 5.9]]),
  line([['1', 378.5, 125.8, 6.4, 10.4]]),
  line([['CaSO', 338.6, 119.0, 28.9, 10.4], [' ', 367.6, 119.0, 6.4, 10.4], ['.', 373.9, 119.0, 3.3, 10.4], [' ', 377.2, 119.0, 12.5, 10.4], ['H O', 389.7, 119.0, 21.0, 10.4]]),
  line([['2', 378.7, 111.1, 6.4, 10.4], [' ', 385.1, 111.1, 27.7, 10.4], ['). This is called Plaster of', 412.8, 117.4, 121.2, 10.5], ['Reprint 2026-27', 277.3, 32.5, 57.4, 8.0]]),
];

// jesc109.pdf p10: mirror formula 1/v + 1/u = 1/f (9.1)
const mirror = [
  line([['expressed as', 78.0, 539.3, 64.6, 10.5]]),
  line([['1', 102.5, 521.5, 6.2, 10.0], [' ', 108.7, 521.5, 12.7, 10.0], ['1', 121.4, 521.5, 6.2, 10.0], [' ', 127.6, 521.5, 16.4, 10.0], ['1', 144.0, 521.5, 6.2, 10.0]]),
  line([['v', 102.5, 507.4, 5.4, 10.0], [' ', 107.9, 507.4, 13.1, 10.0], ['u', 121.0, 507.4, 6.2, 10.0], [' ', 127.2, 507.4, 18.0, 10.0], ['f', 145.2, 507.4, 3.4, 10.0]]),
  line([['+', 113.3, 515.0, 5.5, 10.0], [' ', 118.8, 515.0, 14.2, 10.0], ['=', 136.5, 515.0, 5.6, 10.0], ['(9.1)', 409.4, 515.0, 22.6, 10.5]]),
  line([['The mirror formula is valid in all situations for all spherical', 96.0, 494.2, 336.0, 10.5]]),
];

// jesc109.pdf p10: Magnification (m) = h′/h = −v/u (9.3)
const magnification = [
  line([['Magnification (', 96.0, 197.8, 75.4, 10.5], ['m', 171.4, 197.8, 9.2, 10.5], [') =', 181.2, 197.8, 14.5, 10.5], [' ', 195.7, 197.8, 16.9, 10.5], ['′ ', 211.2, 205.4, 7.0, 10.0], ['= −', 218.2, 198.7, 14.2, 10.0]]),
  line([['h', 204.0, 205.4, 5.7, 10.0]]),
  line([['h', 203.5, 191.0, 5.7, 10.0]]),
  line([['v', 236.9, 205.2, 5.0, 10.0]]),
  line([['u', 236.2, 191.0, 5.7, 10.0], [' ', 241.9, 191.0, 182.5, 10.0], ['(9.3)', 409.4, 197.8, 22.6, 10.5]]),
  line([['You may note that the height of the object is taken to be positive as', 96.0, 177.4, 336.0, 10.5]]),
];

describe('formula rebuild from glyph positions', () => {
  it('Plaster of Paris: stacked ½ and subscripts read left to right; footer kept at the end', () => {
    const { lines } = rebuildFormulaLines(plaster);
    expect(lines.map((l) => l.text)).toEqual([
      'On heating gypsum at 373 K, it loses water molecules and becomes',
      'calcium sulphate hemihydrate (CaSO4.½H2O). This is called Plaster of' + 'Reprint 2026-27',
    ]);
  });

  it('mirror formula: three fractions and operators', () => {
    const { lines } = rebuildFormulaLines(mirror);
    expect(lines.map((l) => l.text)).toEqual([
      'expressed as',
      '1/v + 1/u = 1/f (9.1)',
      'The mirror formula is valid in all situations for all spherical',
    ]);
  });

  it('magnification: primes stay with their letter', () => {
    const { lines } = rebuildFormulaLines(magnification);
    expect(lines[0].text).toBe('Magnification (m) = h′/h = − v/u (9.3)');
    expect(lines[1].text).toBe('You may note that the height of the object is taken to be positive as');
  });

  it('n21: a fraction of words and a fraction with subscripts (v1 over v2)', () => {
    // jesc109.pdf p15
    const n21 = [
      line([['n', 266.4, 253.7, 6.5, 10.5], ['21', 273.1, 250.1, 7.4, 6.1], ['=', 280.8, 253.7, 6.3, 10.5], ['Speed of light in medium 1', 289.2, 260.4, 131.3, 10.0]]),
      line([['Speed of light in medium 2', 291.1, 246.0, 131.3, 10.0], ['=', 426.5, 253.7, 5.5, 10.0], ['v', 434.9, 260.4, 5.4, 10.0]]),
      line([['v', 434.2, 246.0, 5.4, 10.0]]),
      line([['1', 439.9, 257.8, 4.0, 6.5]]),
      line([['2', 439.9, 243.6, 4.0, 6.5]]),
    ];
    expect(rebuildFormulaLines(n21).lines[0].text).toBe('n21 = (Speed of light in medium 1)/(Speed of light in medium 2) = v1/v2');
  });

  it('big brackets do not turn normal-size glyphs into subscripts', () => {
    // jesc109.pdf p23: 1/u = 1/(–10) – (1/–15) = – 1/10 + 1/15
    const lens = [
      line([['(', 267.1, 330.7, 3.3, 13.1], [')', 289.0, 330.7, 3.3, 13.1]]),
      line([['1', 220.6, 345.4, 6.2, 10], ['1', 243.6, 345.4, 6.2, 10], ['1', 276.2, 345.4, 6.2, 10], ['1', 313.2, 345.4, 6.2, 10], ['1', 335.0, 345.4, 6.2, 10]]),
      line([['–', 258.7, 338.9, 5.0, 10], ['–', 302.2, 338.9, 5.0, 10]]),
      line([['–10', 238.3, 331.2, 17.5, 10], ['–15', 271.2, 331.2, 17.5, 10], ['10', 309.6, 331.2, 12.4, 10], ['15', 331.4, 331.2, 12.4, 10], ['u', 220.1, 331.2, 6.2, 10], ['=', 229.7, 338.9, 5.5, 10], ['=', 294.5, 338.9, 5.5, 10], ['+', 324.5, 338.9, 5.5, 10]]),
    ];
    expect(rebuildFormulaLines(lens).lines[0].text).toBe('1/u = 1/(–10) – 1/(–15) = – 1/10 + 1/15');
  });

  it('a drop-cap letter linking two body lines leaves both lines as they were', () => {
    const dropCap = [
      line([['W', 78, 590, 18, 30], ['e see a variety of objects in the world around us. However, we are', 100, 602.6, 330, 10.5]]),
      line([['unable to see anything in a dark room. On lighting up the room,', 100, 590, 330, 10.5]]),
    ];
    expect(rebuildFormulaLines(dropCap).lines.map((l) => l.text)).toEqual(dropCap.map((l) => l.text));
  });

  it('ion charges and subscripts join their symbol (H+, OH– (aq), SO4 2–, H2O)', () => {
    expect(rebuildFormulaText(items([['NaOH(s)', 100, 300, 40, 10.5], ['→', 150, 300, 10, 10.5], ['Na', 165, 300, 13, 10.5], ['+', 178.2, 304, 3.5, 6], [' (aq) + OH', 182, 300, 46, 10.5], ['–', 228.3, 304, 3.5, 6], [' (aq)', 232, 300, 20, 10.5]])))
      .toBe('NaOH(s) → Na+ (aq) + OH– (aq)');
    // A superscript 2– stacked over a subscript 4 at the same x.
    expect(rebuildFormulaText(items([['SO', 100, 300, 14, 10.5], ['2–', 114.3, 304, 6, 6], ['4', 114.3, 297, 3, 6], [' and Ba', 121, 300, 30, 10.5]]))).toBe('SO42– and Ba');
    // A wide positioning space in "12H O(l)" with the subscript 2 at its end.
    expect(rebuildFormulaText(items([['12H O(l)', 100, 300, 40, 10.5], ['2', 118.5, 297, 3, 6]]))).toBe('12H2O(l)');
    // Real items, jesc103.pdf p15: the subscript 3 is drawn in the glue space of "ZnCO (s)".
    expect(rebuildFormulaText(items([['ZnCO (s)', 97.9, 251.5, 44.0, 10.0], ['3', 126.2, 248.9, 3.6, 5.8]]))).toBe('ZnCO3(s)');
    // Real items, jesc101.pdf p12: "reaction of SO4 2– and Ba2+".
    expect(rebuildFormulaText(items([['reaction of', 180.0, 708.5, 52.5, 10.5], ['2–', 251.3, 712.6, 8.0, 6.9], ['4', 251.5, 705.1, 4.3, 6.9], ['SO', 236.4, 707.8, 15.3, 10.7], ['and Ba', 264.0, 708.5, 35.5, 10.5], ['2+', 299.5, 712.3, 8.4, 7.0]])))
      .toBe('reaction of SO42– and Ba2+');
  });

  it('two rows of a box title next to body text are left alone', () => {
    const box = [
      line([['Do You', 440, 300, 30, 10.5], ['Ethanol is an important industrial solvent.', 78, 300, 200, 10.5]]),
      line([['Know?', 440, 291, 28, 10.5]]),
    ];
    expect(rebuildFormulaLines(box).lines.map((l) => l.text)).toEqual(box.map((l) => l.text));
  });

  it('never links two ordinary body lines, or lines far apart in the stream', () => {
    const body = [
      line([['A long ordinary line of body text that is printed here', 78, 300, 330, 10.5]]),
      line([['and the next ordinary line of body text printed below', 78, 287.4, 330, 10.5]]),
      line([['x', 78, 280, 5, 10.5]]),
    ];
    expect(linkFormulaLines(body)).toEqual([[1, 2]]); // only the short piece next to its line
    const far = [line([['1', 100, 300, 6, 10]]), ...Array.from({ length: 7 }, (_, i) => line([[`line ${i} of text that is long enough here`, 78, 600 - i * 13, 300, 10]])), line([['2', 100, 296, 6, 10]])];
    expect(linkFormulaLines(far)).toEqual([]);
  });

  it('does not invent fractions from a column of numbers', () => {
    // Three table rows 8 units apart: rows 1 and 3 are "stacked", but row 2 sits between them in the same column.
    const table = items([['1', 100, 300, 6, 10], ['1', 140, 300, 6, 10], ['2', 100, 292, 6, 10], ['2', 140, 292, 6, 10], ['3', 100, 284, 6, 10], ['3', 140, 284, 6, 10]]);
    expect(rebuildFormulaText(table)).toBeNull(); // not one row: left in stream order
  });

  it('a line that links with nothing is returned exactly as it was', () => {
    const plain = [line([['Plain text, nothing to fix.', 78, 400, 200, 10.5]])];
    expect(rebuildFormulaLines(plain)).toEqual({ lines: [{ text: 'Plain text, nothing to fix.', y: 400 }], rebuilt: [] });
  });
});
