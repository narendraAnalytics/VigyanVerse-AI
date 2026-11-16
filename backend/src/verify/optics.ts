// Deterministic image formation for spherical mirrors and thin lenses (NCERT Class 10, Ch. 9).
// Code owns the calculation; the app draws the ray diagram from these numbers.
//
// New Cartesian sign convention (NCERT Fig. 9.9): the object is on the LEFT of the mirror /
// lens, distances to the left are negative, heights above the axis positive.
//   mirror: 1/v + 1/u = 1/f, m = -v/u   concave f < 0, convex f > 0
//   lens:   1/v - 1/u = 1/f, m =  v/u   convex  f > 0, concave f < 0
// Inputs are plain magnitudes in cm (what a student's question gives); signs are applied here.

export type OpticalElement = 'mirror' | 'lens';
export type OpticalType = 'concave' | 'convex';

/** Where the object is, in the textbook's words (used when the question gives no distance). */
export type ObjectPosition =
  | 'infinity' // very far away: parallel rays
  | 'beyond_2f' // beyond C (mirror) / beyond 2F1 (lens)
  | 'at_2f' // at C / at 2F1
  | 'between_f_2f' // between F and C / between F1 and 2F1
  | 'at_f' // at F / at F1
  | 'inside_f' // between P and F / between F1 and O
  | 'finite'; // anywhere in front (convex mirror, concave lens: the image is always alike)

export interface OpticsInput {
  element: OpticalElement;
  type: OpticalType;
  /** Focal length magnitude in cm (> 0). */
  focalLength: number;
  /** Object distance magnitude in cm (> 0), or Infinity. */
  objectDistance: number;
}

export interface OpticsResult extends OpticsInput {
  /** Signed focal length and distances (NCERT convention), cm. v is ±Infinity for an object at F. */
  f: number;
  u: number;
  v: number;
  /** Magnification (signed); null when the object or the image is at infinity. */
  m: number | null;
  nature: 'real' | 'virtual';
  orientation: 'inverted' | 'erect';
  size: 'point-sized' | 'highly magnified' | 'magnified' | 'same size' | 'diminished';
  position: ObjectPosition;
}

const round = (x: number) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : x);
const EPS = 1e-9;

/** The textbook position name of an object at distance u (magnitude) for focal length f (magnitude). */
export function positionOf(input: OpticsInput): ObjectPosition {
  const { focalLength: f, objectDistance: u } = input;
  if (!Number.isFinite(u)) return 'infinity';
  const converging = (input.element === 'mirror') === (input.type === 'concave');
  if (!converging) return 'finite';
  if (Math.abs(u - 2 * f) < EPS * f) return 'at_2f';
  if (Math.abs(u - f) < EPS * f) return 'at_f';
  if (u > 2 * f) return 'beyond_2f';
  if (u > f) return 'between_f_2f';
  return 'inside_f';
}

export function solveOptics(input: OpticsInput): OpticsResult {
  const { element, type, focalLength, objectDistance } = input;
  if (!(focalLength > 0) || !(objectDistance > 0)) throw new Error('focal length and object distance must be positive');
  const f = element === 'mirror' ? (type === 'concave' ? -focalLength : focalLength) : type === 'convex' ? focalLength : -focalLength;
  const u = -objectDistance;
  const position = positionOf(input);

  let v: number;
  if (!Number.isFinite(u)) {
    v = f; // parallel rays meet at (or appear to come from) the focus
  } else if (Math.abs(u - (element === 'mirror' ? f : -f)) < EPS * Math.abs(f)) {
    v = element === 'mirror' ? -Infinity : Infinity; // object at F: the image is at infinity
  } else {
    // mirror: v = uf / (u - f); lens: v = uf / (u + f)
    v = element === 'mirror' ? (u * f) / (u - f) : (u * f) / (u + f);
  }

  const m = !Number.isFinite(u) || !Number.isFinite(v) ? null : element === 'mirror' ? -v / u : v / u;
  // Real images: in front of a mirror (v < 0); behind a lens (v > 0).
  const nature: OpticsResult['nature'] = element === 'mirror' ? (v < 0 ? 'real' : 'virtual') : v > 0 ? 'real' : 'virtual';
  const orientation: OpticsResult['orientation'] = nature === 'real' ? 'inverted' : 'erect';
  let size: OpticsResult['size'];
  if (position === 'infinity') size = 'point-sized';
  else if (position === 'at_f') size = 'highly magnified';
  else {
    const am = Math.abs(m ?? 0);
    size = Math.abs(am - 1) < 1e-6 ? 'same size' : am > 1 ? 'magnified' : 'diminished';
  }
  return { element, type, focalLength, objectDistance, f: round(f), u: round(u), v: round(v), m: m === null ? null : round(m), nature, orientation, size, position };
}

/**
 * A representative object distance for a textbook position (for questions with no numbers):
 * multiples of f that sit clearly inside each range, so the drawing reads well.
 */
export function distanceFor(position: ObjectPosition, focalLength: number): number {
  switch (position) {
    case 'infinity': return Infinity;
    case 'beyond_2f': return 3 * focalLength;
    case 'at_2f': return 2 * focalLength;
    case 'between_f_2f': return 1.5 * focalLength;
    case 'at_f': return focalLength;
    case 'inside_f': return 0.5 * focalLength;
    case 'finite': return 1.6 * focalLength; // not on F or 2F, so no labels collide
  }
}
