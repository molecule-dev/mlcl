import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('billing page', () => {
  test('renders Billing heading and key sections', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await expect(page.getByRole('heading', { name: /billing/i }).first()).toBeVisible()
    await expect(page.locator('[data-mol-id="billing-manage-seats"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="billing-upgrade"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="billing-update-card"]')).toBeVisible()
  })

  test('plan / usage / invoices endpoints return 200 on load', async ({ page }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/billing')
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some(
        (r) => r.method === 'GET' && /\/billing\/plan\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
    expect(
      requests.some(
        (r) => r.method === 'GET' && /\/billing\/usage\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
    expect(
      requests.some(
        (r) => r.method === 'GET' && /\/billing\/invoices\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('Manage seats issues POST /api/billing/seats', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await page.waitForTimeout(1500)
    const requests = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="billing-manage-seats"]').click()
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some((r) => r.method === 'POST' && /\/billing\/seats\b/.test(r.url)),
    ).toBeTruthy()
  })

  test('Upgrade-to-Team issues POST /api/billing/upgrade', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await page.waitForTimeout(1500)
    // Don't actually navigate to Stripe — intercept the request and abort it.
    // `page.on('request')` hands back a Request, which cannot be aborted; only
    // a routed request can, so the interception has to go through page.route.
    await page.route(/checkout\.stripe\.com/, (route) => route.abort().catch(() => {}))
    const requests = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="billing-upgrade"]').click()
      await page.waitForTimeout(2000)
    })
    expect(
      requests.some((r) => r.method === 'POST' && /\/billing\/upgrade\b/.test(r.url)),
    ).toBeTruthy()
  })

  test('Update card issues POST /api/billing/card-link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await page.waitForTimeout(1500)
    const requests = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="billing-update-card"]').click()
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some((r) => r.method === 'POST' && /\/billing\/card-link\b/.test(r.url)),
    ).toBeTruthy()
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/billing')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
