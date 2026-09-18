import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers'

test.describe('/forgot-password', () => {
  test('renders forgot password form', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  })

  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const f = page.getByLabel(/email/i)
    await f.fill('foo@example.com')
    await expect(f).toHaveValue('foo@example.com')
  })

  test('"Back to sign in" link points to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /back to sign in/i })
    expect(await link.getAttribute('href')).toBe('/login')
  })

  test('submitting the form hits POST /api/users/forgot-password', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.getByLabel(/email/i).fill(uniqueEmail('forgot'))
      const respWait = page.waitForResponse((r) => r.url().includes('/api/users/forgot-password'), {
        timeout: 15_000,
      })
      await page.getByRole('button', { name: /send reset link/i }).click()
      await respWait
    })
    const found = reqs.find(
      (r) => r.method === 'POST' && r.url.includes('/api/users/forgot-password'),
    )
    expect(found, 'forgot-password POST observed').toBeDefined()
    expect(found!.status, 'API responded with 2xx').toBeLessThan(400)
  })
})
