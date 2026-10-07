import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  expect: { timeout: 10000 },
  workers: 2,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4176/ENSO-BackEnd/',
    browserName: 'chromium',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build -- --outDir .browser-build && npm run preview -- --outDir .browser-build --base /ENSO-BackEnd/ --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176/ENSO-BackEnd/',
    reuseExistingServer: false,
    timeout: 120000,
    env: { VITE_API_BASE: 'http://127.0.0.1:4176', VITE_API_PATH: 'isolated-test', VERCEL: '0' },
  },
});
