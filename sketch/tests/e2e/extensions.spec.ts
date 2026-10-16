import { expect, test } from '@playwright/test';

test('Christmas is lazy, viewable, export-safe and exits on a parameter change', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await expect(page.locator('#cells-wide')).toHaveValue('1');
  expect(requests.some((url) => url.includes('/2026xmas/'))).toBe(false);
  await page.goto('/?2026xmas');
  await expect(page.locator('.extension-greeting')).toHaveText('Season’s greetings from ExoSett');
  await expect(page.locator('#cells-wide')).toHaveValue('5');
  await expect(page.locator('#cells-high')).toHaveValue('3');
  await expect(page.locator('#building-layout')).toHaveValue('double');
  await expect(page.locator('#roof-type')).toHaveValue('gable');
  await expect(page.locator('#show-module')).toBeDisabled();
  await page.screenshot({ path: test.info().outputPath('exosett-xmas.png') });
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#save-xml').click();
  const stream = await (await downloadPromise).createReadStream();
  let xml = '';
  for await (const chunk of stream) xml += chunk.toString();
  expect(xml).toContain('widthCells="5"');
  expect(xml).not.toMatch(/snow|sleigh|2026xmas|footprint/i);
  await page.locator('#cells-wide').fill('6');
  await expect(page.locator('.extension-greeting')).toBeHidden();
  await expect(page.locator('#show-module')).toBeEnabled();
  expect(new URL(page.url()).search).toBe('');
  await expect(page.locator('#status')).toHaveText('Two pairs: 3 high × 6 wide × 0 deep');
});

for (const query of ['2026xmas&w=5', '2026xmas&2026xmas', 'unknown', '2026xmas=yes']) {
  test(`does not load an extension for ${query}`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto(`/?${query}`);
    await expect(page.locator('#cells-wide')).toHaveValue('1');
    await expect(page.locator('.extension-greeting')).toBeHidden();
    expect(requests.some((url) => url.includes('/2026xmas/'))).toBe(false);
  });
}

for (const parameter of ['roof', 'facade', 'invalid width']) {
  test(`changing ${parameter} exits the seasonal presentation`, async ({ page }) => {
    await page.goto('/?2026xmas');
    await expect(page.locator('.extension-greeting')).toBeVisible();
    if (parameter === 'roof') await page.locator('#roof-type').selectOption('flat');
    else if (parameter === 'facade') await page.locator('#facade-style').selectOption('stone-bars');
    else await page.locator('#cells-wide').fill('');
    await expect(page.locator('.extension-greeting')).toBeHidden();
    await expect(page.locator('#show-module')).toBeEnabled();
    expect(new URL(page.url()).search).toBe('');
  });
}

test('seasonal scene still supports orbit and zoom', async ({ page }) => {
  await page.goto('/?2026xmas');
  await expect(page.locator('.extension-greeting')).toBeVisible();
  const canvas = page.locator('#viewport');
  const image = () => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  const before = await image();
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2 + 20, {
    steps: 8,
  });
  await page.mouse.up();
  await expect.poll(image).not.toBe(before);
  const rotated = await image();
  await page.mouse.wheel(0, -300);
  await expect.poll(image).not.toBe(rotated);
});
