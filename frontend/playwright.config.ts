import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 25_000,
  use: {
    baseURL: 'http://127.0.0.1:5175',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'npm run build && npm run preview -- --mode e2e --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
