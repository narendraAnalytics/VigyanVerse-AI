import { describe, expect, it } from 'vitest';
import { solveOptics } from '../src/verify/optics.ts';
import { buildDiagram, findFigure, parseRayQuestion, rayDiagram, wantsDiagram } from '../src/agents/diagram.ts';
import type { ChunkHit } from '../src/shared/retrieval.ts';

describe('solveOptics (NCERT sign convention)', () => {
  it('concave mirror, object at C: image at C, real, inverted, same size', () => {
    const r = solveOptics({ element: 'mirror', type: 'concave', focalLength: 15, objectDistance: 30 });
    expect(r).toMatchObject({ f: -15, u: -30, v: -30, m: -1, nature: 'real', orientation: 'inverted', size: 'same size', position: 'at_2f' });
  });

  it('NCERT Example 9.2: concave mirror f 15 cm, object 25 cm -> v -37.5 cm, m -1.5', () => {
    const r = solveOptics({ element: 'mirror', type: 'concave', focalLength: 15, objectDistance: 25 });
    expect(r).toMatchObject({ v: -37.5, m: -1.5, nature: 'real', size: 'magnified', position: 'between_f_2f' });
  });

  it('NCERT Example 9.1: convex mirror R 3 m, bus 5 m away -> v 1.15 m, virtual, erect, diminished', () => {
    const r = solveOptics({ element: 'mirror', type: 'convex', focalLength: 150, objectDistance: 500 });
    expect(r.v).toBeCloseTo(115.385, 2);
    expect(r.m).toBeCloseTo(0.231, 2);
    expect(r).toMatchObject({ nature: 'virtual', orientation: 'erect', size: 'diminished', position: 'finite' });
  });

  it('concave mirror, object inside F: virtual, erect, magnified behind the mirror', () => {
    expect(solveOptics({ element: 'mirror', type: 'concave', focalLength: 15, objectDistance: 10 }))
      .toMatchObject({ v: 30, m: 3, nature: 'virtual', orientation: 'erect', size: 'magnified', position: 'inside_f' });
  });

  it('NCERT Example 9.5: convex lens f 10 cm, object 15 cm -> v 30 cm, m -2', () => {
    expect(solveOptics({ element: 'lens', type: 'convex', focalLength: 10, objectDistance: 15 }))
      .toMatchObject({ f: 10, v: 30, m: -2, nature: 'real', orientation: 'inverted', size: 'magnified' });
  });

  it('concave lens: virtual, erect, diminished on the object side', () => {
    const r = solveOptics({ element: 'lens', type: 'concave', focalLength: 10, objectDistance: 20 });
    expect(r.v).toBeCloseTo(-6.667, 2);
    expect(r).toMatchObject({ nature: 'virtual', orientation: 'erect', size: 'diminished' });
  });

  it('object at F: image at infinity, highly magnified', () => {
    expect(solveOptics({ element: 'lens', type: 'convex', focalLength: 10, objectDistance: 10 })).toMatchObject({ v: Infinity, m: null, size: 'highly magnified', position: 'at_f' });
    expect(solveOptics({ element: 'mirror', type: 'concave', focalLength: 10, objectDistance: 10 })).toMatchObject({ v: -Infinity, nature: 'real' });
  });

  it('object at infinity: point-sized image at F', () => {
    expect(solveOptics({ element: 'mirror', type: 'concave', focalLength: 15, objectDistance: Infinity })).toMatchObject({ v: -15, m: null, nature: 'real', size: 'point-sized' });
    expect(solveOptics({ element: 'lens', type: 'concave', focalLength: 15, objectDistance: Infinity })).toMatchObject({ v: -15, nature: 'virtual' });
  });

  it('rejects non-positive inputs', () => {
    expect(() => solveOptics({ element: 'lens', type: 'convex', focalLength: 0, objectDistance: 10 })).toThrow();
  });
});

describe('wantsDiagram', () => {
  it.each([
    ['Draw a ray diagram to show the formation of the image.', true],
    ['Explain with a labelled diagram the structure of a neuron.', true],
    ['Sketch the magnetic field lines', true],
    ['What is the focal length of a concave mirror?', false],
    ['The image is drawn closer', false],
  ])('%s -> %s', (q, want) => expect(wantsDiagram(q)).toBe(want));
});

describe('parseRayQuestion', () => {
  it('the uploaded board question (numbers)', () => {
    const q = 'Solve this question step by step.\n\nThe question from my photo:\nCBSE Class 10 – Physics\nA concave mirror has a focal length of 15 cm. An object\nis placed at a distance of 30 cm from the mirror.\n(c) Draw a ray diagram to show the formation of the image.';
    expect(parseRayQuestion(q)).toEqual({ element: 'mirror', type: 'concave', focalLength: 15, objectDistance: 30 });
  });

  it('NCERT Example 9.5 wording (distance of the object from the lens is ...)', () => {
    const q = 'A 2.0 cm tall object is placed perpendicular to the principal axis of a convex lens of focal length 10 cm. The distance of the object from the lens is 15 cm.';
    expect(parseRayQuestion(q)).toEqual({ element: 'lens', type: 'convex', focalLength: 10, objectDistance: 15 });
  });

  it('object height is not taken as its distance; "in front of" form', () => {
    expect(parseRayQuestion('A 4 cm tall object is placed 20 cm in front of a concave mirror of focal length 15 cm. Draw the ray diagram.'))
      .toMatchObject({ focalLength: 15, objectDistance: 20 });
  });

  it('radius of curvature gives f = R/2; metres become cm', () => {
    expect(parseRayQuestion('A convex mirror has a radius of curvature of 3 m. A bus is 5 m away. u = 5 m')).toMatchObject({ type: 'convex', focalLength: 150, objectDistance: 500 });
  });

  it('converging / diverging names', () => {
    expect(parseRayQuestion('a converging lens')).toMatchObject({ element: 'lens', type: 'convex' });
    expect(parseRayQuestion('a diverging mirror')).toMatchObject({ element: 'mirror', type: 'convex' });
  });

  it.each([
    ['Draw a ray diagram for an object placed between F and C of a concave mirror.', 'between_f_2f'],
    ['Draw the ray diagram when the object is beyond C of a concave mirror', 'beyond_2f'],
    ['Draw a ray diagram for a convex lens when the object is at 2F1', 'at_2f'],
    ['object at the centre of curvature of a concave mirror', 'at_2f'],
    ['Draw ray diagram: object at the focus of a convex lens', 'at_f'],
    ['object between the pole and focus of a concave mirror', 'inside_f'],
    ['object between F1 and 2F1 of a convex lens', 'between_f_2f'],
    ['object between optical centre and F1 of a convex lens', 'inside_f'],
    ['a concave mirror and an object at infinity', 'infinity'],
  ])('%s -> %s', (q, position) => expect(parseRayQuestion(q)?.position).toBe(position));

  it('is null for other diagrams', () => {
    expect(parseRayQuestion('Draw a labelled diagram of the human heart')).toBeNull();
  });
});

describe('rayDiagram', () => {
  it('numbers -> exact diagram', () => {
    expect(rayDiagram({ element: 'mirror', type: 'concave', focalLength: 15, objectDistance: 30 })).toMatchObject({ kind: 'ray', v: -30, assumed: false });
  });
  it('a position without numbers -> representative drawing, marked assumed', () => {
    expect(rayDiagram({ element: 'mirror', type: 'concave', position: 'between_f_2f' })).toMatchObject({ kind: 'ray', focalLength: 10, objectDistance: 15, v: -30, assumed: true });
  });
  it('convex mirror / concave lens need no position', () => {
    expect(rayDiagram({ element: 'mirror', type: 'convex' })).toMatchObject({ kind: 'ray', nature: 'virtual', assumed: true });
  });
  it('a concave mirror with no position -> ask', () => {
    expect(rayDiagram({ element: 'mirror', type: 'concave' })).toEqual({ kind: 'ask', element: 'mirror', type: 'concave' });
  });
  it('absurd numbers -> ask', () => {
    expect(rayDiagram({ element: 'lens', type: 'convex', focalLength: 5000, objectDistance: 10 })).toMatchObject({ kind: 'ask' });
  });
});

const hit = (content: string, page = 92, chapter = 5): ChunkHit => ({
  chunk_id: `c${page}`, chapter_id: 'ch', chapter_number: chapter, chapter_title_en: 'Life Processes', subject_code: 'biology',
  page_start: page, page_end: page, section_path: null, content, rank: 1,
});

describe('findFigure', () => {
  const hits = [
    hit('Fig. 5.10). Because both oxygen and carbon dioxide have to be transported by the blood', 91),
    hit('Figure 5.10 Schematic sectional view of the human heart Figure 5.11 Schematic representation of transport and exchange of oxygen', 92),
    hit('Figure 5.14 Structure of a nephron', 97),
  ];
  it('finds the figure whose caption matches', () => {
    expect(findFigure('Draw a labelled diagram of the human heart', hits))
      .toEqual({ kind: 'figure', figure: '5.10', caption: 'Schematic sectional view of the human heart', chapterNumber: 5, chapterTitle: 'Life Processes', pageStart: 92, pageEnd: 92 });
    expect(findFigure('Draw the structure of a nephron', hits)).toMatchObject({ figure: '5.14', pageStart: 97 });
  });
  it('real NCERT chunk text: captions cut where the page prose starts', () => {
    expect(findFigure('Draw a neat diagram of the human alimentary canal', [hit('Figure 5.6 Human alimentary canal have often heard adults complaining', 85)])?.caption).toBe('Human alimentary canal');
    expect(findFigure('Draw the structure of a stomata', [hit('Figure 5.3 (a) Open and (b) closed stomatal pore Activity 5.2 Based on', 83)])?.caption).toBe('Open and (b) closed stomatal pore');
    expect(findFigure('Draw a labelled diagram of a neuron', [hit('Figure 6.1 (a) Structure of neuron, (b) Neuromuscular junction (a) (b)', 101)])?.caption).toBe('Structure of neuron');
    expect(findFigure('Draw the experimental set-up for electrolysis of water', [
      hit('Figure 5.4 Experimental set-up (a) with potassium hydroxide (b) without potassium hydroxide', 83),
      hit('Figure 1.6 Electrolysis of water 2Pb(NO3)2(s)Heat', 9, 1),
    ])).toMatchObject({ figure: '1.6', caption: 'Electrolysis of water' });
  });
  it('"Figure 11.1 shows ..." is a reference in the text, not a caption', () => {
    expect(findFigure('Draw an electric circuit', [hit('Figure 11.1 shows the schematic diagram of a typical electric circuit', 172, 11)])).toBeNull();
  });
  it('never guesses: no matching caption -> null', () => {
    expect(findFigure('Draw a diagram of the human eye', hits)).toBeNull();
  });
});

describe('buildDiagram', () => {
  it('only when a drawing is asked for', () => {
    expect(buildDiagram({ message: 'A concave mirror has a focal length of 15 cm. Object at 30 cm. Find v.', hits: [] })).toBeNull();
  });
  it('a follow-up uses the previous question', () => {
    expect(buildDiagram({ message: 'Now draw its ray diagram', previous: 'A convex lens of focal length 10 cm, object placed at 15 cm', hits: [] }))
      .toMatchObject({ kind: 'ray', element: 'lens', v: 30 });
  });
  it('other diagrams point to the textbook figure', () => {
    expect(buildDiagram({ message: 'Draw a labelled diagram of a nephron', hits: [hit('Figure 5.14 Structure of a nephron', 97)] }))
      .toMatchObject({ kind: 'figure', figure: '5.14' });
  });
});
