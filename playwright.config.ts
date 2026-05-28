import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',

  outputDir: 'artifacts/test-results',

  reporter: [
    ['list'],

    ['json', {
      outputFile: 'artifacts/results.json',
    }],
  ],

  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});