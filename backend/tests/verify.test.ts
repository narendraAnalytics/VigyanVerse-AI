import { describe, expect, it } from 'vitest';
import { balanceEquation, checkBalanced, parseFormula } from '../src/verify/chemistry.ts';
import { compareNumericAnswer, computeAnswer, evaluateExpression } from '../src/verify/numeric.ts';

describe('chemistry', () => {
  it('parses nested groups and hydrates', () => {
    expect(Object.fromEntries(parseFormula('Ca(OH)2'))).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(Object.fromEntries(parseFormula('Fe2(SO4)3'))).toEqual({ Fe: 2, S: 3, O: 12 });
    expect(Object.fromEntries(parseFormula('CuSO4.5H2O'))).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
  });

  it.each([
    ['H2 + O2 -> H2O', [2, 1, 2]],
    ['Fe + H2O -> Fe3O4 + H2', [3, 4, 1, 4]],
    ['Ca(OH)2 + CO2 -> CaCO3 + H2O', [1, 1, 1, 1]],
    ['CH4 + O2 → CO2 + H2O', [1, 2, 1, 2]],
    ['CuSO4.5H2O -> CuSO4 + H2O', [1, 1, 5]],
    ['Pb(NO3)2 -> PbO + NO2 + O2', [2, 2, 4, 1]],
    ['Al + CuCl2 → AlCl3 + Cu', [2, 3, 2, 3]],
  ])('balances %s', (equation, expected) => {
    expect(balanceEquation(equation).coefficients).toEqual(expected);
  });

  it('checks a written equation, ignoring state symbols', () => {
    expect(checkBalanced('2H2(g) + O2(g) -> 2H2O(l)').balanced).toBe(true);
    expect(checkBalanced('H2 + O2 -> H2O')).toEqual({ balanced: false, imbalance: { O: 1 } });
  });

  it('rejects impossible equations', () => {
    expect(() => balanceEquation('H2 -> O2')).toThrow();
  });
});

describe('numeric', () => {
  it('evaluates formulas with units', () => {
    const current = evaluateExpression('V / R', { V: '12 V', R: '4 ohm' });
    expect(compareNumericAnswer(current.toString(), '3 A').match).toBe(true);
  });

  it('converts units before comparing', () => {
    expect(compareNumericAnswer('2000 mA', '2 A').match).toBe(true);
    expect(compareNumericAnswer('0.5 m', '50 cm').match).toBe(true);
  });

  it('computes textbook answers with units, signs and 3 significant figures', () => {
    expect(computeAnswer('V / R', { V: '12 V', R: '4 Ω' }, 'A')).toEqual({ value: '3 A', display: '3 A' });
    expect(computeAnswer('P / V', { P: '840 W', V: '220 V' }, 'A').value).toBe('3.82 A');
    expect(computeAnswer('1 / (1/f - 1/u)', { f: '-15 cm', u: '-25 cm' }, 'cm').value).toBe('-37.5 cm');
    expect(computeAnswer('R * pi * (d/2)^2 / l', { R: '26 Ω', d: '0.3 mm', l: '1 m' }, 'ohm m')).toEqual({ value: '1.84e-6 ohm m', display: '1.84e-6 Ω m' });
    expect(computeAnswer('I * t', { I: '0.5 A', t: '10 min' }, 'C').value).toBe('300 C');
    expect(computeAnswer('P * t', { P: '2 kW', t: '5 h' }, 'kWh').value).toBe('10 kWh');
    expect(computeAnswer('I^2 * R * t', { I: '5 A', R: '20 Ω', t: '30 s' }, 'J').value).toBe('15000 J');
  });

  it('refuses expressions that try to change mathjs', () => {
    expect(() => computeAnswer('import({x: 1})', {})).toThrow();
    expect(() => computeAnswer('createUnit("foo")', {})).toThrow();
    expect(() => computeAnswer('evaluate("1+1")', {})).toThrow();
    expect(() => computeAnswer('V / R', { V: '12 V', R: '0 ohm' }, 'A')).toThrow(); // not finite
  });

  it('classifies wrong answers', () => {
    expect(compareNumericAnswer('3 A', '2 A').reason).toBe('value_mismatch');
    expect(compareNumericAnswer('2 V', '2 A').reason).toBe('unit_mismatch');
    expect(compareNumericAnswer('2', '2 A').reason).toBe('missing_unit');
    expect(compareNumericAnswer('two amps', '2 A').reason).toBe('parse_error');
  });
});
