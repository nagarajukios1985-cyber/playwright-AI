import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({

  testDir: './tests',

  outputDir: 'artifacts/test-results',

  reporter: [
    ['list'],

    ['json', {
      outputFile: path.join('artifacts', 'results.json'),
    }],

    ['./reporter/ArtifactHtmlReporter', {
      outputFile: path.join('artifacts', 'test-report.md'),
      outputHtml: path.join('artifacts', 'test-report.html'),
    }],
  ],

  use: {
    headless: true,
    video: 'retain-on-failure',
  },
});