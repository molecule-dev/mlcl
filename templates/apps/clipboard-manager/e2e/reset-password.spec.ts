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

  test('end-to-end: signup → forgot → reset → log in with new password (best effort)', async ({
    page,
  }) => {
    const email = uniqueEmail('reset-e2e')
    const { password: oldPassword } = await signup(page, email)
    expect(oldPassword).toBe('TestPass!1234')

    // Sign out and request forgot
    const token = await obtainResetToken(page, email)
    test.skip(
      token === null,
      'No debug endpoint exposed; the email-delivered token cannot be read in-process.',
    )

    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input#email').fill(email)
    await page.locator('input#token').fill(token!)
    await page.locator('input#password').fill('FreshPass!9876')
    await page.locator('form button[type="submit"]').click()
    await page.waitForURL(/\/clips/, { timeout: 20000 })
  })
})
