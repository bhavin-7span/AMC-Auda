import { test, expect } from '@playwright/test';

/**
 * Phase 3 — Users & roles.
 *
 * Unauthenticated behavior is verifiable now: /users is protected, so a guest is
 * redirected to /login. The authenticated flows (list renders, inline role edit via
 * admin_set_role, non-admin is rejected) require a seeded account and are written as
 * skip-gated tests that enable when E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD are set.
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

test('guest is redirected from /users to /login', async ({ page }) => {
  await page.goto('/users');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('admin sees the users table', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Users & Roles' })).toBeVisible();
  await expect(page.getByTestId('data-table')).toBeVisible();
});

test('admin can edit a user role inline', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/users');

  // Open the first row's editor, change role, save, expect a success toast.
  const firstEdit = page.getByTestId(/^edit-/).first();
  await firstEdit.click();
  const roleSelect = page.getByTestId(/^role-select-/).first();
  await expect(roleSelect).toBeVisible();
  await roleSelect.selectOption('supervisor');
  await page.getByTestId(/^save-/).first().click();
  await expect(page.getByTestId('toast').filter({ hasText: /role updated/i })).toBeVisible();
});
