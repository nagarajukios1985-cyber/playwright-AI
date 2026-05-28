import fs from 'fs';
import path from 'path';

/**
 * Playwright globalTeardown – runs after the test run finishes.
 * It deletes the default `playwright-report` folder to ensure no built‑in
 * HTML report is left behind.
 */
export default async function () {
  const dir = path.resolve(process.cwd(), 'playwright-report');
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
    // console.log('Removed default playwright-report folder (teardown)');
  } catch (_) {
    // ignore errors – folder may not exist
  }
}

