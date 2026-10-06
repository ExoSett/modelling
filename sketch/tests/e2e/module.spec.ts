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

test('shared links restore each module state and copy the movement destination', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: async (text: string) => {
        document.documentElement.dataset.copiedLink = text;
      },
    });
  });
  const query = '?layout=1&h=2&w=3&d=0&roof=none&accommodation_facade=none';
  for (const state of [0, 1, 2]) {
    await page.goto(`/${query}&module=${state}`);
    await expect(page.locator('#cells-wide')).toHaveValue('3');
    await expect(page.locator('#show-module')).toBeChecked({ checked: state !== 0 });
    await expect(page.locator('#move-module')).toHaveText(
      state === 1 ? 'Insert module' : 'Withdraw module',
    );
    await page.locator('#copy-link').click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-copied-link',
      new RegExp(`module=${state}$`),
    );
  }
  await page.locator('#move-module').click();
  await expect(page.locator('#move-module')).toHaveText('Withdrawing module…');
  await page.locator('#copy-link').click();
  await expect(page.locator('html')).toHaveAttribute('data-copied-link', /module=1$/);
});
