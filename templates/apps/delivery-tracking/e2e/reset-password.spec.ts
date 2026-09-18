import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders the reset-password form fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('heading', { name: /Choose a new password/i })).toBeVisible()
    await expect(page.getByLabel(/Email Address/i)).toBeVisible()
    await expect(page.getByLabel(/Reset Token/i)).toBeVisible()
    await expect(page.getByLabel(/New Password/i)).toBeVisible()
  })

  test('email + token are pre-filled from query params', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=foo@bar.test&token=abc123')
    await expect(page.getByLabel(/Email Address/i)).toHaveValue('foo@bar.test')
    await expect(page.getByLabel(/Reset Token/i)).toHaveValue('abc123')
  })

  test('"Back to sign in" link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('submitting with bad token fires POST /api/users/reset-password (captureNetwork)', async ({
    page,
  }) => {
    await page.goto(
      APP_BASE + '/reset-password?email=bad-recipient@parcel.test&token=invalid-token-12345',
    )
    await page.getByLabel(/New Password/i).fill('NewPass123!')
    // Wait for form to be interactive.
    await page.waitForLoadState('domcontentloaded')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^Reset Password$/i }).click()
      // Either the POST surfaces a 4xx (bad token) or the form re-renders.
      await page
        .waitForResponse(
          (resp) =>
            /\/users\/reset-password/.test(resp.url()) && resp.request().method() === 'POST',
          { timeout: 10_000 },
        )
        .catch(() => null)
    })
    const resetReq = reqs.find((r) => r.method === 'POST' && /\/users\/reset-password/.test(r.url))
    expect(resetReq, 'POST /api/users/reset-password should fire on submit').toBeTruthy()
    // Bad token should NOT succeed — a 4xx is the expected outcome.
    expect(resetReq?.status, 'invalid token should NOT return 2xx').toBeGreaterThanOrEqual(400)
  })
})
