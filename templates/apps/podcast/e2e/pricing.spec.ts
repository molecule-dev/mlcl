import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors } from './_helpers.js'

test.describe('pricing page', () => {
  test('renders the heading with the app name', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('initial load fetches /api/billing/tiers', async ({ page }) => {
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
    })
    expect(
      requests.some((r) => /\/api\/billing\/tiers/.test(r.url) && r.status === 200),
    ).toBeTruthy()
  })

  test('renders the Free / Pro / Team tier cards', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^free$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^pro$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^team$/i })).toBeVisible()
  })

  test('lists per-tier limits including episodes/shows/subscriptions', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/episodes/i).first()).toBeVisible()
    await expect(page.getByText(/shows/i).first()).toBeVisible()
    await expect(page.getByText(/subscriptions/i).first()).toBeVisible()
  })

  test('all 3 tier limit lists include episodes/shows/subscriptions/advanced/export rows', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/pricing')
    // Each tier card renders 5 limit rows.
    await expect(page.getByText(/advanced features/i).first()).toBeVisible()
    await expect(page.getByText(/data export/i).first()).toBeVisible()
  })

  test('public pricing page is reachable without authentication', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    // No redirect to /login should happen.
    await expect(page).toHaveURL(/\/pricing$/)
  })

  test('pricing page renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
  })
})
