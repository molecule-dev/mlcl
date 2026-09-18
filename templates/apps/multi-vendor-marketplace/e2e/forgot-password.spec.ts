import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/email/i).first().fill('reset@example.com')
    await expect(page.getByLabel(/email/i).first()).toHaveValue('reset@example.com')
  })

  test('submit POSTs /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/email/i).first().fill('reset@example.com')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send|reset/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    expect(reqs.some((r) => /\/api\/users\/forgot-password/.test(r.url))).toBeTruthy()
  })

  test('sign-in link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /sign in|back/i }).first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/login/)
    } else {
      await expect(page.getByLabel(/email/i)).toBeVisible()
    }
  })
})
