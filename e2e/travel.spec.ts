import { test, expect } from '@playwright/test';

/**
 * Phase 5.8 — Travel/activity report.
 *
 * Guest redirect verifiable now. Authenticated flows (form renders, route-tracking-off
 * banner, route result) require a seeded admin account and are skip-gated.
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

test('guest is redirected from /inspections/travel to /login', async ({ page }) => {
  await page.goto('/inspections/travel');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('admin sees the travel report form', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/inspections/travel');
  await expect(page.getByRole('heading', { name: 'Travel & Activity' })).toBeVisible();
  await expect(page.getByTestId('travel-user')).toBeVisible();
});
