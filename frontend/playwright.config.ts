import { defineConfig, devices } from '@playwright/test';

/**
 * Requires the full stack running to execute for real:
 *   1. PostgreSQL + Redis reachable at backend/.env's DATABASE_URL/REDIS_*
 *   2. Backend: `npm run start:dev` (from backend/, or `npm run dev` at the root)
 *   3. Frontend: `npm run dev` (from frontend/) — or let `webServer` below start it
 * None of that is available in the sandbox these tests were authored in,
 * so they're written correctly and typecheck cleanly, but have not been
 * executed end-to-end. Run `npm run test:e2e` locally once the stack above
 * is up.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
