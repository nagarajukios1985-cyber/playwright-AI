import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  outputDir: 'artifacts/test-results',

  reporter: [
    ['list'],

    // ✅ ONLY your custom reporter
    ['./reporter/ArtifactHtmlReporter', {
      outputFile: 'artifacts/test-report.md',
      outputHtml: 'artifacts/test-report.html',
    }],
  ],

  use: {
    headless: true,
  },
});