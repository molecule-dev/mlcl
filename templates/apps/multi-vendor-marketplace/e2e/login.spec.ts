import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/login', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/email/i).first().fill('test@example.com')
    await expect(page.getByLabel(/email/i).first()).toHaveValue('test@example.com')
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByLabel(/^password$/i)
      .first()
      .fill('Pass1234!')
    await expect(page.getByLabel(/^password$/i).first()).toHaveValue('Pass1234!')
  })

  test('sign in POSTs /api/users/log-in', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = 'login-' + Date.now() + '@test.local'
    const pw = 'Pass1234!'
    await page.request.post(APP_BASE + '/api/users', {
      data: { email, password: pw, name: 'Test' },
    })
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/email/i).first().fill(email)
    await page
      .getByLabel(/^password$/i)
      .first()
      .fill(pw)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /sign in|log in/i })
        .first()
        .click()
      await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 })
    })
    expect(reqs.some((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')).toBeTruthy()
  })
})
