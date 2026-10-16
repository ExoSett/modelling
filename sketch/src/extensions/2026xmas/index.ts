import * as THREE from 'three';
import { DIMENSIONS_METRES, type SketchModel } from '../../model/model';
import { buildingFootprint } from '../../scene/building';
import type { SketchExtension, SketchPresentation } from '..';

function createPresentation(model: SketchModel): SketchPresentation {
  const group = new THREE.Group();
  group.name = '2026xmas';
  const snow = new THREE.MeshStandardMaterial({ color: 0xc4d1df, roughness: 0.95 });
  const red = new THREE.MeshStandardMaterial({ color: 0x9d1727, roughness: 0.45 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc69b48, metalness: 0.65, roughness: 0.3 });
  const seat = new THREE.MeshStandardMaterial({ color: 0x39252a, roughness: 0.9 });
  const print = new THREE.MeshStandardMaterial({ color: 0x9daebc, roughness: 1 });
  function box(
    parent: THREE.Group,
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const footprint = buildingFootprint(model);
  const width = footprint.width + 0.7;
  const depth = footprint.depth + 0.7;
  const rise = Math.min(depth * 0.22, 3.2);
  const angle = Math.atan2(rise, depth / 2);
  const baseZ = model.cellsHigh * DIMENSIONS_METRES.accommodationCell.height + 0.12;
  for (const side of [-1, 1]) {
    const slope = box(
      group,
      [width + 0.08, Math.hypot(depth / 2, rise) + 0.06, 0.19],
      [footprint.centreX, footprint.centreY + (side * depth) / 4, baseZ + rise / 2 + 0.19],
      snow,
    );
    slope.rotation.x = side === -1 ? angle : -angle;
  }
  box(
    group,
    [width + 0.12, 0.25, 0.16],
    [footprint.centreX, footprint.centreY, baseZ + rise + 0.23],
    snow,
  );
  // Cover the grid while leaving the ordinary ground and grid untouched underneath.
  const ground = box(group, [1000, 1000, 0.08], [0, 0, -0.045], snow);
  ground.castShadow = false;

  const front = footprint.centreY - footprint.depth / 2;
  const sleigh = new THREE.Group();
  sleigh.name = 'sleigh';
  sleigh.position.set(2.4, front - 4.4, 0);
  sleigh.rotation.z = -0.22;
  group.add(sleigh);
  box(sleigh, [2.7, 1.35, 0.18], [0, 0, 0.6], red);
  for (const y of [-0.67, 0.67]) {
    box(sleigh, [2.7, 0.12, 0.6], [0, y, 0.91], red);
    box(sleigh, [2.75, 0.15, 0.045], [0, y, 1.23], gold);
    const runner = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.55, y, 0.16),
      new THREE.Vector3(-0.8, y, 0.12),
      new THREE.Vector3(1.25, y, 0.12),
      new THREE.Vector3(1.75, y, 0.32),
      new THREE.Vector3(1.85, y, 0.68),
      new THREE.Vector3(1.65, y, 0.82),
    ]);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(runner, 28, 0.055, 8, false), gold);
    rail.castShadow = true;
    sleigh.add(rail);
    for (const x of [-0.9, 0.9]) box(sleigh, [0.08, 0.08, 0.4], [x, y, 0.36], gold);
  }
  box(sleigh, [0.14, 1.35, 1.05], [-1.3, 0, 1.05], red);
  box(sleigh, [0.8, 1.15, 0.2], [-0.65, 0, 0.83], seat);
  box(sleigh, [0.9, 1.35, 0.09], [-0.85, 0, 1.61], snow);

  // Alternating shallow boot impressions curve towards the open service-frame end.
  const start = new THREE.Vector2(3.9, front - 4.1);
  const end = new THREE.Vector2(footprint.width / 2 + 0.28, -0.2);
  for (let i = 0; i < 23; i++) {
    const t = i / 22;
    const centre = start.clone().lerp(end, t);
    centre.x += Math.sin(t * Math.PI) * 0.65;
    const direction = end.clone().sub(start).normalize();
    const side = i % 2 ? 1 : -1;
    centre.add(new THREE.Vector2(-direction.y, direction.x).multiplyScalar(side * 0.14));
    const boot = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.16, 3, 8), print);
    boot.scale.z = 0.05;
    boot.rotation.z = -Math.atan2(direction.x, direction.y);
    boot.position.set(centre.x, centre.y, 0.001);
    group.add(boot);
  }
  // Ground is deliberately excluded from camera fitting.
  const bounds = new THREE.Box3().setFromObject(sleigh);
  return {
    group,
    bounds,
    dispose() {
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      for (const material of [snow, red, gold, seat, print]) material.dispose();
    },
  };
}

export function createExtension(): SketchExtension {
  const model: SketchModel = {
    layout: 'double',
    cellsHigh: 3,
    cellsWide: 5,
    depth: 0,
    roof: 'gable',
    facade: { styleId: 'brick-window' },
  };
  return {
    model,
    greeting: 'Season’s greetings from ExoSett',
    createPresentation: () => createPresentation(model),
  };
}
