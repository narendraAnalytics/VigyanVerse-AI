import { create, all, type Unit, type MathType } from 'mathjs';

// Deterministic numeric + unit verification (Module 7). LLMs explain; this checks.
//
// Expressions come from students and from model output, so mathjs is locked down as its
// security guide recommends (mathjs.org/docs/expressions/security.html): functions that
// change mathjs itself (import, createUnit, reviver) or parse nested code are disabled, and
// we keep a private reference to evaluate.
const math = create(all, {});
const evaluate = math.evaluate;
const parse = math.parse;
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

const MAX_EXPRESSION = 200;
const OPERATORS = new Set(['+', '-', '*', '/', '^']);
const FUNCTIONS = new Set(['sqrt']);

/**
 * Allowlist (security review 2026-11-14): disabling functions stops code injection, but
 * expressions like zeros(10000, 10000) or factorial(1e6) could still use up the 30 s Edge
 * Function. Only numbers, the given symbols, units, pi, + - * / ^, brackets and sqrt pass.
 */
export function assertSafeExpression(text: string, symbols: Iterable<string> = []): void {
  if (text.length > MAX_EXPRESSION) throw new Error('Expression too long');
  const allowed = new Set([...symbols, 'pi']);
  parse(text).traverse((node, path, parent) => {
    const n = node as unknown as { type: string; value?: unknown; name?: string; op?: string; fn?: { name?: string } };
    switch (n.type) {
      case 'ConstantNode':
        if (typeof n.value !== 'number') throw new Error('Only numbers are allowed');
        return;
      case 'ParenthesisNode':
        return;
      case 'OperatorNode':
        if (!OPERATORS.has(n.op ?? '')) throw new Error(`Operator ${n.op} is not allowed`);
        return;
      case 'FunctionNode':
        if (!FUNCTIONS.has(n.fn?.name ?? '')) throw new Error(`Function ${n.fn?.name} is not allowed`);
        return;
      case 'SymbolNode': {
        const name = n.name ?? '';
        const isFunctionName = (parent as unknown as { type?: string } | null)?.type === 'FunctionNode' && path === 'fn';
        if (isFunctionName || allowed.has(name) || math.Unit.isValuelessUnit(name)) return;
        throw new Error(`Unknown symbol ${name}`);
      }
      default:
        throw new Error(`${n.type} is not allowed`);
    }
  });
}

/** Evaluate a checked quantity or expression. */
function safeEvaluate(text: string, scope: Record<string, MathType> = {}): MathType {
  assertSafeExpression(text, Object.keys(scope));
  return evaluate(text, scope);
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
    parsedScope[key] = typeof val === 'number' ? val : safeEvaluate(normalizeUnits(val));
  }
  return safeEvaluate(normalizeUnits(expr), parsedScope);
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
  if (unit && unit.length <= 40 && isUnit(result)) result = result.to(normalizeUnits(unit));
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
    s = safeEvaluate(normalizeUnits(student));
    e = safeEvaluate(normalizeUnits(expected));
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
