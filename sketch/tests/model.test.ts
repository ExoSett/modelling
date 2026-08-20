import { describe, expect, it } from 'vitest';
import { validateModel } from '../src/model/model';

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
});
