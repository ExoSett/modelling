import * as THREE from 'three';
import { DIMENSIONS_METRES } from '../model/model';

const cell = DIMENSIONS_METRES.accommodationCell;
const envelope = DIMENSIONS_METRES.module1CCC;
const NODE_HALF = 0.095;
const SHOE_THICKNESS = 0.06;
export const MODULE_BASE = NODE_HALF + SHOE_THICKNESS;
export const MODULE_TRAVEL = envelope.depth + 0.5;

// Keep the full reference envelope. Shoes connect the existing node centres to
// the exact lower envelope corners (180 mm inward, 70 mm outward in depth).
export const MODULE_CORNERS = [0, 1].flatMap((x) =>
  [0, 1].map((y) => ({
    node: new THREE.Vector3(x * cell.width, y * cell.depth, NODE_HALF),
    corner: new THREE.Vector3(
      (cell.width - envelope.width) / 2 + x * envelope.width,
      (cell.depth - envelope.depth) / 2 + y * envelope.depth,
      MODULE_BASE,
    ),
  })),
);
const shellMaterial = new THREE.MeshStandardMaterial({ color: 0xd8cfb9, roughness: 0.8 });
const cornerMaterial = new THREE.MeshStandardMaterial({ color: 0x565b5d, roughness: 0.6 });

export function buildExampleModule(): { group: THREE.Group; module: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'example-module';
  const module = new THREE.Group();
  module.name = 'module-envelope';
  const shell = new THREE.Mesh(
    // Recess the shell slightly so the corner blocks have no coplanar faces.
    new THREE.BoxGeometry(envelope.width - 0.004, envelope.depth - 0.004, envelope.height - 0.004),
    shellMaterial,
  );
  shell.position.set(cell.width / 2, cell.depth / 2, MODULE_BASE + envelope.height / 2);
  shell.castShadow = true;
  shell.receiveShadow = true;
  module.add(shell);
  for (const { node, corner } of MODULE_CORNERS) {
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(Math.abs(corner.x - node.x) + 0.12, 0.19, SHOE_THICKNESS),
      cornerMaterial,
    );
    shoe.position.set((node.x + corner.x) / 2, node.y, NODE_HALF + SHOE_THICKNESS / 2);
    group.add(shoe);
    // Abstract corner blocks sit inside the envelope; no detailed ISO fittings.
    for (const z of [MODULE_BASE, MODULE_BASE + envelope.height - 0.14]) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), cornerMaterial);
      block.position.set(
        corner.x + (corner.x < cell.width / 2 ? 0.07 : -0.07),
        corner.y + (corner.y < cell.depth / 2 ? 0.07 : -0.07),
        z + 0.07,
      );
      module.add(block);
    }
  }
  group.add(module);
  return { group, module };
}
