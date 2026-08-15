import { expect, test } from '@playwright/test';

test('updates the model dimensions and keeps controls usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Shape a simple building' })).toBeVisible();
  await expect(page.locator('#status')).toHaveText('5 wide × 3 high');

  await page.locator('#cells-wide').fill('8');
  await page.locator('#cells-high').fill('4');

  await expect(page.locator('#status')).toHaveText('8 wide × 4 high');
  await expect(page.locator('#model-size')).toHaveText('22.4 × 13.9 m');
  await expect(page.locator('#viewport')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save XML' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
});

test('downloads XML and a PNG from the current model', async ({ page }) => {
  await page.goto('/');

  const xmlDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save XML' }).click();
  const xmlDownload = await xmlDownloadPromise;
  expect(xmlDownload.suggestedFilename()).toBe('exosett-sketch-5x3.xml');
  const xmlStream = await xmlDownload.createReadStream();
  let xml = '';
  for await (const chunk of xmlStream) xml += chunk.toString();
  expect(xml).toContain('formatVersion="0.1.0"');
  expect(xml).toContain('widthCells="5"');
  expect(xml).toContain('<sketch:camera');

  const loadedXml = xml
    .replace('widthCells="5"', 'widthCells="9"')
    .replace('heightCells="3"', 'heightCells="2"');
  await page.locator('#xml-file').setInputFiles({
    name: 'saved-model.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from(loadedXml),
  });
  await expect(page.locator('#status')).toHaveText('Loaded saved-model.xml');
  await expect(page.locator('#cells-wide')).toHaveValue('9');
  await expect(page.locator('#cells-high')).toHaveValue('2');

  const pngDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe('exosett-sketch-9x2.png');
  const pngStream = await pngDownload.createReadStream();
  const header = await new Promise<Buffer>((resolve, reject) => {
    pngStream.once('data', (chunk: Buffer) => resolve(chunk.subarray(0, 8)));
    pngStream.once('error', reject);
  });
  expect([...header]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
});
