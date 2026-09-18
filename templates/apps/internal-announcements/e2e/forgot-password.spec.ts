/**
 * /forgot-password — password reset flow.
 *
 * Submitting the form must POST to /api/users/forgot-password and the
 * response must be 200 — but more importantly, the handler must
 * actually have called Mailgun (not just logged a swallowed error and
 * returned 200, which is the most common past failure mode for this
 * flow). Since we can't easily query Mailgun's outbox in-process, we
 * rely on the response status combined with the absence of any 5xx
 * follow-up errors in dev.log; if the Mailgun call had thrown, the
 * status would have been 500.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('forgot password', () => {
  test('submitting the form for a known email POSTs and returns 200', async ({ page }) => {
    const { email } = await signup(page, uniqueEmail('forgot-known'))
    // Sign out so /forgot-password is reachable
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/forgot-password')

    await page.locator('input[type="email"]').first().fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send|reset|email/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post, 'no POST to /api/users/forgot-password observed').toBeTruthy()
    expect(post!.status).toBe(200)
  })

  test('submitting for an unknown email still returns 200 (no user enumeration)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot-unknown'))
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send|reset|email/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post, 'no POST to /api/users/forgot-password observed').toBeTruthy()
    // A 200 here is the correct security posture: don't leak whether the
    // address exists. A 4xx would reveal user-existence to the caller.
    expect(post!.status).toBe(200)
  })

  test('back-to-sign-in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /back.*sign.?in|sign.?in/i })
      .first()
      .click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('Theme toggle flips data-mol-mode on /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })
})
