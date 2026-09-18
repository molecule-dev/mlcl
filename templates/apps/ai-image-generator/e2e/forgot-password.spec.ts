import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const tb = page.getByLabel(/Email address/i)
    await tb.fill('test@example.com')
    await expect(tb).toHaveValue('test@example.com')
  })

  test('"Send reset link" issues POST /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/Email address/i).fill('user-' + Date.now() + '@example.com')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send reset link/i }).click()
      // backend may return 200 or 202; we just need the call to fire
      await page.waitForTimeout(2000)
    })
    expect(
      reqs.some((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST'),
    ).toBeTruthy()
  })

  test('"Back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('"Back to home" link goes to /', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to home/i }).click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
  })
})
