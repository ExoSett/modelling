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

    expect(parsed).toEqual({
      cellsWide: 8,
      cellsHigh: 4,
      layout: 'single',
      serviceGap: 0,
      roof: 'none',
      camera,
    });
    expect(xml).toContain(`xmlns="${MODEL_NAMESPACE}"`);
    expect(xml).toContain(`xmlns:sketch="${SKETCH_NAMESPACE}"`);
    expect(xml).toContain(`formatVersion="${FORMAT_VERSION}"`);
    expect(xml).toContain('name="ISO 668 1CCC 20-foot high-cube envelope"');
    expect(xml).toContain('\n  <metadata>\n');
  });

  it('round-trips the global Sketch facade choice', () => {
    const model = {
      cellsWide: 4,
      cellsHigh: 2,
      facade: { styleId: 'stone-bars' as const },
    };
    const xml = createSketchXml(model, camera);

    expect(parseSketchXml(xml)).toEqual({
      ...model,
      layout: 'single',
      serviceGap: 0,
      roof: 'none',
      camera,
    });
    expect(xml).toContain('<sketch:facade styleRef="stone-bars"/>');
  });

  it('round-trips facing and quadrangle building layouts', () => {
    const facing = { cellsWide: 6, cellsHigh: 3, layout: 'double' as const, serviceGap: 2 };
    const facingXml = createSketchXml(facing, camera);
    expect(parseSketchXml(facingXml)).toEqual({ ...facing, roof: 'none', camera });
    expect(facingXml.match(/<framePair /g)).toHaveLength(2);
    expect(facingXml).toContain('<sketch:layout type="double" serviceGap="2"/>');
    expect(facingXml).toContain('<sketch:roof type="none"/>');

    const quadrangle = {
      cellsWide: 6,
      cellsHigh: 3,
      layout: 'quadrangle' as const,
      serviceGap: 0,
    };
    const quadrangleXml = createSketchXml(quadrangle, camera);
    expect(parseSketchXml(quadrangleXml)).toEqual({ ...quadrangle, roof: 'none', camera });
    expect(quadrangleXml.match(/<framePair /g)).toHaveLength(4);
    expect(quadrangleXml).toContain('rotation="270"');
  });

  it('round-trips a gable roof and rejects a roof invalid for its layout', () => {
    const xml = createSketchXml(
      { cellsWide: 5, cellsHigh: 3, layout: 'double', serviceGap: 0, roof: 'gable' },
      camera,
    );
    expect(parseSketchXml(xml).roof).toBe('gable');
    expect(xml).toContain('<sketch:roof type="gable"/>');

    expect(() => parseSketchXml(xml.replace('serviceGap="0"', 'serviceGap="1"'))).toThrow(
      'not valid for this layout',
    );
  });

  it('rejects an unsupported Sketch facade style', () => {
    const xml = createSketchXml(
      { cellsWide: 4, cellsHigh: 2, facade: { styleId: 'brick-window' } },
      camera,
    ).replace('styleRef="brick-window"', 'styleRef="unknown"');

    expect(() => parseSketchXml(xml)).toThrow('facade style');
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
