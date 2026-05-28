import { test, expect } from '@playwright/test';

test('basic sanity check', async ({ page }) => {
  await page.goto('https://www.airbnb.co.in/');
  await expect(page).toHaveTitle(/Airbnb/);
});



test('search button should be visible', async ({ page }) => {
  await page.goto('https://www.airbnb.co.in/');
  const searchButton = page.getByRole('button', { name: /Search/i });
  await expect(searchButton).toBeVisible();
});



test('intentional failure test', async ({ page }) => {
  await page.goto('https://www.airbnb.co.in/');
  // This assertion is designed to fail
  await expect(page).toHaveTitle(/NonExistentTitle/);
});
