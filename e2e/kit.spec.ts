import { test, expect } from '@playwright/test';

/**
 * Task 0.6 — shared UI kit components exercised on the /kit showcase page.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/kit');
  await expect(page.getByRole('heading', { name: 'UI Kit' })).toBeVisible();
});

test('widgets render', async ({ page }) => {
  await expect(page.getByTestId('widget')).toHaveCount(3);
});

test('map container renders', async ({ page }) => {
  await expect(page.getByTestId('map-container')).toBeVisible();
});

test('data table pages through server-style data', async ({ page }) => {
  await expect(page.getByTestId('data-table-range')).toHaveText('1–5 of 23');
  await expect(page.getByTestId('page-indicator')).toHaveText('Page 1 of 5');

  // Previous disabled on first page.
  await expect(page.getByTestId('page-prev')).toBeDisabled();

  await page.getByTestId('page-next').click();
  await expect(page.getByTestId('data-table-range')).toHaveText('6–10 of 23');
  await expect(page.getByTestId('page-indicator')).toHaveText('Page 2 of 5');
});

test('data table sorts by a sortable column', async ({ page }) => {
  // Default sort is ref asc → first row INS-...000001. Toggle to desc.
  await page.getByTestId('sort-ref').click();
  await expect(page.getByTestId('data-table-range')).toHaveText('1–5 of 23');
  // After desc sort, the highest ref (000023) should be on page 1.
  await expect(page.getByRole('cell', { name: 'INS-2026-000023' })).toBeVisible();
});

test('toasts show and can be dismissed', async ({ page }) => {
  await page.getByTestId('toast-success').click();
  const toast = page.getByTestId('toast').filter({ hasText: 'Saved successfully' });
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute('data-variant', 'success');

  await toast.getByRole('button', { name: 'Dismiss' }).click();
  await expect(toast).toHaveCount(0);
});

test('filter clear triggers an info toast', async ({ page }) => {
  await page.getByTestId('filter-clear').click();
  await expect(page.getByTestId('toast').filter({ hasText: 'Filters cleared' })).toBeVisible();
});
