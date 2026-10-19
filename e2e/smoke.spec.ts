import { test, expect } from '@playwright/test';

/**
 * Phase 0 smoke tests: the app boots and can reach the existing Auda RFP backend.
 */

test('home page renders the app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /AUDA FieldTrack/i })).toBeVisible();
});

test('health endpoint connects to the Auda RFP backend', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status(), await res.text()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.backend).toBe('auda-rfp');
});
