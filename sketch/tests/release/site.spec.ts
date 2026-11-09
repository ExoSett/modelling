import { expect, test } from '@playwright/test';

const faults: string[] = [];
test.beforeEach(async ({ page }) => {
  faults.length = 0;
  page.on('pageerror', (error) => faults.push(error.message));
  page.on('response', (response) => {
    if (new URL(response.url()).origin === 'http://127.0.0.1:8766' && response.status() >= 400) {
      faults.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (new URL(request.url()).origin === 'http://127.0.0.1:8766') {
      faults.push(`Failed request: ${request.url()}`);
    }
  });
});
test.afterEach(() => expect(faults).toEqual([]));

test('published Sketch initializes, renders, moves and exports', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/design/sketch/');
  await expect(page.locator('#status')).toHaveText('One pair: 1 high × 1 wide');
  await expect(page.locator('#building-layout')).toHaveValue('single');
  await expect(page.locator('#roof-type option')).toHaveCount(4);
  await expect(page.locator('#facade-style option')).toHaveCount(4);
  await expect(page.locator('#move-module')).toHaveText('Insert pod');
  await expect(page.locator('#webgl-error')).toBeHidden();
  const canvas = page.locator('#viewport');
  const before = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  await page.locator('#move-module').click();
  await expect(page.locator('#move-module')).toHaveText('Withdraw pod');
  await expect
    .poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL()))
    .not.toBe(before);
  for (const [button, extension] of [
    ['#save-xml', '.xml'],
    ['#save-png', '.png'],
  ]) {
    const download = page.waitForEvent('download');
    await page.locator(button!).click();
    expect((await download).suggestedFilename().endsWith(extension!)).toBe(true);
  }
  await page.screenshot({ path: test.info().outputPath('sketch.png') });
});

test('published seasonal chunks load and initialize', async ({ page }) => {
  await page.goto('/design/sketch/?2026xmas');
  await expect(page.locator('.extension-greeting')).toBeVisible();
  await expect(page.locator('#cells-wide')).toHaveValue('5');
  await expect(page.locator('#roof-type')).toHaveValue('gable');
  await expect(page.locator('#webgl-error')).toBeHidden();
});

test('layout switches preserve depth and clamp only to the new limits', async ({ page }) => {
  await page.goto('/design/sketch/?layout=2&h=2&w=3&d=4&roof=none&accommodation_facade=none');
  const layout = page.locator('#building-layout');
  const depth = page.locator('#depth');
  for (const [value, label] of [
    ['quadrangle', 'Four pairs'],
    ['double', 'Two pairs'],
  ]) {
    await layout.selectOption(value!);
    await expect(depth).toHaveValue('4');
    await expect(page.locator('#status')).toHaveText(`${label}: 2 high × 3 wide × 4 deep`);
  }
  await layout.selectOption('quadrangle');
  await depth.fill('20');
  await layout.selectOption('double');
  await expect(depth).toHaveValue('5');
  await expect(page.locator('#status')).toHaveText('Two pairs: 2 high × 3 wide × 5 deep');
  await depth.fill('0');
  await layout.selectOption('quadrangle');
  await expect(depth).toHaveValue('1');
  await expect(page.locator('#status')).toHaveText('Four pairs: 2 high × 3 wide × 1 deep');
  await layout.selectOption('single');
  await expect(depth).toHaveValue('0');
  await expect(page.locator('#depth-control')).toBeHidden();
  await expect(page.locator('#status')).toHaveText('One pair: 2 high × 3 wide');
});
