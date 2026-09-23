import { expect, test, type Page } from '@playwright/test';
import * as THREE from 'three';
import { buildBuilding, disposeBuilding } from '../../src/scene/building';
import type { SketchModel } from '../../src/model/model';

async function cameraState(page: Page) {
  const downloaded = page.waitForEvent('download');
  await page.locator('#save-xml').click();
  const stream = await (await downloaded).createReadStream();
  let xml = '';
  for await (const chunk of stream) xml += chunk.toString();
  const vector = (prefix: string) =>
    new THREE.Vector3(
      ...['X', 'Y', 'Z'].map((axis) => {
        const match = xml.match(new RegExp(`${prefix}${axis}="([^"]+)"`));
        if (!match) throw new Error(`Missing camera ${prefix}${axis}`);
        return Number(match[1]);
      }),
    );
  const position = vector('position');
  const target = vector('target');
  return { position, target, direction: position.clone().sub(target).normalize() };
}

function bounds(model: SketchModel) {
  const building = buildBuilding(model);
  const box = new THREE.Box3().setFromObject(building);
  disposeBuilding(building);
  return box;
}

test('dimension changes fit the building and retain a rotated, panned view', async ({ page }) => {
  await page.goto('/');
  await page.locator('#building-layout').selectOption('double');
  const viewport = page.locator('#viewport');
  await viewport.scrollIntoViewIfNeeded();
  const rect = await viewport.boundingBox();
  if (!rect) throw new Error('Missing viewport');
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 35, { steps: 12 });
  await page.mouse.up();
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(x + 20, y + 10, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  // Wait for actual damping convergence, independent of browser rendering speed.
  let initial = await cameraState(page);
  await expect(async () => {
    const next = await cameraState(page);
    const movement =
      next.position.distanceTo(initial.position) + next.target.distanceTo(initial.target);
    initial = next;
    expect(movement).toBeLessThan(0.000001);
  }).toPass({ timeout: 20000, intervals: [500] });
  const defaultDirection = new THREE.Vector3(1, -1.25, 0.85).normalize();
  expect(initial.direction.distanceTo(defaultDirection)).toBeGreaterThan(0.1);
  let model: SketchModel = { cellsWide: 5, cellsHigh: 3, layout: 'double', depth: 0 };
  const pan = initial.target.clone().sub(bounds(model).getCenter(new THREE.Vector3()));
  expect(pan.length()).toBeGreaterThan(0.01);
  const distances: number[] = [];
  const changes = [
    { input: '#cells-wide', value: 12, model: { cellsWide: 12 } },
    { input: '#cells-high', value: 8, model: { cellsHigh: 8 } },
    { input: '#depth', value: 5, model: { depth: 5 } },
    { input: '#cells-wide', value: 20, model: { cellsWide: 20 } },
    { input: '#cells-high', value: 10, model: { cellsHigh: 10 } },
    { input: '#cells-wide', value: 1, model: { cellsWide: 1 } },
    { input: '#cells-high', value: 1, model: { cellsHigh: 1 } },
    { input: '#depth', value: 0, model: { depth: 0 } },
  ];
  for (const change of changes) {
    await page.locator(change.input).fill(String(change.value));
    model = { ...model, ...change.model };
    const state = await cameraState(page);
    expect(state.direction.distanceTo(initial.direction)).toBeLessThan(0.0001);
    const box = bounds(model);
    expect(
      state.target.clone().sub(box.getCenter(new THREE.Vector3())).distanceTo(pan),
    ).toBeLessThan(0.0001);
    distances.push(state.position.distanceTo(state.target));
    const size = await viewport.boundingBox();
    if (!size) throw new Error('Missing viewport');
    const camera = new THREE.PerspectiveCamera(38, size.width / size.height, 0.05, 10000);
    camera.up.set(0, 0, 1);
    camera.position.copy(state.position);
    camera.lookAt(state.target);
    camera.updateMatrixWorld();
    for (const cx of [box.min.x, box.max.x])
      for (const cy of [box.min.y, box.max.y])
        for (const cz of [box.min.z, box.max.z]) {
          const projected = new THREE.Vector3(cx, cy, cz).project(camera);
          expect(Math.abs(projected.x)).toBeLessThan(0.95);
          expect(Math.abs(projected.y)).toBeLessThan(0.95);
          expect(Math.abs(projected.z)).toBeLessThan(1);
        }
  }
  expect(distances[4]!).toBeGreaterThan(distances[0]!);
  expect(distances[7]!).toBeLessThan(distances[4]! / 2);
  await page.locator('#reset-view').click();
  const reset = await cameraState(page);
  expect(reset.direction.distanceTo(defaultDirection)).toBeLessThan(0.0001);
  expect(reset.target.distanceTo(bounds(model).getCenter(new THREE.Vector3()))).toBeLessThan(
    0.0001,
  );
});
