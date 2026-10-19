import { test, expect } from '@playwright/test';

/**
 * Phase 9 — Audit trail & activity logs.
 *
 * Guest redirect verifiable now. Authenticated flows (log renders, filter, expand
 * before/after) require a seeded admin account and are skip-gated on
 * E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD. Append-only is guaranteed at the DB (verified
 * separately: audit_log has only a SELECT policy).
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

test('guest is redirected from /audit to /login', async ({ page }) => {
  await page.goto('/audit');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('admin sees the audit trail with filters', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/audit');
  await expect(page.getByRole('heading', { name: 'Audit Trail' })).toBeVisible();
  await expect(page.getByTestId('audit-apply')).toBeVisible();
  await expect(page.getByTestId('data-table')).toBeVisible();
});

test('admin can expand an audit entry to see before/after', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/audit');
  const firstExpand = page.getByTestId(/^expand-/).first();
  await firstExpand.click();
  await expect(page.getByTestId('audit-detail')).toBeVisible();
});
