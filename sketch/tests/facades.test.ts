import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DIMENSIONS_METRES, FACADE_STYLES } from '../src/model/model';
import { buildFacades } from '../src/scene/facades';

describe('facade glazing', () => {
  for (const style of FACADE_STYLES) {
    it(`${style.id} exposes translucent glass from both sides of an empty cell`, () => {
      const facade = buildFacades({ cellsWide: 1, cellsHigh: 1, facade: { styleId: style.id } })!;
      facade.updateMatrixWorld(true);
      const { width, height } = DIMENSIONS_METRES.accommodationCell;
      // Away from the central mullion, window bars and balcony guard.
      const x = width / 2 + width * 0.052;
      const z = height * 0.61;
      for (const side of [-1, 1]) {
        const ray = new THREE.Raycaster(
          new THREE.Vector3(x, side * 2, z),
          new THREE.Vector3(0, -side, 0),
        );
        const hits = ray.intersectObject(facade).filter((hit) => hit.object instanceof THREE.Mesh);
        expect(hits.length).toBeGreaterThan(0);
        for (const hit of hits) {
          const material = (hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
          expect(material.transparent).toBe(true);
          expect(material.opacity).toBe(0.8);
          expect(material.color.getHex()).toBe(0x78bdb0);
          expect(hit.object.castShadow).toBe(false);
        }
      }
    });
  }
});
