import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('renders the planUpdated message + thankYou h2 stack', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    const headings = page.getByRole('heading', { level: 2 })
    await expect.poll(async () => headings.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(2)
  })

  test('Return home button navigates to /', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('button', { name: /Return home|Home|Continue/i }).click()
    await expect(page).toHaveURL(/(\/$|\/dashboard)/)
  })

  test('the wrapping link points to /', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    const link = page
      .getByRole('link')
      .filter({ has: page.getByRole('button', { name: /Return home|Home|Continue/i }) })
      .first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    expect(await link.getAttribute('href')).toBe('/')
  })

  test('plan-updated does not fire any /api/billing/* call on its own', async ({ page }) => {
    // The billing webhook fires in Stripe's pipeline, not on this page. The
    // page itself is a static thank-you. Capture and assert no billing calls.
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const billingCalls = reqs.filter((r) => /\/api\/billing\//.test(r.url))
    expect(billingCalls, 'plan-updated must not retry billing on its own').toEqual([])
  })
})
