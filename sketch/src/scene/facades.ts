import * as THREE from 'three';
import {
  DIMENSIONS_METRES,
  FACADE_STYLES,
  type FacadeStyleId,
  type SketchModel,
} from '../model/model';

const PANEL_DEPTH = 0.1;
const FRONT_Y = -PANEL_DEPTH / 2 - 0.1;
// Provisional finished-floor datum for an installed module within the cell.
const BALCONY_FLOOR_SURFACE_Z = 0.18;
const BALCONY_FLOOR_THICKNESS = 0.09;
const BALCONY_GUARD_HEIGHT = 1.1;
const BALCONY_RAIL_THICKNESS = 0.04;
const BALCONY_MAX_OPENING = 0.1;

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
const panelEdgeMaterial = new THREE.LineBasicMaterial({
  color: 0x252827,
  transparent: true,
  opacity: 0.48,
});

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

function addBalcony(group: THREE.Group, width: number): void {
  const balconyWidth = width * 0.78;
  const projection = 0.75;
  box(
    group,
    [balconyWidth, projection, BALCONY_FLOOR_THICKNESS],
    [width / 2, FRONT_Y - projection / 2, BALCONY_FLOOR_SURFACE_Z - BALCONY_FLOOR_THICKNESS / 2],
    balconyMaterial,
  );
  const railCentreZ = BALCONY_FLOOR_SURFACE_Z + BALCONY_GUARD_HEIGHT - BALCONY_RAIL_THICKNESS / 2;
  box(
    group,
    [balconyWidth, 0.035, BALCONY_RAIL_THICKNESS],
    [width / 2, FRONT_Y - projection, railCentreZ],
    darkMaterial,
  );

  const uprightHeight = BALCONY_GUARD_HEIGHT - BALCONY_RAIL_THICKNESS;
  const openingCount = Math.ceil(balconyWidth / BALCONY_MAX_OPENING);
  for (let index = 0; index <= openingCount; index += 1) {
    const x = width / 2 - balconyWidth / 2 + (index * balconyWidth) / openingCount;
    box(
      group,
      [0.025, 0.025, uprightHeight],
      [x, FRONT_Y - projection, BALCONY_FLOOR_SURFACE_Z + uprightHeight / 2],
      darkMaterial,
    );
  }
}

function buildCellFacade(styleId: FacadeStyleId): THREE.Group {
  const cell = DIMENSIONS_METRES.accommodationCell;
  const style = FACADE_STYLES.find((candidate) => candidate.id === styleId);
  if (!style) throw new Error(`Unknown facade style: ${styleId}`);

  const facade = new THREE.Group();
  box(
    facade,
    [cell.width, PANEL_DEPTH, cell.height],
    [cell.width / 2, FRONT_Y, cell.height / 2],
    surfaces[style.surface],
  );

  const frontFaceY = FRONT_Y - PANEL_DEPTH / 2 - 0.006;
  const perimeter = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, frontFaceY, 0),
      new THREE.Vector3(cell.width, frontFaceY, 0),
      new THREE.Vector3(cell.width, frontFaceY, cell.height),
      new THREE.Vector3(0, frontFaceY, cell.height),
    ]),
    panelEdgeMaterial,
  );
  perimeter.name = 'facade-panel-perimeter';
  facade.add(perimeter);

  if (style.surface === 'timber') addTimberJoints(facade, cell.width, cell.height);
  if (style.form === 'window') addWindow(facade, cell.width, cell.height, false);
  if (style.form === 'barred-window') addWindow(facade, cell.width, cell.height, true);
  if (style.form === 'balcony') addBalcony(facade, cell.width);
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
