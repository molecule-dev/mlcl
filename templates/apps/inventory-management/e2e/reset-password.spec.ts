import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork } from './_helpers.js'

test.describe('reset-password', () => {
  test('renders heading + new-password fields when no token is present (form is just disabled)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByLabel(/new password/i).first()).toBeVisible()
    await expect(page.getByLabel(/confirm/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i })).toBeDisabled()
    await expect(page.getByText(/Open the reset link from your email/i)).toBeVisible()
  })

  test('mismatched passwords surface a client-side error before contacting the API', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token-for-client-validation')
    await page
      .getByLabel(/new password/i)
      .first()
      .fill('Password123!')
    await page
      .getByLabel(/confirm/i)
      .first()
      .fill('DifferentPassword456!')
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByRole('alert')).toContainText(/passwords do not match/i)
  })

  test('too-short passwords surface a client-side error before contacting the API', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token-for-client-validation')
    await page
      .getByLabel(/new password/i)
      .first()
      .fill('shorty')
    await page
      .getByLabel(/confirm/i)
      .first()
      .fill('shorty')
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByRole('alert')).toContainText(/at least 8 characters/i)
  })

  test('an unknown token returns 400/401 from the real reset endpoint (no silent success)', async ({
    request,
  }) => {
    const res = await request.post(`${API_BASE}/users/reset-password`, {
      data: { token: 'token-that-was-never-issued-xyz', password: 'NewPassword789!' },
      failOnStatusCode: false,
    })
    expect([400, 401]).toContain(res.status())
  })

  test('back-to-sign-in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /sign\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('submitting with a token issues POST /users/reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=does-not-exist-token-for-test')
    await page
      .getByLabel(/new password/i)
      .first()
      .fill('AnotherPass123!')
    await page
      .getByLabel(/confirm/i)
      .first()
      .fill('AnotherPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /reset password/i }).click()
      // Either a 400/401 alert appears, or the page navigates away
      await expect
        .poll(
          async () =>
            (await page.locator('[role="alert"]').count()) > 0 ||
            !/\/reset-password/.test(page.url()),
        )
        .toBe(true)
    })
    const call = reqs.find((r) => /\/users\/reset-password$/.test(r.url) && r.method === 'POST')
    expect(call, 'POST /users/reset-password fired').toBeTruthy()
  })
})
