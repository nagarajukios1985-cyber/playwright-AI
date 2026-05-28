import { defineConfig } from '@playwright/test';

export default defineConfig({

  testDir: './tests',

  outputDir: 'artifacts/test-results',

  reporter: [
    ['list'],

    // ✅ SAFE: Playwright official HTML report (Jenkins-friendly fallback)
    ['html', {
      outputFolder: 'playwright-report',
      open: 'never',
    }],

    // ✅ Your custom reporter (kept but now SAFE as secondary)
    ['./reporters/artifact-html-reporter.js', {
      outputFile: 'artifacts/test-report.md',
      outputHtml: 'artifacts/test-report.html',
    }],

    // ✅ CI-friendly machine readable output
    ['json', {
      outputFile: 'artifacts/results.json',
    }],
  ],

  use: {
    headless: true,

    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

});