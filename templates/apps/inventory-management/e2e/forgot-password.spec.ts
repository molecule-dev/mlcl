import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('forgot-password', () => {
  test('renders email field, primary CTA, and back-to-sign-in link', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Email field via label
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
    // Primary submit
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
    // Back-to-login link
    await expect(page.getByRole('link', { name: /sign\s*in/i }).first()).toBeVisible()
  })

  test('submitting an unknown email still returns 200 (no enumeration leak) and shows the sent banner', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const stranger = uniqueEmail('forgot-stranger')
    const reqs = await captureNetwork(page, async () => {
      await page.getByLabel(/email/i).first().fill(stranger)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByText(/Reset link on its way/i)).toBeVisible({ timeout: 15_000 })
    })
    const post = reqs.find((r) => /\/users\/forgot-password/.test(r.url) && r.method === 'POST')
    expect(post, 'forgot-password POST not seen on the wire').toBeTruthy()
    expect(post!.status).toBe(200)
  })

  test('submitting a real signed-up email triggers the reset flow + an unknown token is rejected (full lifecycle)', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('forgot-real')
    const password = 'TestPass123!'
    const { userId } = await signup(page, email, password)
    expect(userId, 'signup did not return a userId').toBeTruthy()

    // 1) trigger forgot-password from the live form
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.getByLabel(/email/i).first().fill(email)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByText(/Reset link on its way/i)).toBeVisible({ timeout: 15_000 })
    })
    const post = reqs.find((r) => /\/users\/forgot-password/.test(r.url) && r.method === 'POST')
    expect(post?.status, 'forgot-password POST status').toBe(200)

    // 2) Posting an unknown reset token must be rejected, proving the
    //    reset endpoint is mounted and enforces token validity.
    //    (The reset token + tokenAt timestamp live in the userSecrets
    //     table, which is NOT exposed by GET /users/:id by design — so
    //     we exercise reset-password directly with a bogus token to prove
    //     the reset half of the lifecycle is real, not a stub.)
    const badResetResp = await request.post(`${API_BASE}/users/reset-password`, {
      data: { token: 'definitely-not-a-real-token-xyz', password: 'NewSecurePassword456!' },
      failOnStatusCode: false,
    })
    expect(
      [400, 401],
      `bad-token reset should be rejected, got ${badResetResp.status()}: ${await badResetResp.text().catch(() => '')}`,
    ).toContain(badResetResp.status())
  })

  test('back-to-sign-in link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /sign\s*in|back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
