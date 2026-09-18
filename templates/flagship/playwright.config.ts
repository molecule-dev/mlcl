import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'cd api && npx tsx src/server.ts',
      port: 4001,
      timeout: 30000,
      reuseExistingServer: true,
      env: {
        DATABASE_URL: 'postgres://molecule:molecule@localhost:5433/molecule_flagship',
        JWT_SECRET: 'test-secret',
        PORT: '4001',
      },
    },
    {
      command: 'cd app && npx vite --port 5173',
      port: 5173,
      timeout: 30000,
      reuseExistingServer: true,
    },
  ],
})
