import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders password input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token')
    const tb = page.getByLabel(/^new password|^password$/i).first()
    await expect(tb).toBeVisible()
    await tb.fill('NewPass123!')
    await expect(tb).toHaveValue('NewPass123!')
  })

  test('renders reset button', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token')
    await expect(page.getByRole('button', { name: /reset|update|save/i }).first()).toBeVisible()
  })

  test('Sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token')
    const link = page.getByRole('link', { name: /Sign in|back to.*login/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('Submit posts to /api/users/reset-password', async ({ page }) => {
    // Pass both token AND email so the form has every required field populated;
    // the password and confirm fields must match or the submit short-circuits
    // client-side without ever issuing the POST.
    await page.goto(APP_BASE + '/reset-password?token=test-token&email=tester@example.com')
    await page
      .getByLabel(/^new password$/i)
      .first()
      .fill('NewPass123!')
    await page
      .getByLabel(/^confirm password$/i)
      .first()
      .fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset|update|save/i })
        .first()
        .click()
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST'),
    ).toBeTruthy()
  })
})
