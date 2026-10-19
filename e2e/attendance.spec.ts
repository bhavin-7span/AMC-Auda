import { test, expect } from '@playwright/test';

/**
 * Phase 6 — GPS attendance administration & monitoring.
 *
 * Guest redirect verifiable now. Authenticated flows (log renders, exceptions filter,
 * correction requires a reason, rules config) require a seeded admin account and are
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

test('guest is redirected from /attendance to /login', async ({ page }) => {
  await page.goto('/attendance');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('admin sees the attendance log and rules', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/attendance');
  await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible();
  await expect(page.getByTestId('data-table')).toBeVisible();
  await expect(page.getByTestId('rules-form')).toBeVisible();
});

test('admin can filter to exceptions only', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/attendance');
  await page.getByTestId('filter-exceptions').click();
  await expect(page).toHaveURL(/exceptions=1/);
});
