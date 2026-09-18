import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const tb = page.getByLabel(/email/i).first()
    await tb.fill('forgot@example.com')
    await expect(tb).toHaveValue('forgot@example.com')
  })

  test('submit POSTs /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/email/i).first().fill('forgot-user@example.com')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset|send|submit/i })
        .first()
        .click()
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST'),
    ).toBeTruthy()
  })

  test('Sign in link navigates back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /Sign in|back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
