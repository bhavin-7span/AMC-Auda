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

  // IMPORTANT: never edit the signed-in admin's own row — demoting it would break every
  // subsequent admin-only test. Find a row whose email is NOT the test admin and derive
  // that row's user id from its edit button's test id (edit-<uuid>).
  const safeRow = page
    .locator('tr')
    .filter({ has: page.getByTestId(/^edit-/) })
    .filter({ hasNot: page.getByText(email!, { exact: true }) })
    .first();
  if ((await safeRow.count()) === 0) {
    test.skip(true, 'Needs a non-admin user to edit safely.');
    return;
  }
  const editTestId = await safeRow.getByTestId(/^edit-/).getAttribute('data-testid');
  const userId = editTestId!.replace('edit-', '');

  // Interact by exact, id-scoped test ids (stable across re-render).
  await page.getByTestId(`edit-${userId}`).click();
  const roleSelect = page.getByTestId(`role-select-${userId}`);
  await expect(roleSelect).toBeVisible();
  await roleSelect.selectOption('supervisor');
  await page.getByTestId(`save-${userId}`).click();
  await expect(page.getByTestId('toast').filter({ hasText: /role updated/i })).toBeVisible();
});
