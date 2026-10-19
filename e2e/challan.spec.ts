import { test, expect } from '@playwright/test';

/**
 * Phase 11 — M-Challan stub (optional/future, flag-gated).
 *
 * The module is gated behind app_settings.challan_enabled (currently OFF). With the flag
 * off, /challan must not be a usable surface: an unauthenticated user is redirected to
 * login, and no challan nav item exists. The enabled-state tests (screen renders, nav
 * item appears) require both a seeded admin account AND the flag on, so they are
 * skip-gated on E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + E2E_CHALLAN_ENABLED.
 */

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const challanOn = process.env.E2E_CHALLAN_ENABLED === '1';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email!);
  await page.getByTestId('login-password').fill(password!);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/dashboard(\?|$)/);
}

test('guest hitting /challan is redirected to /login (not exposed)', async ({ page }) => {
  await page.goto('/challan');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('admin: /challan is 404 while the flag is OFF', async ({ page }) => {
  test.skip(!email || !password || challanOn, 'Needs an admin account with the challan flag OFF.');
  await login(page);
  const res = await page.goto('/challan');
  expect(res?.status()).toBe(404);
});

test('admin: no challan nav item while the flag is OFF', async ({ page }) => {
  test.skip(!email || !password || challanOn, 'Needs an admin account with the challan flag OFF.');
  await login(page);
  await page.goto('/dashboard');
  await expect(page.getByTestId('nav-challan')).toHaveCount(0);
});

test('admin: challan screen + nav appear when the flag is ON', async ({ page }) => {
  test.skip(!email || !password || !challanOn, 'Needs an admin account with the challan flag ON.');
  await login(page);
  await page.goto('/challan');
  await expect(page.getByRole('heading', { name: 'M-Challan' })).toBeVisible();
  await expect(page.getByTestId('nav-challan')).toBeVisible();
});
