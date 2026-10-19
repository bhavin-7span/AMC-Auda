import { test, expect } from '@playwright/test';

/**
 * Phase 8 — MIS reports & export.
 *
 * Guest redirect verifiable now. Authenticated flows (report preview, switch report,
 * CSV/Excel/PDF export downloads) require a seeded admin account and are skip-gated on
 * E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
 */

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email!);
  await page.getByTestId('login-password').fill(password!);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/dashboard(\?|$)/);
}

test('guest is redirected from /reports to /login', async ({ page }) => {
  await page.goto('/reports');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('guest cannot hit the export route', async ({ page }) => {
  // The proxy redirects the unauthenticated request to /login.
  await page.goto('/reports/export?report=inspections&format=csv');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('admin sees the report viewer with export buttons', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'MIS Reports' })).toBeVisible();
  await expect(page.getByTestId('export-csv')).toBeVisible();
  await expect(page.getByTestId('export-xlsx')).toBeVisible();
  await expect(page.getByTestId('export-pdf')).toBeVisible();
});

test('admin can download a CSV export', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/reports');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-csv').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});
