import { expect, test } from '@playwright/test';

test('starts with one frame pair and demonstrates one module', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('One pair: 1 high × 1 wide');
  await expect(page.locator('#model-size')).toHaveText('2.8 × 3.5 m');
  await expect(page.getByLabel('Frame pairs')).toHaveValue('single');
  await expect(page.locator('#show-module')).toBeChecked();
  await page.locator('#move-module').click();
  await expect(page.locator('#move-module')).toHaveText('Withdrawing module…');
  await expect(page.locator('#move-module')).toHaveText('Insert module');
  await page.locator('#move-module').click();
  await expect(page.locator('#move-module')).toHaveText('Withdraw module');
  await page.locator('#facade-style').selectOption('brick-window');
  await expect(page.locator('#move-module')).toBeDisabled();
  await expect(page.locator('#show-module')).toBeChecked();
  await page.locator('#facade-style').selectOption('');
  await expect(page.locator('#move-module')).toBeEnabled();
  await page.locator('#show-module').uncheck();
  await page.locator('#cells-wide').fill('3');
  await expect(page.locator('#move-module')).toBeDisabled();
});

test('reduced motion changes endpoints immediately and rebuilds cancel movement', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#move-module').click();
  await expect(page.locator('#move-module')).toHaveText('Insert module');
  await page.locator('#cells-high').fill('2');
  await expect(page.locator('#move-module')).toHaveText('Withdraw module');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#move-module').click();
  await expect(page.locator('#facade-style')).toBeDisabled();
  await expect(page.locator('#move-module')).toHaveText('Insert module');
  await page.locator('#facade-style').selectOption('stone-bars');
  await expect(page.locator('#move-module')).toBeDisabled();
  await expect(page.locator('#move-module')).toHaveText('Insert module');
  await page.locator('#show-module').uncheck();
  await page.locator('#show-module').check();
  await expect(page.locator('#move-module')).toHaveText('Insert module');
  await page.locator('#facade-style').selectOption('');
  await expect(page.locator('#move-module')).toHaveText('Insert module');
  await expect(page.locator('#move-module')).toBeEnabled();
});
