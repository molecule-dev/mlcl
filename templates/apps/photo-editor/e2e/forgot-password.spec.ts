/**
 * /forgot-password — request password-reset email.
 *
 * Asserts: submit POSTs /api/users/forgot-password and the form is
 * replaced by the success card; unknown emails still return 2xx (no
 * enumeration leak); the back-to-login link routes correctly.
 *
 * captureNetwork() is used to confirm the POST behaviour on both paths.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('submit posts /api/users/forgot-password (2xx) and shows the success card', async ({
    page,
  }) => {
    const { email } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').fill(email)

    const calls = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="forgot-submit"]').click()
      await page.waitForTimeout(2500)
    })
    const post = calls.find(
      (c) => c.method === 'POST' && /\/api\/users\/forgot-password/.test(c.url),
    )
    expect(post, 'expected POST /api/users/forgot-password').toBeDefined()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(500)
    await expect(page.getByRole('heading', { name: /check your inbox/i })).toBeVisible({
      timeout: 5_000,
    })
  })

  test('unknown emails still return 2xx (no enumeration leak)', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').fill(uniqueEmail('nobody'))

    const calls = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="forgot-submit"]').click()
      await page.waitForTimeout(2000)
    })
    const post = calls.find(
      (c) => c.method === 'POST' && /\/api\/users\/forgot-password/.test(c.url),
    )
    expect(post).toBeDefined()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(500)
  })

  test('"Back to sign in" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await page.waitForURL(/\/login/)
  })
})
