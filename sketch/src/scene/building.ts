import * as THREE from 'three';
import { DIMENSIONS_METRES, type SketchModel } from '../model/model';
import { buildFramePair, disposeFramePair } from './frame-pair';
import { buildRoof, type RoofFootprint } from './roofs';

export interface PairPlacement {
  x: number;
  y: number;
  rotation: number;
  includeService: boolean;
}

export function pairPlacements(model: SketchModel): PairPlacement[] {
  const layout = model.layout ?? 'single';
  const serviceGap = model.serviceGap ?? 0;
  const pairDepth =
    DIMENSIONS_METRES.accommodationCell.depth +
    DIMENSIONS_METRES.interFrameGap +
    DIMENSIONS_METRES.serviceCell.depth;

  if (layout === 'single') {
    return [{ x: 0, y: 0, rotation: 0, includeService: true }];
  }

  if (layout === 'double') {
    const separation =
      serviceGap === 0
        ? pairDepth - DIMENSIONS_METRES.serviceCell.depth
        : pairDepth + serviceGap * DIMENSIONS_METRES.accommodationCell.depth;
    return [
      { x: 0, y: -separation / 2, rotation: 0, includeService: true },
      {
        x: 0,
        y: separation / 2,
        rotation: 180,
        includeService: serviceGap !== 0,
      },
    ];
  }

  const width = model.cellsWide * DIMENSIONS_METRES.accommodationCell.width;
  const offset = width / 2 + pairDepth / 2;
  return [
    { x: 0, y: -offset, rotation: 0, includeService: true },
    { x: offset, y: 0, rotation: 90, includeService: true },
    { x: 0, y: offset, rotation: 180, includeService: true },
    { x: -offset, y: 0, rotation: 270, includeService: true },
  ];
}

export function buildingFootprint(model: SketchModel): RoofFootprint {
  const width = model.cellsWide * DIMENSIONS_METRES.accommodationCell.width;
  const depth =
    DIMENSIONS_METRES.accommodationCell.depth +
    DIMENSIONS_METRES.interFrameGap +
    DIMENSIONS_METRES.serviceCell.depth;
  const bounds = new THREE.Box2();
  for (const placement of pairPlacements(model)) {
    const angle = THREE.MathUtils.degToRad(placement.rotation);
    for (const x of [-width / 2, width / 2]) {
      for (const y of [-depth / 2, depth / 2]) {
        bounds.expandByPoint(
          new THREE.Vector2(
            placement.x + x * Math.cos(angle) - y * Math.sin(angle),
            placement.y + x * Math.sin(angle) + y * Math.cos(angle),
          ),
        );
      }
    }
  }
  const size = bounds.getSize(new THREE.Vector2());
  const centre = bounds.getCenter(new THREE.Vector2());
  return { width: size.x, depth: size.y, centreX: centre.x, centreY: centre.y };
}

export function buildBuilding(model: SketchModel): THREE.Group {
  const building = new THREE.Group();
  building.name = 'building';
  for (const [index, placement] of pairPlacements(model).entries()) {
    const instance = new THREE.Group();
    instance.name = `frame-pair-${index + 1}`;
    const pair = buildFramePair(model, placement.includeService);
    instance.position.set(placement.x, placement.y, 0);
    instance.rotation.z = THREE.MathUtils.degToRad(placement.rotation);
    instance.add(pair);
    building.add(instance);
  }
  building.add(buildRoof(model, buildingFootprint(model)));
  return building;
}

export function disposeBuilding(group: THREE.Group): void {
  disposeFramePair(group);
}
