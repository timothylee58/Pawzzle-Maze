import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:5180', headless: true, reducedMotion: 'reduce' },
  webServer: {
    command: 'npm run dev -- --port 5180',
    url: 'http://127.0.0.1:5180',
    reuseExistingServer: !process.env.CI,
  },
});
