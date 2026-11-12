import { create, all, type Unit, type MathType } from 'mathjs';

// Deterministic numeric + unit verification (Module 7). LLMs explain; this checks.
const math = create(all, {});

function isUnit(value: MathType): value is Unit {
  return math.typeOf(value) === 'Unit';
}

/** Evaluate an expression such as "V / R" with scope, or "2 A * 5 ohm". */
export function evaluateExpression(expr: string, scope: Record<string, number | string> = {}): MathType {
  const parsedScope: Record<string, MathType> = {};
  for (const [key, val] of Object.entries(scope)) {
    parsedScope[key] = typeof val === 'number' ? val : math.evaluate(val);
  }
  return math.evaluate(expr, parsedScope);
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
    s = math.evaluate(student.trim());
    e = math.evaluate(expected.trim());
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
