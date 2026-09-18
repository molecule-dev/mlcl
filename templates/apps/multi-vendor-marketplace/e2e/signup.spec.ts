import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/signup', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel(/email/i).first().fill('test@example.com')
    await expect(page.getByLabel(/email/i).first()).toHaveValue('test@example.com')
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByLabel(/^password$/i)
      .first()
      .fill('Pass1234!')
    await expect(page.getByLabel(/^password$/i).first()).toHaveValue('Pass1234!')
  })

  test('submit POSTs /api/users and leaves /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = 'sup-' + Date.now() + '@test.local'
    await page.getByLabel(/First name/i).fill('Test')
    await page.getByLabel(/Last name/i).fill('User')
    await page.getByLabel(/email/i).first().fill(email)
    await page
      .getByLabel(/^password$/i)
      .first()
      .fill('Pass1234!')
    await page.getByLabel(/Confirm password/i).fill('Pass1234!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Join the marketplace|Open my shop/i }).click()
      await page.waitForURL((u) => !u.pathname.includes('/signup'), { timeout: 15000 })
    })
    expect(page.url()).not.toMatch(/\/signup/)
    expect(reqs.some((r) => /\/api\/users/.test(r.url) && r.method === 'POST')).toBeTruthy()
  })
})
