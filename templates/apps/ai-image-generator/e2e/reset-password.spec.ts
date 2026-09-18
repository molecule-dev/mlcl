import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('new-password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token')
    const tb = page.getByLabel(/New password/i)
    await tb.fill('NewPass123!')
    await expect(tb).toHaveValue('NewPass123!')
  })

  test('confirm-password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token')
    const tb = page.getByLabel(/Confirm password/i)
    await tb.fill('NewPass123!')
    await expect(tb).toHaveValue('NewPass123!')
  })

  test('"Save new password" issues PUT /api/users/password (or /api/users/reset-password)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password?token=invalid-test-token')
    await page.getByLabel(/New password/i).fill('NewPass123!')
    await page.getByLabel(/Confirm password/i).fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Save new password/i }).click()
      // expect call to fire even if token invalid; we only assert the request was made
      await page.waitForTimeout(3000)
    })
    expect(
      reqs.some(
        (r) =>
          /\/api\/users\/(password|reset-password|reset)/.test(r.url) &&
          (r.method === 'PUT' || r.method === 'POST'),
      ),
    ).toBeTruthy()
  })

  test('"Back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=t')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('"Back to home" link goes to /', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=t')
    await page.getByRole('link', { name: /Back to home/i }).click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
  })
})
