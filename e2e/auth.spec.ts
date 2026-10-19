import { test, expect } from '@playwright/test';

/**
 * Phase 2 — Authentication.
 *
 * Failure-path and routing tests run without credentials. The happy-path login test is
 * written but SKIPPED until a seeded admin account is provided via env vars
 * (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD). It auto-enables when they are set.
 */

test('login page renders the form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByTestId('login-form')).toBeVisible();
  await expect(page.getByTestId('login-email')).toBeVisible();
  await expect(page.getByTestId('login-password')).toBeVisible();
});

test('invalid credentials show a generic error (no account enumeration)', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('nobody@example.com');
  await page.getByTestId('login-password').fill('wrong-password-123');
  await page.getByTestId('login-submit').click();

  const error = page.getByTestId('login-error');
  await expect(error).toBeVisible();
  // Generic message must not reveal whether the email or the password was wrong.
  await expect(error).toHaveText(/invalid email or password/i);
  // Still on the login page.
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('empty submit is rejected client-side (required fields)', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-submit').click();
  // Native required validation keeps us on the page with the form present.
  await expect(page.getByTestId('login-form')).toBeVisible();
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test('admin can sign in and reach the dashboard', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');

  await page.goto('/login');
  await page.getByTestId('login-email').fill(email!);
  await page.getByTestId('login-password').fill(password!);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/dashboard(\?|$)/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByTestId('account-email')).toContainText(email!);
});
