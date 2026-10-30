import { defineConfig, devices } from '@playwright/test'

// E2E_BASE_URL=https://... runs the same journeys against a deployed instance
const remote = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: remote ? 1 : 0,
  use: { baseURL: remote ?? 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: remote
    ? undefined
    : [
        {
          command: 'cd ../backend && .venv/bin/uvicorn app.main:app --port 8000',
          url: 'http://localhost:8000/api/v1/health',
          reuseExistingServer: true,
        },
        {
          command: 'npm run preview -- --port 4173 --strictPort',
          url: 'http://localhost:4173',
          reuseExistingServer: true,
        },
      ],
})
