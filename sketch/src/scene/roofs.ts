import * as THREE from 'three';
import { DIMENSIONS_METRES, normalizedRoofType, type SketchModel } from '../model/model';

export interface RoofFootprint {
  width: number;
  depth: number;
  centreX: number;
  centreY: number;
}

const OVERHANG = 0.35;
const COVER_THICKNESS = 0.12;

const metalMaterial = new THREE.MeshStandardMaterial({
  color: 0x899395,
  roughness: 0.48,
  metalness: 0.55,
  side: THREE.DoubleSide,
});
const metalRidgeMaterial = new THREE.MeshStandardMaterial({
  color: 0x667174,
  roughness: 0.45,
  metalness: 0.6,
});
const tileMaterial = new THREE.MeshStandardMaterial({
  color: 0xa94f32,
  roughness: 0.88,
  metalness: 0,
  side: THREE.DoubleSide,
});
const tileLineMaterial = new THREE.MeshStandardMaterial({ color: 0x713422, roughness: 0.9 });
const latticeMaterial = new THREE.MeshStandardMaterial({
  color: 0x343a3b,
  roughness: 0.5,
  metalness: 0.5,
});

function box(width: number, depth: number, height: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, depth, height), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function memberBetween(start: THREE.Vector3, end: THREE.Vector3, radius = 0.045): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 6),
    latticeMaterial,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  return mesh;
}

function buildFlatRoof(width: number, depth: number, baseZ: number): THREE.Group {
  const roof = new THREE.Group();
  const cover = box(width, depth, COVER_THICKNESS, metalMaterial);
  cover.position.z = baseZ + COVER_THICKNESS / 2;
  roof.add(cover);

  const corrugationSpacing = 0.28;
  const count = Math.floor(width / corrugationSpacing);
  for (let index = 0; index <= count; index += 1) {
    const ridge = box(0.035, depth, 0.035, metalRidgeMaterial);
    ridge.position.set(-width / 2 + (index * width) / Math.max(count, 1), 0, baseZ + 0.135);
    roof.add(ridge);
  }
  return roof;
}

function buildGableRoof(width: number, depth: number, baseZ: number): THREE.Group {
  const roof = new THREE.Group();
  const rise = Math.min(depth * 0.22, 3.2);
  const halfDepth = depth / 2;
  const slopeLength = Math.hypot(halfDepth, rise);
  const angle = Math.atan2(rise, halfDepth);

  for (const side of [-1, 1]) {
    const plane = box(width, slopeLength, COVER_THICKNESS, tileMaterial);
    plane.position.set(0, (side * depth) / 4, baseZ + rise / 2);
    plane.rotation.x = side === -1 ? angle : -angle;
    roof.add(plane);

    const rows = Math.max(2, Math.floor(slopeLength / 0.38));
    for (let row = 0; row <= rows; row += 1) {
      const line = box(width, 0.025, 0.025, tileLineMaterial);
      const localY = -slopeLength / 2 + (row * slopeLength) / rows;
      line.position.set(0, plane.position.y, plane.position.z);
      line.rotation.x = plane.rotation.x;
      line.position.y += localY * Math.cos(plane.rotation.x);
      line.position.z += localY * Math.sin(plane.rotation.x) + 0.075;
      roof.add(line);
    }
  }
  const ridge = box(width + 0.08, 0.16, 0.16, tileMaterial);
  ridge.position.z = baseZ + rise + 0.06;
  roof.add(ridge);
  return roof;
}

function buildSpaceFrameRoof(width: number, depth: number, baseZ: number): THREE.Group {
  const roof = new THREE.Group();
  const latticeBottom = baseZ + 0.12;
  const latticeTop = baseZ + 0.72;
  const baysX = Math.max(2, Math.ceil(width / 2.8));
  const baysY = Math.max(2, Math.ceil(depth / 2.8));

  for (let xIndex = 0; xIndex <= baysX; xIndex += 1) {
    const x = -width / 2 + (xIndex * width) / baysX;
    roof.add(
      memberBetween(
        new THREE.Vector3(x, -depth / 2, latticeBottom),
        new THREE.Vector3(x, depth / 2, latticeBottom),
      ),
    );
  }
  for (let yIndex = 0; yIndex <= baysY; yIndex += 1) {
    const y = -depth / 2 + (yIndex * depth) / baysY;
    roof.add(
      memberBetween(
        new THREE.Vector3(-width / 2, y, latticeBottom),
        new THREE.Vector3(width / 2, y, latticeBottom),
      ),
    );
  }

  for (let xIndex = 0; xIndex < baysX; xIndex += 1) {
    for (let yIndex = 0; yIndex < baysY; yIndex += 1) {
      const x0 = -width / 2 + (xIndex * width) / baysX;
      const x1 = -width / 2 + ((xIndex + 1) * width) / baysX;
      const y0 = -depth / 2 + (yIndex * depth) / baysY;
      const y1 = -depth / 2 + ((yIndex + 1) * depth) / baysY;
      const top = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, latticeTop);
      roof.add(
        memberBetween(new THREE.Vector3(x0, y0, latticeBottom), top),
        memberBetween(new THREE.Vector3(x1, y0, latticeBottom), top),
        memberBetween(new THREE.Vector3(x0, y1, latticeBottom), top),
        memberBetween(new THREE.Vector3(x1, y1, latticeBottom), top),
      );
    }
  }

  const cover = box(width, depth, COVER_THICKNESS, metalMaterial);
  cover.position.z = latticeTop + COVER_THICKNESS / 2;
  roof.add(cover);
  return roof;
}

export function buildRoof(model: SketchModel, footprint: RoofFootprint): THREE.Group {
  const width = footprint.width + OVERHANG * 2;
  const depth = footprint.depth + OVERHANG * 2;
  const baseZ = model.cellsHigh * DIMENSIONS_METRES.accommodationCell.height + 0.12;
  const type = normalizedRoofType(model);
  if (type === 'none') {
    const roof = new THREE.Group();
    roof.name = 'roof-none';
    return roof;
  }
  const roof =
    type === 'flat'
      ? buildFlatRoof(width, depth, baseZ)
      : type === 'gable'
        ? buildGableRoof(width, depth, baseZ)
        : buildSpaceFrameRoof(width, depth, baseZ);
  roof.name = `roof-${type}`;
  roof.position.set(footprint.centreX, footprint.centreY, 0);
  return roof;
}
