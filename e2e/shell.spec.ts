import { test, expect } from '@playwright/test';

/**
 * Shell behavior under route protection (Phase 2).
 *
 * The dashboard route group now requires authentication. As an unauthenticated guest,
 * hitting a protected route must redirect to /login (the real gate is backend RLS/RPC;
 * this redirect is the first line of defense). Authenticated shell rendering (role-aware
 * nav, account area) is covered once a seeded test account is available — see
 * auth.spec.ts for the pending happy-path.
 */

test('guest is redirected from /dashboard to /login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page.getByTestId('login-form')).toBeVisible();
});

test('login redirect preserves the intended destination', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/next=%2Fdashboard/);
});
