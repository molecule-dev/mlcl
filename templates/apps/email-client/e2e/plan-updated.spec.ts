/**
 * Per-page spec for /plan-updated (Plan-updated confirmation). Public.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('GET /plan-updated renders a confirmation page', async ({ page }) => {
  await page.goto(APP_BASE + '/plan-updated')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('GET /plan-updated renders confirmation copy', async ({ page }) => {
  await page.goto(APP_BASE + '/plan-updated')
  await page.waitForLoadState('networkidle')
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.length).toBeGreaterThan(0)
  expect(text).not.toMatch(/coming soon|placeholder|tbd|under construction|lorem ipsum/i)
})

test('GET /plan-updated exposes at least one return link', async ({ page }) => {
  await page.goto(APP_BASE + '/plan-updated')
  const links = await page.locator('a').count()
  expect(links).toBeGreaterThan(0)
})

test.describe('/plan-updated — checkout return', () => {
  test('confirms the purchase when the provider returns with a payment id', async ({ page }) => {
    await signup(page)
    const confirmed = page
      .waitForResponse((r) => /\/verify-payment\//.test(r.url()), { timeout: 20_000 })
      .catch(() => null)
    // The provider's success_url lands on the APP origin, so this page is what
    // finishes the purchase — without the call the paid plan is never granted.
    await page.goto(APP_BASE + '/plan-updated?provider=stripe&sessionId=cs_test_e2e')
    expect(await confirmed).not.toBeNull()
  })
})
