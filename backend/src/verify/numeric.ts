import { create, all, type Unit, type MathType } from 'mathjs';

// Deterministic numeric + unit verification (Module 7). LLMs explain; this checks.
//
// Expressions come from students and from model output, so mathjs is locked down as its
// security guide recommends (mathjs.org/docs/expressions/security.html): functions that
// change mathjs itself (import, createUnit, reviver) or parse nested code are disabled, and
// we keep a private reference to evaluate.
const math = create(all, {});
const evaluate = math.evaluate;
const disabled = (name: string) => () => {
  throw new Error(`Function ${name} is disabled`);
};
math.import(
  Object.fromEntries(['import', 'createUnit', 'reviver', 'evaluate', 'parse', 'simplify', 'derivative', 'resolve', 'compile']
    .map((name) => [name, disabled(name)])),
  { override: true },
);

function isUnit(value: MathType): value is Unit {
  return math.typeOf(value) === 'Unit';
}

/** Textbook spellings mathjs does not know: Ω -> ohm, "10 min" (minutes; "min" is a function). */
export function normalizeUnits(text: string): string {
  return text
    .replace(/\s*[×x*]\s*10\s*\^\s*\(?\s*([−–-]?\d+)\s*\)?/g, 'e$1') // 1.84 × 10^-6 -> 1.84e-6
    .replace(/Ω/g, ' ohm')
    .replace(/(\d)\s*min\b/g, '$1 minute')
    .replace(/×/g, '*')
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Evaluate an expression such as "V / R" with scope, or "2 A * 5 ohm". */
export function evaluateExpression(expr: string, scope: Record<string, number | string> = {}): MathType {
  const parsedScope: Record<string, MathType> = {};
  for (const [key, val] of Object.entries(scope)) {
    parsedScope[key] = typeof val === 'number' ? val : evaluate(normalizeUnits(val));
  }
  return evaluate(normalizeUnits(expr), parsedScope);
}

/** "3.8181 A" -> "3.82 A", "15000 J", "1.84e-6 ohm m": 3 significant figures, as in NCERT answers. */
export function formatQuantity(value: MathType): string {
  return math.format(value, { notation: 'auto', precision: 3, lowerExp: -4, upperExp: 6 });
}

export interface Computed {
  /** mathjs syntax, for comparing ("3.82 A") */
  value: string;
  /** For the student ("3.82 A", "15 Ω") */
  display: string;
}

/**
 * Compute `expression` with the given quantities (e.g. { V: "12 V", R: "4 Ω" }) and convert
 * to `unit` when one is given ("A", "kWh", "cm"). Throws when it cannot be computed.
 */
export function computeAnswer(expression: string, given: Record<string, string>, unit?: string): Computed {
  let result = evaluateExpression(expression, given);
  if (unit && isUnit(result)) result = result.to(normalizeUnits(unit));
  if (typeof result !== 'number' && !isUnit(result)) throw new Error('The expression did not give a number');
  const n = isUnit(result) ? result.toNumber() : result;
  if (!Number.isFinite(n)) throw new Error('The expression did not give a finite number');
  const value = formatQuantity(result);
  return { value, display: value.replace(/\bohm\b/g, 'Ω') };
}

export interface NumericComparison {
  match: boolean;
  reason: 'match' | 'value_mismatch' | 'unit_mismatch' | 'missing_unit' | 'parse_error';
  studentValue?: number;
  expectedValue?: number;
  unit?: string;
  relativeError?: number;
}

/**
 * Compare a student's answer ("2000 mA") with the expected one ("2 A").
 * Units are converted to the expected unit before comparing within relTol.
 */
export function compareNumericAnswer(student: string, expected: string, relTol = 0.02): NumericComparison {
  let s: MathType;
  let e: MathType;
  try {
    s = evaluate(normalizeUnits(student));
    e = evaluate(normalizeUnits(expected));
  } catch {
    return { match: false, reason: 'parse_error' };
  }

  let studentValue: number;
  let expectedValue: number;
  let unit: string | undefined;

  if (isUnit(e)) {
    if (!isUnit(s)) return { match: false, reason: 'missing_unit' };
    if (!s.equalBase(e)) return { match: false, reason: 'unit_mismatch' };
    unit = e.formatUnits();
    expectedValue = e.toNumber(unit);
    studentValue = s.toNumber(unit);
  } else {
    if (isUnit(s)) return { match: false, reason: 'unit_mismatch' };
    studentValue = Number(s);
    expectedValue = Number(e);
  }

  if (!Number.isFinite(studentValue) || !Number.isFinite(expectedValue)) {
    return { match: false, reason: 'parse_error' };
  }

  const relativeError =
    expectedValue === 0 ? Math.abs(studentValue) : Math.abs(studentValue - expectedValue) / Math.abs(expectedValue);
  const match = relativeError <= relTol;
  return { match, reason: match ? 'match' : 'value_mismatch', studentValue, expectedValue, unit, relativeError };
}
