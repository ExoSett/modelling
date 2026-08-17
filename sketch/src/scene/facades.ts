import * as THREE from 'three';
import {
  DIMENSIONS_METRES,
  FACADE_STYLES,
  type FacadeStyleId,
  type SketchModel,
} from '../model/model';

const PANEL_DEPTH = 0.1;
const FRONT_Y = -PANEL_DEPTH / 2 - 0.1;

const surfaces = {
  brick: new THREE.MeshStandardMaterial({ color: 0x9a513d, roughness: 0.92 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xaaa69b, roughness: 0.96 }),
  timber: new THREE.MeshStandardMaterial({ color: 0x9a6d3e, roughness: 0.86 }),
} as const;

const windowMaterial = new THREE.MeshStandardMaterial({
  color: 0x263b43,
  roughness: 0.28,
  metalness: 0.15,
});
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x151717, roughness: 0.6 });
const balconyMaterial = new THREE.MeshStandardMaterial({ color: 0x363b39, roughness: 0.65 });

function box(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addWindow(group: THREE.Group, width: number, height: number, barred: boolean): void {
  const windowWidth = width * 0.52;
  const windowHeight = height * 0.5;
  const centreZ = height * 0.57;
  box(
    group,
    [windowWidth, 0.035, windowHeight],
    [width / 2, FRONT_Y - 0.07, centreZ],
    windowMaterial,
  );

  const frameWidth = 0.055;
  for (const x of [width / 2 - windowWidth / 2, width / 2 + windowWidth / 2]) {
    box(group, [frameWidth, 0.045, windowHeight], [x, FRONT_Y - 0.1, centreZ], darkMaterial);
  }
  for (const z of [centreZ - windowHeight / 2, centreZ + windowHeight / 2]) {
    box(group, [windowWidth, 0.045, frameWidth], [width / 2, FRONT_Y - 0.1, z], darkMaterial);
  }

  if (barred) {
    for (const offset of [-0.3, -0.15, 0, 0.15, 0.3]) {
      box(
        group,
        [0.025, 0.025, windowHeight * 0.92],
        [width / 2 + offset * windowWidth, FRONT_Y - 0.135, centreZ],
        darkMaterial,
      );
    }
    for (const offset of [-0.25, 0.25]) {
      box(
        group,
        [windowWidth * 0.92, 0.025, 0.025],
        [width / 2, FRONT_Y - 0.135, centreZ + offset * windowHeight],
        darkMaterial,
      );
    }
  }
}

function addTimberJoints(group: THREE.Group, width: number, height: number): void {
  for (let x = width / 8; x < width; x += width / 8) {
    box(group, [0.018, 0.018, height * 0.94], [x, FRONT_Y - 0.065, height / 2], darkMaterial);
  }
}

function addBalcony(group: THREE.Group, width: number, height: number): void {
  const balconyWidth = width * 0.78;
  const floorZ = height * 0.32;
  const projection = 0.75;
  box(
    group,
    [balconyWidth, projection, 0.09],
    [width / 2, FRONT_Y - projection / 2, floorZ],
    balconyMaterial,
  );
  const railZ = floorZ + 0.55;
  box(group, [balconyWidth, 0.035, 0.04], [width / 2, FRONT_Y - projection, railZ], darkMaterial);
  for (let offset = -0.45; offset <= 0.45; offset += 0.15) {
    box(
      group,
      [0.025, 0.025, 0.55],
      [width / 2 + offset * balconyWidth, FRONT_Y - projection, floorZ + 0.275],
      darkMaterial,
    );
  }
}

function buildCellFacade(styleId: FacadeStyleId): THREE.Group {
  const cell = DIMENSIONS_METRES.accommodationCell;
  const style = FACADE_STYLES.find((candidate) => candidate.id === styleId);
  if (!style) throw new Error(`Unknown façade style: ${styleId}`);

  const facade = new THREE.Group();
  box(
    facade,
    [cell.width, PANEL_DEPTH, cell.height],
    [cell.width / 2, FRONT_Y, cell.height / 2],
    surfaces[style.surface],
  );

  if (style.surface === 'timber') addTimberJoints(facade, cell.width, cell.height);
  if (style.form === 'window') addWindow(facade, cell.width, cell.height, false);
  if (style.form === 'barred-window') addWindow(facade, cell.width, cell.height, true);
  if (style.form === 'balcony') addBalcony(facade, cell.width, cell.height);
  return facade;
}

export function buildFacades(model: SketchModel): THREE.Group | undefined {
  if (!model.facade) return undefined;

  const facades = new THREE.Group();
  facades.name = 'facades';
  const cell = DIMENSIONS_METRES.accommodationCell;
  for (let x = 0; x < model.cellsWide; x += 1) {
    for (let z = 0; z < model.cellsHigh; z += 1) {
      const facade = buildCellFacade(model.facade.styleId);
      facade.position.set(x * cell.width, 0, z * cell.height);
      facades.add(facade);
    }
  }
  return facades;
}
