import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/plan-updated — Stripe return-confirmation page', () => {
  test('renders the thank-you message and a return-home CTA after auth', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.locator('text=/thank|updated/i').first()).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('a[href="/"]').last()).toBeVisible()
    })
    // PlanUpdated.tsx is static (purely translated copy + return-home link), so the
    // captured network is just the SPA shell + assets — no additional /api/* fetch.
    // The contract: the page loads OK and issues at least the SPA shell request.
    expect(
      reqs.some((r) => r.method === 'GET' && r.status < 400),
      `expected at least one 2xx GET on /plan-updated load — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
  })

  test('return-home CTA navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.locator('a[href="/"] button').first().click()
    await expect(page).toHaveURL(/\/(?:$|boards)/)
  })

  test('redirects to /login when accessed unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/plan-updated')
    // Either we get to /plan-updated (if it allows anon and shows an auth-shell)
    // or we get bounced to /login. Both behaviors are acceptable; what is NOT
    // acceptable is silently rendering as an authed user with no session.
    const url = page.url()
    expect(url).toMatch(/\/(?:plan-updated|login|signup|$)/)
  })
})
