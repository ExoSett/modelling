import { describe, expect, it } from 'vitest';
import {
  FORMAT_VERSION,
  MODEL_NAMESPACE,
  SKETCH_NAMESPACE,
  type CameraState,
} from '../src/model/model';
import { createSketchXml, parseSketchXml } from '../src/model/xml';

const camera: CameraState = {
  position: { x: 14, y: -20, z: 12 },
  target: { x: 0, y: 0, z: 5 },
};

describe('Sketch XML', () => {
  it('round-trips dimensions and camera state', () => {
    const xml = createSketchXml({ cellsWide: 8, cellsHigh: 4 }, camera);
    const parsed = parseSketchXml(xml);

    expect(parsed).toEqual({ cellsWide: 8, cellsHigh: 4, camera });
    expect(xml).toContain(`xmlns="${MODEL_NAMESPACE}"`);
    expect(xml).toContain(`xmlns:sketch="${SKETCH_NAMESPACE}"`);
    expect(xml).toContain(`formatVersion="${FORMAT_VERSION}"`);
    expect(xml).toContain('name="ISO 668 1CCC 20-foot high-cube envelope"');
    expect(xml).toContain('\n  <metadata>\n');
  });

  it('rejects unsupported model shapes', () => {
    const xml = createSketchXml({ cellsWide: 5, cellsHigh: 3 }, camera);
    expect(() => parseSketchXml(xml.replace('depthCells="1"', 'depthCells="2"'))).toThrow(
      'depth of one cell',
    );
    expect(() => parseSketchXml(xml.replace('widthCells="5"', 'widthCells="21"'))).toThrow(
      'Cells wide',
    );
    expect(() =>
      parseSketchXml(xml.replace('formatVersion="0.1.0"', 'formatVersion="2.0.0"')),
    ).toThrow('format version');
  });
});
