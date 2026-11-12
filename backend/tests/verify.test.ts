import { describe, expect, it } from 'vitest';
import { balanceEquation, checkBalanced, parseFormula } from '../src/verify/chemistry.ts';
import { compareNumericAnswer, evaluateExpression } from '../src/verify/numeric.ts';

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

  it('classifies wrong answers', () => {
    expect(compareNumericAnswer('3 A', '2 A').reason).toBe('value_mismatch');
    expect(compareNumericAnswer('2 V', '2 A').reason).toBe('unit_mismatch');
    expect(compareNumericAnswer('2', '2 A').reason).toBe('missing_unit');
    expect(compareNumericAnswer('two amps', '2 A').reason).toBe('parse_error');
  });
});
