import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL } from '../src/model/model';
import { modelFromUrl, urlForModel } from '../src/model/url';

describe('Sketch URLs', () => {
  it('parses a complete valid model', () => {
    const url = new URL(
      'https://www.exosett.com/design/sketch/?layout=4&h=3&w=8&d=6&roof=space-frame&accommodation_facade=brick-window',
    );
    expect(modelFromUrl(url)).toEqual({
      layout: 'quadrangle',
      cellsHigh: 3,
      cellsWide: 8,
      depth: 6,
      roof: 'space-frame',
      facade: { styleId: 'brick-window' },
    });
  });

  it('returns the complete default for any invalid query', () => {
    for (const query of [
      '?layout=4&h=3&w=8&d=21&roof=none&accommodation_facade=none',
      '?layout=2&h=3&w=8&d=1&roof=gable&accommodation_facade=none',
      '?layout=3&h=3&w=8&d=1&roof=none&accommodation_facade=none',
      '?layout=1&h=3&w=5&d=0&roof=none',
      '?layout=1&h=3&w=5&d=1&roof=none&accommodation_facade=none',
      '?layout=1&h=3&w=5&d=0&roof=none&accommodation_facade=none&extra=1',
    ]) {
      expect(modelFromUrl(new URL(`https://example.com/${query}`))).toEqual(DEFAULT_MODEL);
    }
  });

  it('creates a canonical complete URL', () => {
    const url = urlForModel(new URL('https://example.com/sketch/?old=yes#view'), {
      cellsHigh: 2,
      cellsWide: 9,
      layout: 'double',
      depth: 5,
      roof: 'space-frame',
    });
    expect(url.href).toBe(
      'https://example.com/sketch/?layout=2&h=2&w=9&d=5&roof=space-frame&accommodation_facade=none',
    );
  });
});
