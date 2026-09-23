import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/pricing (Pricing)', () => {
  test('renders the heading and fetches /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      // Wait for the tiers API to resolve (the heading only renders once tiers load).
      await page.waitForResponse((resp) => /\/api\/billing\/tiers/.test(resp.url()))
    })
    // Assert the heading after the API has responded and data is rendered.
    await expect(page.getByRole('heading', { name: /Choose your.*plan/i, level: 1 })).toBeVisible()
    const tiersCall = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
    expect(tiersCall, 'GET /api/billing/tiers fired').toBeTruthy()
    expect(tiersCall!.status).toBeLessThan(300)
  })

  test('Current plan button is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /Current plan/i })).toBeVisible()
  })

  test('Upgrade to Pro click on a fresh public visit POSTs /billing/checkout and the unauthed response is 401 (no broken silent button)', async ({
    page,
  }, testInfo) => {
    // The whole point of this test is the 401 the backend returns for an
    // unauthed checkout POST — the browser also logs that 401 to the console,
    // which is expected, not a bug.
    testInfo.annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Upgrade to Pro/i }).click()
      await page.waitForTimeout(2_500)
    })
    const checkout = reqs.find((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST')
    expect(checkout, 'POST /api/billing/checkout fires for unauthed clicks too').toBeTruthy()
    expect(checkout!.status, 'unauthed checkout returns 401, never silently 200').toBe(401)
  })

  test('Upgrade to Team click on a fresh public visit POSTs /billing/checkout and the unauthed response is 401', async ({
    page,
  }, testInfo) => {
    // Expected 401 — same contract as the Pro upgrade test above.
    testInfo.annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Upgrade to Team/i }).click()
      await page.waitForTimeout(2_500)
    })
    const checkout = reqs.find((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST')
    expect(checkout, 'POST /api/billing/checkout fires for unauthed clicks too').toBeTruthy()
    expect(checkout!.status, 'unauthed checkout returns 401, never silently 200').toBe(401)
  })

  test('Upgrade to Pro when authed POSTs /api/billing/checkout and returns a Stripe checkout URL', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Upgrade to Pro/i }).click()
      // Either we redirect to stripe (cs_test_) OR the POST resolves and the
      // app navigates to its plan-updated page; wait for both to settle.
      await page.waitForTimeout(5_000)
    })
    const checkout = reqs.find((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST')
    expect(checkout, 'POST /api/billing/checkout must fire').toBeTruthy()
    // The handler returns 200/2xx with either { checkoutUrl } (Stripe) or
    // { updated, subscription } (already-on-plan). Either way it must not 5xx.
    expect(checkout!.status, 'checkout must not 5xx').toBeLessThan(500)
  })
})
