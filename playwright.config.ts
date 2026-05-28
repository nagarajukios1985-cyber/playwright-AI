import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  outputDir: 'artifacts/test-results',

  use: {
    headless: true,
  },

  reporter: [
    ['./reporter/ArtifactHtmlReporter', {
      outputFile: 'artifacts/test-report.md',
      outputHtml: 'artifacts/test-report.html',
    }],
  ],
});