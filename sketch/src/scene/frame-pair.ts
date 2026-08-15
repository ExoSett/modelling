import * as THREE from 'three';
import { DIMENSIONS_METRES, type SketchModel } from '../model/model';

const FRAME_PROFILE = 0.12;
const NODE_SIZE = 0.19;

const accommodationMaterial = new THREE.MeshStandardMaterial({
  color: 0xe87233,
  roughness: 0.55,
  metalness: 0.18,
});

const serviceMaterial = new THREE.MeshStandardMaterial({
  color: 0x4b7f87,
  roughness: 0.62,
  metalness: 0.12,
});

const nodeMaterial = new THREE.MeshStandardMaterial({
  color: 0x26363a,
  roughness: 0.5,
  metalness: 0.25,
});

function member(
  width: number,
  depth: number,
  height: number,
  x: number,
  y: number,
  z: number,
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, depth, height), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function node(x: number, y: number, z: number): THREE.Mesh {
  return member(NODE_SIZE, NODE_SIZE, NODE_SIZE, x, y, z, nodeMaterial);
}

function buildFrame(
  cellsWide: number,
  cellsHigh: number,
  cellWidth: number,
  cellDepth: number,
  cellHeight: number,
  yStart: number,
  material: THREE.Material,
  includeNodes: boolean,
): THREE.Group {
  const frame = new THREE.Group();
  const width = cellsWide * cellWidth;
  const height = cellsHigh * cellHeight;
  const yEnd = yStart + cellDepth;

  for (let xIndex = 0; xIndex <= cellsWide; xIndex += 1) {
    const x = xIndex * cellWidth;
    for (const y of [yStart, yEnd]) {
      frame.add(member(FRAME_PROFILE, FRAME_PROFILE, height, x, y, height / 2, material));
    }

    for (let zIndex = 0; zIndex <= cellsHigh; zIndex += 1) {
      const z = zIndex * cellHeight;
      frame.add(
        member(FRAME_PROFILE, cellDepth, FRAME_PROFILE, x, yStart + cellDepth / 2, z, material),
      );
      if (includeNodes) {
        frame.add(node(x, yStart, z), node(x, yEnd, z));
      }
    }
  }

  for (let zIndex = 0; zIndex <= cellsHigh; zIndex += 1) {
    const z = zIndex * cellHeight;
    for (const y of [yStart, yEnd]) {
      frame.add(member(width, FRAME_PROFILE, FRAME_PROFILE, width / 2, y, z, material));
    }
  }

  return frame;
}

export function buildFramePair(model: SketchModel): THREE.Group {
  const pair = new THREE.Group();
  pair.name = 'frame-pair';

  const accommodation = DIMENSIONS_METRES.accommodationCell;
  const service = DIMENSIONS_METRES.serviceCell;
  const serviceStart = accommodation.depth + DIMENSIONS_METRES.interFrameGap;

  const accommodationFrame = buildFrame(
    model.cellsWide,
    model.cellsHigh,
    accommodation.width,
    accommodation.depth,
    accommodation.height,
    0,
    accommodationMaterial,
    true,
  );
  accommodationFrame.name = 'accommodation-frame';

  const serviceFrame = buildFrame(
    model.cellsWide,
    model.cellsHigh,
    service.width,
    service.depth,
    service.height,
    serviceStart,
    serviceMaterial,
    false,
  );
  serviceFrame.name = 'service-frame';

  pair.add(accommodationFrame, serviceFrame);
  pair.position.x = -(model.cellsWide * accommodation.width) / 2;
  pair.position.y = -(accommodation.depth + DIMENSIONS_METRES.interFrameGap + service.depth) / 2;
  return pair;
}

export function disposeFramePair(group: THREE.Group): void {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose();
  });
}
