import { defineConfig } from '@playwright/test'
import fs from 'node:fs'

// The Claude Code cloud environment pre-installs Chromium at a fixed path.
// Use it when present so the Playwright version never has to re-download.
const preinstalledChromium = '/opt/pw-browsers/chromium'
const executablePath = fs.existsSync(preinstalledChromium) ? preinstalledChromium : undefined

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8787',
    viewport: { width: 1920, height: 1080 },
    launchOptions: executablePath ? { executablePath } : {},
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run start',
    port: 8787,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
