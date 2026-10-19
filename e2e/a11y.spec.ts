import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Phase 12.3 — Accessibility pass (automated).
 *
 * Runs axe-core against guest-reachable surfaces (login, UI-kit showcase). Asserts no
 * serious/critical WCAG violations. Full WCAG conformance still requires manual assistive-
 * technology testing beyond automated checks — this catches the mechanical issues
 * (labels, contrast, roles, names). Authenticated pages are axe-checked under a skip-gate.
 */

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

async function assertNoSeriousViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  // Surface details in the failure message for quick triage.
  expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.length })), null, 2)).toEqual([]);
}

test('login page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByTestId('login-form')).toBeVisible();
  await assertNoSeriousViolations(page);
});

test('UI kit showcase has no serious accessibility violations', async ({ page }) => {
  await page.goto('/kit');
  await expect(page.getByRole('heading', { name: 'UI Kit' })).toBeVisible();
  await assertNoSeriousViolations(page);
});

test('dashboard has no serious accessibility violations (authenticated)', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email!);
  await page.getByTestId('login-password').fill(password!);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/dashboard(\?|$)/);
  await assertNoSeriousViolations(page);
});
