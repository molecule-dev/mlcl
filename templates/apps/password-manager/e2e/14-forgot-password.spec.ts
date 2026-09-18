import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/forgot-password', () => {
  test('renders email input + send button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /send|recovery|instructions/i })).toBeVisible()
  })

  test('submitting POSTs /api/users/forgot-password and shows the submitted heading', async ({
    page,
  }) => {
    const { email } = await signup(page)
    // logout before testing the forgot-password route
    await page.evaluate(() => globalThis.localStorage.clear())
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send|recovery|instructions/i }).click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post, 'POST /api/users/forgot-password must fire').toBeDefined()
    expect(post!.status).toBeLessThan(400)
    await expect(page.getByRole('heading', { name: /sent|recovery instructions/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Back to Sign In link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /back to sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
