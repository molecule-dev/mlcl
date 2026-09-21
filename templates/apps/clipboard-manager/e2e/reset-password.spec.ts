/**
 * /reset-password — POST /api/users/reset-password with a token from the
 * forgot-password flow. We simulate the email-token handoff by reading
 * the token directly out of the database via the same handler the
 * email link would carry.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

async function obtainResetToken(
  page: import('@playwright/test').Page,
  email: string,
): Promise<string | null> {
  // Trigger the forgot flow which writes resetToken into usersSecrets.
  const res = await page.request.post(`${API_BASE}/users/forgot-password`, {
    data: { email },
    failOnStatusCode: false,
  })
  if (res.status() >= 400) return null
  // The endpoint never returns the token (mailgun delivers it). For
  // tests we read it directly from the API's debug endpoint if exposed,
  // or fall back to invalid-token behaviour assertions.
  const debug = await page.request.get(
    `${API_BASE}/_debug/last-reset-token?email=${encodeURIComponent(email)}`,
    {
      failOnStatusCode: false,
    },
  )
  if (debug.status() === 200) {
    const body = (await debug.json()) as { token?: string }
    return body.token ?? null
  }
  return null
}

test.describe('reset password page', () => {
  test('renders email + token + new-password inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#token')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
  })

  test('email + token are pre-filled from query string', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=alice@example.com&token=abc123')
    await expect(page.locator('input#email')).toHaveValue('alice@example.com')
    await expect(page.locator('input#token')).toHaveValue('abc123')
  })

  test('submitting an invalid token surfaces an error and stays on page', async ({ page }) => {
    // Expected 4xx: the rejected reset POST surfaces as a browser console
    // resource error; the inline error banner below is the real assertion.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password')
      await page.locator('input#email').fill(uniqueEmail('reset-bad'))
      await page.locator('input#token').fill('not-a-real-token')
      await page.locator('input#password').fill('NewPass!1234')
      await page.locator('form button[type="submit"]').click()
      await page.waitForTimeout(2500)
    })
    await expect(page).toHaveURL(/\/reset-password/)
    await expect(page.locator('[data-mol-id="reset-error"], [role="alert"]').first()).toBeVisible()
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url))
    expect(post).toBeTruthy()
    expect(post!.status).toBeGreaterThanOrEqual(400)
  })

  test('reset-password endpoint exists and rejects empty body', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: {},
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('forgot-password issues a token whose at-rest digest cannot reset (hash-at-rest contract)', async ({
    page,
  }) => {
    // The platform stores only sha256(token) in usersSecrets (see
    // hashResetToken in the user resource): the raw token exists solely in
    // the reset email, so no test without an inbox can complete the final
    // leg. The old "read token from /api/_debug/last-reset-token → reset →
    // log in" round-trip has been STALE ever since tokens were hashed at
    // rest — it submitted the stored digest and got 401.
    // This test pins the security contract instead:
    //   1. forgot-password issues a token (debug endpoint returns it),
    //   2. the value readable from storage is a 64-hex sha256 digest,
    //   3. submitting that digest is rejected 401 with an inline error —
    //      a DB reader cannot replay it against the reset endpoint.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
    const email = uniqueEmail('reset-e2e')
    await signup(page, email)

    // Sign out and request forgot
    const token = await obtainResetToken(page, email)
    test.skip(
      token === null,
      'No debug endpoint exposed; the email-delivered token cannot be read in-process.',
    )

    // The stored value is a hex sha256 digest — NOT a usable credential.
    expect(token).toMatch(/^[0-9a-f]{64}$/)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password')
      await page.locator('input#email').fill(email)
      await page.locator('input#token').fill(token!)
      await page.locator('input#password').fill('FreshPass!9876')
      await page.locator('form button[type="submit"]').click()
      await page.waitForTimeout(2500)
    })
    await expect(page).toHaveURL(/\/reset-password/)
    await expect(page.locator('[data-mol-id="reset-error"], [role="alert"]').first()).toBeVisible()
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url))
    expect(post).toBeTruthy()
    expect(post!.status).toBe(401)
  })
})
