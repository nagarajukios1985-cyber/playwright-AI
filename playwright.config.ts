import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Remove default report folder before and after the run
  // Clean up the default report folder before and after the run
  globalSetup: './setup/global-setup',
  globalTeardown: './setup/global-teardown',
  testDir: './tests',
  timeout: 30_000,
  use: {
    headless: true,
    // Adding --no-sandbox avoids macOS sandbox permission errors in CI/containers
    launchOptions: {
      args: ['--no-sandbox'],
    },
  },
  // Default project using Google Chrome (Chromium)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // -----------------------------------------------------------------
  // Use only the custom HTML reporter (no built‑in reporters).
  // -----------------------------------------------------------------
  // Playwright expects each reporter entry to be a tuple [modulePath, options]
  reporter: [
    ['./reporter/ArtifactHtmlReporter', {
      outputFile: 'artifacts/test-report.md',
      outputHtml: 'artifacts/test-report.html',
    }],
  ],
});
