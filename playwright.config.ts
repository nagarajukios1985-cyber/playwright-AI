import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  outputDir: 'artifacts/test-results',

  reporter: [
    ['list'],

    ['./reporter/ArtifactHtmlReporter.js', {
      outputHtml: 'artifacts/test-report.html',
      outputFile: 'artifacts/test-report.md'
    }]
  ],

  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
});