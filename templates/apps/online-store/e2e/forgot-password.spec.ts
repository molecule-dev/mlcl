import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders the reset-request form', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible()
  })

  test('submitting the form posts to /api/users/forgot-password and returns 200', async ({
    page,
  }) => {
    const { email } = await signup(page)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/forgot-password')
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/users\/forgot-password/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      (async () => {
        await page.locator('input[type="email"]').fill(email)
        await page.getByRole('button', { name: /send/i }).click()
      })(),
    ])
    expect(resp.status()).toBe(200)
  })

  test('forgot-password endpoint returns 200 for unknown email (no user enumeration)', async ({
    page,
  }) => {
    const resp = await page.request.post(API_BASE + '/users/forgot-password', {
      data: { email: uniqueEmail('nobody') },
    })
    expect(resp.status()).toBe(200)
  })
})
