import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors } from './_helpers.js'

test.describe('pricing page', () => {
  test('renders the pricing heading', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('fetches /api/billing/tiers from the backend', async ({ page }) => {
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some(
        (r) => r.method === 'GET' && /\/billing\/tiers\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('lists at least one plan tile', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(1500)
    const headings = await page.getByRole('heading').count()
    expect(headings).toBeGreaterThan(0)
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
