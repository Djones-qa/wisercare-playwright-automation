import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 1,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['list'],
  ],
  use: {
    headless: true,
    screenshot: 'on',
    video: 'on',
    actionTimeout: 15000,
    trace: 'on',
  },
});
