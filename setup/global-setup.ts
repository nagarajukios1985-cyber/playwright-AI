import fs from 'fs';
import path from 'path';

/**
 * Playwright globalSetup – runs before any test files are loaded.
 * It removes the default `playwright-report` folder if it exists so the
 * built‑in HTML reporter never writes stale data.
 */
export default async function () {
  const dir = path.resolve(process.cwd(), 'playwright-report');
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
    // console.log('Removed default playwright-report folder (setup)');
  } catch (_) {
    // ignore errors – folder may not exist
  }
}

