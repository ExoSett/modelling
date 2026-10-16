import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const siteRoot = resolve(process.env.SKETCH_SITE_ROOT ?? '../../website/_site');

export default defineConfig({
  testDir: './tests/release',
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: `python3 -m http.server 8766 --bind 127.0.0.1 --directory "${siteRoot}"`,
    url: 'http://127.0.0.1:8766/design/sketch/',
    reuseExistingServer: false,
  },
  use: {
    baseURL: 'http://127.0.0.1:8766',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
