import { expect, test } from '@playwright/test';

for (const size of [
  { width: 1920, height: 1080 },
  { width: 1280, height: 600 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 740, height: 360 },
]) {
  test(`workspace fits ${size.width} × ${size.height} and controls scroll independently`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.locator('#status')).toHaveText('One pair: 1 high × 1 wide');
    const workspace = await page.locator('.workspace').boundingBox();
    const canvas = await page.locator('#viewport').boundingBox();
    expect(workspace).not.toBeNull();
    expect(canvas).not.toBeNull();
    expect(workspace!.x).toBeGreaterThanOrEqual(0);
    expect(workspace!.x + workspace!.width).toBeLessThanOrEqual(size.width);
    expect(workspace!.y + workspace!.height).toBeLessThanOrEqual(size.height);
    expect(workspace!.width).toBeGreaterThan(size.width * 0.85);
    expect(canvas!.height).toBeGreaterThan(150);
    expect(canvas!.width).toBeGreaterThan(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(size.width);
    await expect
      .poll(() =>
        page.locator('#viewport').evaluate((element) => {
          const canvas = element as HTMLCanvasElement;
          const parent = canvas.parentElement!;
          const ratio = Math.min(devicePixelRatio, 2);
          return (
            Math.abs(canvas.width - Math.floor(parent.clientWidth * ratio)) <= 1 &&
            Math.abs(canvas.height - Math.floor(parent.clientHeight * ratio)) <= 1
          );
        }),
      )
      .toBe(true);
    await page.locator('#building-layout').selectOption('quadrangle');
    await page.locator('#depth').fill('3');
    await page.locator('#reset-view').click();
    await expect(page.locator('#reset-view')).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.locator('#viewport').boundingBox()).toEqual(canvas);
    await page.locator('#cells-wide').fill('7');
    await expect(page.locator('#cells-wide')).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await page.getByRole('link', { name: 'About Sketch & controls' }).click();
    await expect(page.locator('#sketch-help-title')).toBeInViewport();
    await page.getByRole('link', { name: 'Back to Sketch' }).click();
    await expect(page.locator('#viewport')).toBeInViewport();
  });
}
