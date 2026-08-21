import { describe, expect, it } from 'vitest';
import { allowedRoofTypes, normalizedRoofType, validateModel } from '../src/model/model';

describe('model validation', () => {
  it('accepts the supported boundary sizes', () => {
    expect(validateModel({ cellsWide: 1, cellsHigh: 1 })).toMatchObject({
      cellsWide: 1,
      cellsHigh: 1,
    });
    expect(validateModel({ cellsWide: 20, cellsHigh: 10 })).toMatchObject({
      cellsWide: 20,
      cellsHigh: 10,
    });
  });

  it('rejects values outside the supported range', () => {
    expect(() => validateModel({ cellsWide: 0, cellsHigh: 3 })).toThrow('Cells wide');
    expect(() => validateModel({ cellsWide: 5, cellsHigh: 11 })).toThrow('Cells high');
    expect(() => validateModel({ cellsWide: 2.5, cellsHigh: 3 })).toThrow('whole number');
  });

  it('validates the multi-pair layout and service-frame gap', () => {
    expect(
      validateModel({ cellsWide: 5, cellsHigh: 3, layout: 'double', serviceGap: 3 }),
    ).toMatchObject({ layout: 'double', serviceGap: 3 });
    expect(() =>
      validateModel({ cellsWide: 5, cellsHigh: 3, layout: 'double', serviceGap: 4 }),
    ).toThrow('Service-frame gap');
  });

  it('offers roof types appropriate to the layout', () => {
    expect(allowedRoofTypes({ layout: 'single', serviceGap: 0 })).toEqual([
      'none',
      'flat',
      'gable',
    ]);
    expect(allowedRoofTypes({ layout: 'double', serviceGap: 0 })).toEqual([
      'none',
      'flat',
      'gable',
    ]);
    expect(allowedRoofTypes({ layout: 'double', serviceGap: 1 })).toEqual(['none', 'space-frame']);
    expect(allowedRoofTypes({ layout: 'quadrangle', serviceGap: 0 })).toEqual([
      'none',
      'space-frame',
    ]);
    expect(normalizedRoofType({ layout: 'double', serviceGap: 1, roof: 'gable' })).toBe('none');
  });
});
