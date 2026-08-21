import { expect, test } from '@playwright/test';

test('updates the model dimensions and keeps controls usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Shape a simple building' })).toBeVisible();
  await expect(page.locator('#status')).toHaveText('One pair: 5 wide × 3 high');

  await page.locator('#cells-wide').fill('8');
  await page.locator('#cells-high').fill('4');

  await expect(page.locator('#status')).toHaveText('One pair: 8 wide × 4 high');
  await expect(page.locator('#model-size')).toHaveText('22.4 × 13.9 m');
  await expect(page.locator('#viewport')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save XML' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
});

test('supports ten cells high and marks dimensions beyond their limits in red', async ({
  page,
}) => {
  await page.goto('/');
  const widthInput = page.locator('#cells-wide');
  const heightInput = page.locator('#cells-high');

  await expect(heightInput).toHaveAttribute('max', '10');
  await heightInput.fill('10');
  await expect(page.locator('#status')).toHaveText('One pair: 5 wide × 10 high');

  await heightInput.fill('11');
  await expect(heightInput).toHaveCSS('color', 'rgb(199, 37, 37)');
  await widthInput.fill('21');
  await expect(widthInput).toHaveCSS('color', 'rgb(199, 37, 37)');
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

test('applies one façade style to all cells and clears it when the grid changes', async ({
  page,
}) => {
  await page.goto('/');

  await page.locator('#facade-style').selectOption('brick-window');
  await expect(page.locator('#status')).toHaveText('Brick with window on all cells');

  const facadeXmlPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save XML' }).click();
  const facadeXml = await facadeXmlPromise;
  const stream = await facadeXml.createReadStream();
  let xml = '';
  for await (const chunk of stream) xml += chunk.toString();
  expect(xml).toContain('<sketch:facade styleRef="brick-window"/>');

  await page.locator('#cells-wide').fill('6');
  await expect(page.locator('#facade-style')).toHaveValue('');
});

test('switches between facing-pair and quadrangle layouts', async ({ page }) => {
  await page.goto('/');
  const layout = page.locator('#building-layout');
  const gapControl = page.locator('#service-gap-control');
  await page.locator('#facade-style').selectOption('timber-balcony');

  await layout.selectOption('double');
  await expect(gapControl).toBeVisible();
  await expect(page.locator('#roof-type option')).toHaveText(['None', 'Flat', 'Gable']);
  await expect(page.locator('#facade-style')).toHaveValue('timber-balcony');
  await page.locator('#service-gap').fill('3');
  await expect(page.locator('#roof-type option')).toHaveText(['None', 'Space frame']);
  await expect(page.locator('#roof-type')).toHaveValue('none');
  await expect(page.locator('#roof-type')).toBeEnabled();
  await expect(page.locator('#status')).toHaveText('Two facing pairs: 5 wide × 3 high');

  await layout.selectOption('quadrangle');
  await expect(gapControl).toBeHidden();
  await expect(page.locator('#status')).toHaveText('Four-pair quadrangle: 5 wide × 3 high');
});

test('selects and saves a gable roof', async ({ page }) => {
  await page.goto('/');
  await page.locator('#roof-type').selectOption('gable');
  await expect(page.locator('#status')).toHaveText('Gable roof selected');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save XML' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let xml = '';
  for await (const chunk of stream) xml += chunk.toString();
  expect(xml).toContain('<sketch:roof type="gable"/>');
});
