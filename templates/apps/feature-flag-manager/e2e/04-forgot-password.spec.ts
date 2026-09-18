import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /forgot-password — POST /api/users/forgot-password. Real Mailgun
// integration in the api bond fires the email; the frontend only sees a
// 200 response and shows a success card.

test.describe('/forgot-password', () => {
  test('renders email field without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('#forgot-email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  })

  test('submitting fires POST /api/users/forgot-password and shows success card', async ({
    page,
  }) => {
    const creds = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('#forgot-email').fill(creds.email)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post, 'forgot-password POST should fire').toBeDefined()
    expect(post!.status, 'forgot-password should respond 2xx').toBeLessThan(300)
    await expect(page.getByText(/check.*for a reset link/i)).toBeVisible()
  })

  test('"Back to sign in" link navigates to /login from success card', async ({ page }) => {
    const creds = await signup(page)
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('#forgot-email').fill(creds.email)
    await page.getByRole('button', { name: /send reset link/i }).click()
    await expect(page.getByText(/check.*for a reset link/i)).toBeVisible()
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Back to sign in" button on form navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('button', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
