import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  outputDir: 'artifacts/test-results',

  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  reporter: [
    ['list'],

    // 👇 ONLY YOUR CUSTOM DASHBOARD
    ['./reporter/ArtifactHtmlReporter', {
      outputFile: 'artifacts/test-report.md',
      outputHtml: 'artifacts/test-report.html',
    }],
  ],
});