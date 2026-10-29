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

test('admin: /challan shows not-found (no challan UI) while the flag is OFF', async ({ page }) => {
  test.skip(!email || !password || challanOn, 'Needs an admin account with the challan flag OFF.');
  await login(page);
  await page.goto('/challan');
  // notFound() renders the not-found page; the App Router may serve it with a 200 on a
  // client navigation, so assert on CONTENT: the challan screen must NOT be present.
  await expect(page.getByRole('heading', { name: 'M-Challan' })).toHaveCount(0);
  await expect(page.getByText(/not found|404/i).first()).toBeVisible();
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

test('admin: full challan lifecycle — create → issue → pay → PDF', async ({ page }) => {
  test.skip(!email || !password || !challanOn, 'Needs an admin account with the challan flag ON.');
  await login(page);
  await page.goto('/challan');

  // Create a draft challan.
  await page.getByTestId('new-challan').click();
  await expect(page.getByTestId('challan-form')).toBeVisible();
  const marker = `E2E violation ${Date.now().toString().slice(-6)}`;
  await page.getByTestId('challan-violation').fill(marker);
  await page.getByTestId('challan-save').click();

  // Opens in the detail drawer on the list route, in draft status.
  await expect(page).toHaveURL(/\/challan\?.*challan=/);
  await expect(page.getByTestId('challan-drawer')).toBeVisible();
  await expect(page.getByTestId('challan-ref')).toBeVisible();
  await expect(page.getByTestId('challan-ref')).toHaveText(/^CHL-\d{4}-\d{6}$/);
  await expect(page.getByTestId('challan-status')).toHaveText(/draft/i);

  // Issue it.
  await page.getByTestId('challan-action-issue').click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /issued/i })).toBeVisible();
  await expect(page.getByTestId('challan-status')).toHaveText(/issued/i);

  // Mark paid (terminal).
  await page.getByTestId('challan-action-pay').click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /paid/i })).toBeVisible();
  await expect(page.getByTestId('challan-status')).toHaveText(/paid/i);
  await expect(page.getByTestId('challan-terminal')).toBeVisible();

  // PDF downloads with the challan reference as the filename.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('challan-pdf').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^CHL-\d{4}-\d{6}\.pdf$/);
});
