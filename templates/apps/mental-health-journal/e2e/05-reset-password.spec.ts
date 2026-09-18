import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, uniqueEmail } from './_helpers'

test.describe('/reset-password', () => {
  test('renders reset password form fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/reset code/i)).toBeVisible()
    await expect(page.getByLabel(/new password/i)).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
  })

  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const f = page.getByLabel(/email/i)
    await f.fill('foo@example.com')
    await expect(f).toHaveValue('foo@example.com')
  })

  test('reset code field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const f = page.getByLabel(/reset code/i)
    await f.fill('abc123')
    await expect(f).toHaveValue('abc123')
  })

  test('new password field accepts and masks input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const f = page.getByLabel(/new password/i)
    await f.fill('NewPass123!')
    await expect(f).toHaveAttribute('type', 'password')
  })

  test('"Back to sign in" link points to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const link = page.getByRole('link', { name: /back to sign in/i })
    expect(await link.getAttribute('href')).toBe('/login')
  })

  test('submitting reset form with invalid token hits POST /api/users/reset-password', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password')
      await page.getByLabel(/email/i).fill(uniqueEmail('reset'))
      await page.getByLabel(/reset code/i).fill('not-a-real-token')
      await page.getByLabel(/new password/i).fill('NewPass123!')
      await page.getByLabel(/confirm password/i).fill('NewPass123!')
      const respWait = page.waitForResponse((r) => r.url().includes('/api/users/reset-password'), {
        timeout: 15_000,
      })
      await page.getByRole('button', { name: /reset password/i }).click()
      await respWait
    })
    const found = reqs.find(
      (r) => r.method === 'POST' && r.url.includes('/api/users/reset-password'),
    )
    expect(found, 'reset-password POST observed').toBeDefined()
    expect(found!.status, 'invalid token rejected').toBeGreaterThanOrEqual(400)
  })
})
