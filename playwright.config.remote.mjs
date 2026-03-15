import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially for remote testing
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for production testing
  workers: 1, // Single worker for remote testing
  reporter: 'html',
  use: {
    // No baseURL - tests will use full URLs
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium-remote',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // No webServer for remote testing - we test against deployed URLs
});
