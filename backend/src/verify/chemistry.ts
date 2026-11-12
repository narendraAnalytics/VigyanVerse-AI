// Deterministic chemical equation parsing, balancing and balance checking.
// Scope: neutral molecular equations at Class 10 level (hydrates supported,
// ionic charges are not).

type Counts = Map<string, number>;

const STATE_SYMBOLS = /\((?:s|l|g|aq)\)|[↑↓]/g;
const ARROW = /\s*(?:->|→|⟶|=)\s*/;

function addCounts(target: Counts, source: Counts, factor: number): void {
  for (const [el, n] of source) target.set(el, (target.get(el) ?? 0) + n * factor);
}

/** Parse a formula like "Ca(OH)2", "Fe2(SO4)3" or "CuSO4.5H2O" into element counts. */
export function parseFormula(formula: string): Counts {
  const clean = formula.replace(STATE_SYMBOLS, '').replace(/\s+/g, '');
  const total: Counts = new Map();
  for (const part of clean.split(/[.·*]/)) {
    const m = /^(\d*)(.+)$/.exec(part);
    if (!m) throw new Error(`Invalid formula: ${formula}`);
    addCounts(total, parseGroup(m[2]), m[1] ? Number(m[1]) : 1);
  }
  return total;
}

function parseGroup(src: string): Counts {
  const stack: Counts[] = [new Map()];
  let i = 0;
  const readNumber = (): number => {
    const m = /^\d+/.exec(src.slice(i));
    if (!m) return 1;
    i += m[0].length;
    return Number(m[0]);
  };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '(' || ch === '[') {
      stack.push(new Map());
      i++;
    } else if (ch === ')' || ch === ']') {
      i++;
      const group = stack.pop();
      if (!group || stack.length === 0) throw new Error(`Unbalanced brackets in ${src}`);
      addCounts(stack[stack.length - 1], group, readNumber());
    } else {
      const m = /^[A-Z][a-z]?/.exec(src.slice(i));
      if (!m) throw new Error(`Unexpected "${ch}" in ${src}`);
      i += m[0].length;
      const top = stack[stack.length - 1];
      top.set(m[0], (top.get(m[0]) ?? 0) + readNumber());
    }
  }
  if (stack.length !== 1) throw new Error(`Unbalanced brackets in ${src}`);
  return stack[0];
}

interface Species {
  coefficient: number | null;
  formula: string;
}

function parseSide(side: string): Species[] {
  return side.split(/\s+\+\s+/).map((raw) => {
    const m = /^\s*(\d+)\s*(\S.*)$/.exec(raw);
    // "2H2O" -> coefficient 2; "H2O" -> none. A leading digit followed directly by
    // a capital letter is a coefficient, since formulas never start with a digit.
    return m ? { coefficient: Number(m[1]), formula: m[2].trim() } : { coefficient: null, formula: raw.trim() };
  });
}

export function parseEquation(equation: string): { reactants: Species[]; products: Species[] } {
  const sides = equation.split(ARROW);
  if (sides.length !== 2) throw new Error('Equation must contain exactly one arrow (->, →, =)');
  return { reactants: parseSide(sides[0]), products: parseSide(sides[1]) };
}

export interface BalanceCheck {
  balanced: boolean;
  /** element -> reactant count minus product count, only for unequal elements */
  imbalance: Record<string, number>;
}

/** Check whether an equation as written (with coefficients) conserves every element. */
export function checkBalanced(equation: string): BalanceCheck {
  const { reactants, products } = parseEquation(equation);
  const net: Counts = new Map();
  for (const s of reactants) addCounts(net, parseFormula(s.formula), s.coefficient ?? 1);
  for (const s of products) addCounts(net, parseFormula(s.formula), -(s.coefficient ?? 1));
  const imbalance: Record<string, number> = {};
  for (const [el, n] of net) if (n !== 0) imbalance[el] = n;
  return { balanced: Object.keys(imbalance).length === 0, imbalance };
}

// --- exact rational arithmetic for the nullspace solve ---
type Frac = [number, number];
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number): number => Math.abs(a * b) / gcd(a, b);
function norm([n, d]: Frac): Frac {
  if (n === 0) return [0, 1];
  const g = gcd(n, d) * Math.sign(d);
  return [n / g, d / g];
}
const sub = (a: Frac, b: Frac): Frac => norm([a[0] * b[1] - b[0] * a[1], a[1] * b[1]]);
const mul = (a: Frac, b: Frac): Frac => norm([a[0] * b[0], a[1] * b[1]]);
const div = (a: Frac, b: Frac): Frac => norm([a[0] * b[1], a[1] * b[0]]);

export interface BalanceResult {
  coefficients: number[];
  balancedEquation: string;
}

/** Find the smallest positive integer coefficients. Ignores coefficients already written. */
export function balanceEquation(equation: string): BalanceResult {
  const { reactants, products } = parseEquation(equation);
  const species = [...reactants, ...products];
  const counts = species.map((s) => parseFormula(s.formula));
  const elements = [...new Set(counts.flatMap((c) => [...c.keys()]))];
  const n = species.length;

  // Rows = elements, cols = species; products enter with a negative sign.
  const m: Frac[][] = elements.map((el) =>
    counts.map((c, j) => [(c.get(el) ?? 0) * (j < reactants.length ? 1 : -1), 1] as Frac),
  );

  // Reduced row echelon form.
  const pivotCols: number[] = [];
  let row = 0;
  for (let col = 0; col < n && row < m.length; col++) {
    const p = m.findIndex((r, idx) => idx >= row && r[col][0] !== 0);
    if (p === -1) continue;
    [m[row], m[p]] = [m[p], m[row]];
    const pivot = m[row][col];
    m[row] = m[row].map((v) => div(v, pivot));
    for (let r = 0; r < m.length; r++) {
      if (r !== row && m[r][col][0] !== 0) {
        const factor = m[r][col];
        m[r] = m[r].map((v, c) => sub(v, mul(factor, m[row][c])));
      }
    }
    pivotCols.push(col);
    row++;
  }

  const freeCols = [...Array(n).keys()].filter((c) => !pivotCols.includes(c));
  if (freeCols.length !== 1) {
    throw new Error(
      freeCols.length === 0
        ? 'Equation cannot be balanced (check the formulas)'
        : 'Equation has more than one independent balancing; it combines separate reactions',
    );
  }

  const free = freeCols[0];
  const solution: Frac[] = Array.from({ length: n }, () => [0, 1] as Frac);
  solution[free] = [1, 1];
  pivotCols.forEach((col, r) => {
    solution[col] = norm([-m[r][free][0], m[r][free][1]]);
  });

  const denom = solution.reduce((acc, [, d]) => lcm(acc, d), 1);
  let ints = solution.map(([num, d]) => (num * denom) / d);
  if (ints.every((v) => v <= 0)) ints = ints.map((v) => -v);
  if (ints.some((v) => v <= 0)) throw new Error('Equation cannot be balanced with positive coefficients');
  const g = ints.reduce((acc, v) => gcd(acc, v));
  const coefficients = ints.map((v) => v / g);

  const fmt = (list: Species[], offset: number) =>
    list.map((s, i) => `${coefficients[offset + i] === 1 ? '' : coefficients[offset + i]}${s.formula}`).join(' + ');
  return {
    coefficients,
    balancedEquation: `${fmt(reactants, 0)} → ${fmt(products, reactants.length)}`,
  };
}
