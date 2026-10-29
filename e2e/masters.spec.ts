import { test, expect } from '@playwright/test';

/**
 * Phase 4 — Master-data management.
 *
 * Guest redirect is verifiable now. Authenticated CRUD (add department, edit, soft-delete
 * toggle, geo-fence add) requires a seeded admin account and is skip-gated on
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

test('guest is redirected from /masters to /login', async ({ page }) => {
  await page.goto('/masters');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('admin sees department and geo-fence managers', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/masters');
  await expect(page.getByRole('heading', { name: 'Master Data' })).toBeVisible();
  await expect(page.getByTestId('master-department')).toBeVisible();
  await expect(page.getByTestId('master-work_location')).toBeVisible();
  // Real Leaflet map when geo-fences exist; labeled placeholder when there are none.
  await expect(
    page.locator('[data-testid="map-container"], .leaflet-container').first(),
  ).toBeVisible();
});

test('admin can add a department', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/masters');
  await page.getByTestId('add-department').click();
  await expect(page.getByTestId('form-department')).toBeVisible();
  const suffix = Date.now().toString().slice(-5);
  await page.getByTestId('input-code').fill(`E2E${suffix}`);
  await page.getByTestId('input-name').fill(`E2E Dept ${suffix}`);
  await page.getByTestId('save-department').click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /departments saved/i })).toBeVisible();
});

test('admin can open the bulk-upload panel for departments', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/masters');
  await page.getByTestId('bulk-department').click();
  await expect(page.getByTestId('bulk-form-department')).toBeVisible();
  await expect(page.getByTestId('bulk-csv-department')).toBeVisible();
});
