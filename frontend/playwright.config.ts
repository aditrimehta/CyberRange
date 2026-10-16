import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost', trace: 'retain-on-failure' },
  reporter: 'list',
})
