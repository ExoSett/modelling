import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DIMENSIONS_METRES } from '../src/model/model';
import { buildExampleModule, MODULE_BASE, MODULE_CORNERS } from '../src/scene/example-module';
import { disposeBuilding } from '../src/scene/building';

describe('illustrative module supports', () => {
  it('preserves the 1CCC envelope and supports each lower corner on a node shoe', () => {
    const { group, module } = buildExampleModule();
    const bounds = new THREE.Box3().setFromObject(module);
    const size = bounds.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(DIMENSIONS_METRES.module1CCC.width);
    expect(size.y).toBeCloseTo(DIMENSIONS_METRES.module1CCC.depth);
    expect(size.z).toBeCloseTo(DIMENSIONS_METRES.module1CCC.height);
    expect(bounds.min.z).toBeCloseTo(MODULE_BASE);
    for (const [i, { corner, node }] of MODULE_CORNERS.entries()) {
      expect(Math.abs(corner.x - node.x)).toBeCloseTo(0.18);
      expect(Math.abs(corner.y - node.y)).toBeCloseTo(0.07);
      const shoe = new THREE.Box3().setFromObject(group.children[i]!);
      expect(shoe.max.z).toBeCloseTo(corner.z);
      expect(corner.x).toBeGreaterThanOrEqual(shoe.min.x);
      expect(corner.x).toBeLessThanOrEqual(shoe.max.x);
      expect(corner.y).toBeGreaterThanOrEqual(shoe.min.y);
      expect(corner.y).toBeLessThanOrEqual(shoe.max.y);
    }
    disposeBuilding(group);
  });
});
