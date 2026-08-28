import { describe, expect, it } from 'vitest';
import { allowedRoofTypes, normalizedRoofType, validateModel } from '../src/model/model';
import { pairPlacements } from '../src/scene/building';

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

  it('validates depth for each multi-pair layout', () => {
    expect(validateModel({ cellsWide: 5, cellsHigh: 3, layout: 'double', depth: 5 })).toMatchObject(
      { layout: 'double', depth: 5 },
    );
    expect(() => validateModel({ cellsWide: 5, cellsHigh: 3, layout: 'double', depth: 6 })).toThrow(
      'Depth',
    );
    expect(
      validateModel({ cellsWide: 5, cellsHigh: 3, layout: 'quadrangle', depth: 20 }),
    ).toMatchObject({ depth: 20 });
    expect(() =>
      validateModel({ cellsWide: 5, cellsHigh: 3, layout: 'quadrangle', depth: 0 }),
    ).toThrow('Depth');
    expect(() => validateModel({ cellsWide: 5, cellsHigh: 3, layout: 'single', depth: 1 })).toThrow(
      'Depth',
    );
  });

  it('offers roof types appropriate to the layout', () => {
    expect(allowedRoofTypes({ layout: 'single', depth: 0 })).toEqual([
      'none',
      'flat',
      'gable',
      'space-frame',
    ]);
    expect(allowedRoofTypes({ layout: 'double', depth: 0 })).toEqual([
      'none',
      'flat',
      'gable',
      'space-frame',
    ]);
    expect(allowedRoofTypes({ layout: 'double', depth: 1 })).toEqual(['none', 'space-frame']);
    expect(allowedRoofTypes({ layout: 'quadrangle', depth: 1 })).toEqual(['none', 'space-frame']);
    expect(normalizedRoofType({ layout: 'double', depth: 1, roof: 'gable' })).toBe('none');
  });
});

describe('building placement', () => {
  it('uses width for front pairs and depth for side pairs', () => {
    const placements = pairPlacements({
      cellsWide: 8,
      cellsHigh: 3,
      layout: 'quadrangle',
      depth: 4,
    });
    expect(placements.map((placement) => placement.cellsWide)).toEqual([8, 4, 8, 4]);
    expect(Math.abs(placements[1]!.x)).toBeGreaterThan(Math.abs(placements[0]!.y));
  });
});
