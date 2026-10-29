import { test, expect } from '@playwright/test';

/**
 * Phase 7 — Dashboards.
 *
 * Guest redirect verifiable now. Authenticated flows (widgets render, status drill-down,
 * filters) require a seeded admin account and are skip-gated on
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

// Guest redirect for /dashboard is covered in shell.spec.ts.

test('admin sees KPI widgets and status breakdown', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await expect(page.getByTestId('widget-total')).toBeVisible();
  await expect(page.getByTestId('status-breakdown')).toBeVisible();
});

test('admin can drill down from a status tile to the filtered list', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.getByTestId('status-completed').click();
  await expect(page).toHaveURL(/\/inspections\?status=completed/);
});

test('admin can apply a department/date filter', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.getByTestId('dashboard-apply').click();
  await expect(page.getByTestId('widget-total')).toBeVisible();
});

test('the chosen department stays selected after applying the filter', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  const department = page.getByTestId('dashboard-department');
  await department.click();
  // First real department (the list starts with "All departments").
  const option = page.getByRole('option').nth(1);
  const name = (await option.textContent())!.trim();
  await option.click();
  await page.getByTestId('dashboard-apply').click();
  await expect(page).toHaveURL(/department=/);
  await expect(page.getByTestId('widget-total')).toBeVisible();
  await expect(department).toContainText(name);
});

test('assign inspection opens the two-step create dialog and validates each step', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await expect(page.getByRole('link', { name: /Export summary/ })).toHaveCount(0);
  await page.getByTestId('create-inspection').click();
  const dialog = page.getByTestId('create-inspection-dialog');
  await expect(dialog).toContainText('Step 1 of 2');
  await dialog.getByTestId('ci-continue').click();
  await expect(dialog.getByTestId('ci-error')).toBeVisible();

  await dialog.getByTestId('ci-type').click();
  await page.getByRole('option', { name: /inspection/i }).first().click();
  await dialog.getByTestId('ci-zone').click();
  await page.getByRole('option', { name: /E2E Dept/ }).first().click();
  await dialog.getByTestId('ci-address').fill('E2E site, Ahmedabad');
  await dialog.getByRole('region', { name: 'Site location picker' }).click({ position: { x: 200, y: 90 } });
  await expect(dialog.getByTestId('ci-coords')).toContainText('Marked at');
  await dialog.getByTestId('ci-continue').click();

  // Step 2 requires an officer and date; stop before creating anything.
  await expect(dialog).toContainText('Step 2 of 2');
  await dialog.getByTestId('ci-submit').click();
  await expect(dialog.getByTestId('ci-error')).toContainText('field officer');
});
