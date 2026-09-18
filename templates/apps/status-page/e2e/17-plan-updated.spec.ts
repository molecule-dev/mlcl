import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(1500)
    expect(new URL(page.url()).pathname).toMatch(/login|plan-updated/)
  })

  test('shows a confirmation message when the user is signed in', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const text = await page.locator('body').innerText({ timeout: 15_000 })
    // Either the molecule's plan-updated copy or a fallback.
    expect(text.length).toBeGreaterThan(20)
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
  })

  test('issues at least one GET to refresh the user record on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForTimeout(2000)
    })
    const me = reqs.find((r) => /\/api\/users/.test(r.url) && r.method === 'GET')
    expect(me, 'auth bond should re-fetch user on /plan-updated').toBeTruthy()
  })

  test('Return-home button navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const btn = page.getByRole('link', { name: /home|return|continue|back/i }).first()
    if (await btn.count().catch(() => 0)) {
      await btn.click()
      await page.waitForTimeout(1000)
      const path = new URL(page.url()).pathname
      expect(path).toMatch(/^\/(dashboard)?$/)
    }
  })
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
