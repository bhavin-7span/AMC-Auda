import { test, expect } from '@playwright/test';

/**
 * Phase 5 — Field inspection administration & monitoring.
 *
 * Guest redirect is verifiable now. Authenticated flows (list renders, open a detail,
 * workflow actions, assignment, comment) require a seeded admin account and are
 * skip-gated on E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
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

test('guest is redirected from /inspections to /login', async ({ page }) => {
  await page.goto('/inspections');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('admin sees the inspections list', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/inspections');
  await expect(page.getByRole('heading', { name: 'Inspections' })).toBeVisible();
  await expect(page.getByTestId('data-table')).toBeVisible();
});

test('admin can open an inspection detail with timeline and evidence', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/inspections');
  const firstLink = page.getByTestId(/^inspection-link-/).first();
  await firstLink.click();
  // Detail opens in a drawer on the list route.
  await expect(page).toHaveURL(/\/inspections\?.*inspection=/);
  const drawer = page.getByTestId('inspection-drawer');
  await expect(drawer.getByTestId('inspection-ref')).toHaveText(/^INS-/);
  await expect(drawer.getByTestId('event-timeline')).toBeVisible();
  await drawer.getByTestId('tab-review').click();
  await expect(drawer.getByTestId('comment-list')).toBeVisible();
  await drawer.getByTestId('drawer-close').click();
  await expect(page).not.toHaveURL(/inspection=/);
});

test('clicking a row opens the drawer and the status tabs filter the list', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/inspections');
  await page.getByTestId('tab-completed').click();
  await expect(page).toHaveURL(/status=completed/);
  await page.getByTestId('tab-all').click();
  await expect(page).not.toHaveURL(/status=/);
  await page.locator('tbody tr').first().click();
  await expect(page.getByTestId('inspection-drawer')).toBeVisible();
});

test('admin can search live, filter by status and apply sheet filters', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/inspections');
  // Search applies as you type (debounced), no submit button.
  await page.getByTestId('inspection-search').fill('INS');
  await expect(page).toHaveURL(/[?&]q=INS/);
  await page.getByTestId('inspection-status').click();
  await page.getByRole('option', { name: 'Completed' }).click();
  await expect(page).toHaveURL(/status=completed/);
  await expect(page).toHaveURL(/q=INS/);
  await page.getByTestId('filter-toggle').click();
  await page.getByTestId('inspection-department').click();
  await page.getByRole('option').nth(1).click();
  await page.getByTestId('inspection-apply').click();
  await expect(page).toHaveURL(/department=/);
  await expect(page).toHaveURL(/status=completed/);
  await expect(page.getByTestId('filter-count')).toHaveText('1');
});
