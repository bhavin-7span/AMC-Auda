import { test, expect } from '@playwright/test';

/**
 * Map + evidence rendering verification.
 *
 * Logs in as the seeded admin, opens an inspection that has geo-tagged evidence, and
 * confirms (a) the Leaflet/OSM map renders real tiles and (b) a signed evidence image
 * actually loads. Skip-gated on E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
 */

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run.');

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email!);
  await page.getByTestId('login-password').fill(password!);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/dashboard(\?|$)/);
}

test('inspection detail renders an OSM map with tiles', async ({ page }) => {
  await login(page);
  await page.goto('/inspections');
  // Open the inspection that has evidence/location.
  await page.getByRole('link', { name: 'INS-2026-000002' }).click();
  await expect(page.getByTestId('inspection-ref')).toHaveText('INS-2026-000002');

  // Leaflet renders an OSM tile layer; at least one tile <img> from tile.openstreetmap.org.
  const tile = page.locator('img.leaflet-tile').first();
  await expect(tile).toBeVisible({ timeout: 10_000 });
  await expect(tile).toHaveJSProperty('complete', true);
});

test('inspection evidence photo loads from a signed URL', async ({ page }) => {
  await login(page);
  await page.goto('/inspections');
  await page.getByRole('link', { name: 'INS-2026-000002' }).click();

  await expect(page.getByTestId('evidence-list')).toBeVisible();
  const img = page.getByTestId(/^evidence-img-/).first();
  await expect(img).toBeVisible();
  // The image actually decoded (naturalWidth > 0 means it loaded, not broken).
  await expect
    .poll(async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth), { timeout: 10_000 })
    .toBeGreaterThan(0);
});
