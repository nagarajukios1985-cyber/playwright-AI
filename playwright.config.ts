import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  outputDir: 'artifacts/test-results',

  reporter: [
    ['list'],

    ['./reporter/ArtifactHtmlReporter.cjs', {
      outputFile: 'artifacts/test-report.md',
      outputHtml: 'artifacts/test-report.html',
    }],
  ],

  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
});