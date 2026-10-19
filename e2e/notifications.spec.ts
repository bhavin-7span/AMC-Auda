import { test, expect } from '@playwright/test';

/**
 * Phase 10 — Notifications, escalation & system health.
 *
 * Guest redirect verifiable now. Authenticated flows (template/rule managers, add forms,
 * system health widgets) require a seeded admin account and are skip-gated on
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

test('guest is redirected from /notifications to /login', async ({ page }) => {
  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('guest is redirected from /system to /login', async ({ page }) => {
  await page.goto('/system');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('admin sees notification templates and escalation rules', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/notifications');
  await expect(page.getByTestId('templates-section')).toBeVisible();
  await expect(page.getByTestId('rules-section')).toBeVisible();
});

test('admin can open the add-template form', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/notifications');
  await page.getByTestId('add-template').click();
  await expect(page.getByTestId('template-form')).toBeVisible();
});

test('admin sees system health widgets', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await login(page);
  await page.goto('/system');
  await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible();
  await expect(page.getByTestId('health-counts')).toBeVisible();
  await expect(page.getByTestId('health-sync')).toBeVisible();
});
