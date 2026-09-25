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
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.locator('#building-layout').selectOption('double');
  // Control animation frames so software rendering speed cannot affect the baseline.
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
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
  // Retain pending inertia: resizing must discard it without changing this direction.
  const initial = await cameraState(page);
  const defaultDirection = new THREE.Vector3(1, -1.25, 0.85).normalize();
  expect(initial.direction.distanceTo(defaultDirection)).toBeGreaterThan(0.1);
  let model: SketchModel = { cellsWide: 1, cellsHigh: 1, layout: 'double', depth: 0 };
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
    await page.clock.runFor(32);
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
  await page.clock.runFor(32);
  const reset = await cameraState(page);
  expect(reset.direction.distanceTo(defaultDirection)).toBeLessThan(0.0001);
  expect(reset.target.distanceTo(bounds(model).getCenter(new THREE.Vector3()))).toBeLessThan(
    0.0001,
  );
});

test('browser resizing and orientation changes preserve the current camera', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const viewport = page.locator('#viewport');
  const rect = await viewport.boundingBox();
  if (!rect) throw new Error('Missing viewport');
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2 + 50, rect.y + rect.height / 2 + 20, { steps: 8 });
  await page.mouse.up();
  await page.clock.runFor(3000);
  const initial = await cameraState(page);
  expect(
    initial.direction.distanceTo(new THREE.Vector3(1, -1.25, 0.85).normalize()),
  ).toBeGreaterThan(0.05);
  for (const size of [
    { width: 1600, height: 900 },
    { width: 390, height: 844 },
    { width: 740, height: 360 },
    { width: 390, height: 650 },
  ]) {
    await page.setViewportSize(size);
    await page.clock.runFor(100);
    const state = await cameraState(page);
    expect(state.direction.distanceTo(initial.direction)).toBeLessThan(0.0001);
    expect(state.position.distanceTo(initial.position)).toBeLessThan(0.0001);
    expect(state.target.distanceTo(initial.target)).toBeLessThan(0.0001);
    await expect
      .poll(() =>
        viewport.evaluate((element) => {
          const canvas = element as HTMLCanvasElement;
          return Math.abs(canvas.width / canvas.height - canvas.clientWidth / canvas.clientHeight);
        }),
      )
      .toBeLessThan(0.01);
  }
});

test('phone touch gestures orbit and zoom while controls scroll independently', async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch behaviour is exercised in the phone project.');
  await page.clock.install();
  await page.goto('/');
  const session = await context.newCDPSession(page);
  const viewport = await page.locator('#viewport').boundingBox();
  if (!viewport) throw new Error('Missing viewport');
  const x = viewport.x + viewport.width / 2;
  const y = viewport.y + viewport.height / 2;
  const initial = await cameraState(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 0 }],
  });
  for (let i = 1; i <= 8; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + i * 5, y: y + i * 2, id: 0 }],
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.clock.runFor(3000);
  const rotated = await cameraState(page);
  expect(rotated.direction.distanceTo(initial.direction)).toBeGreaterThan(0.05);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 30, y, id: 0 },
      { x: x + 30, y, id: 1 },
    ],
  });
  for (let i = 1; i <= 8; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: x - 30 - i * 5, y, id: 0 },
        { x: x + 30 + i * 5, y, id: 1 },
      ],
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.clock.runFor(3000);
  const zoomed = await cameraState(page);
  expect(zoomed.position.distanceTo(zoomed.target)).toBeLessThan(
    rotated.position.distanceTo(rotated.target) * 0.9,
  );
  await page.locator('.control-panel').evaluate((panel) => {
    panel.scrollTop = 0;
  });
  const panel = await page.locator('.control-panel').boundingBox();
  if (!panel) throw new Error('Missing controls');
  const startY = panel.y + panel.height - 30;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: panel.x + 20, y: startY, id: 0 }],
  });
  for (let i = 1; i <= 10; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: panel.x + 20, y: startY - i * 15, id: 0 }],
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect
    .poll(() => page.locator('.control-panel').evaluate((panel) => panel.scrollTop))
    .toBeGreaterThan(50);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await session.detach();
});
