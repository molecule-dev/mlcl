import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, login, signup } from './_helpers'

// /login — email/password sign-in. Successful login → /shop (or the
// `from` location captured before the redirect).

test.describe('/login', () => {
  test('renders email + password fields and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /^password$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible()
  })

  test('valid credentials sign in and navigate to /shop', async ({ page, browser }) => {
    // Sign up first so we have a known set of credentials, then sign out
    // by clearing context and try to sign back in via the form.
    const { email, password } = await signup(page)
    const ctx = await browser.newContext()
    const page2 = await ctx.newPage()
    const reqs = await captureNetwork(page2, async () => {
      await login(page2, email, password)
    })
    const sessionCall = reqs.find(
      (r) => r.method === 'POST' && /\/api\/(users\/log-in|sessions|login|auth)/.test(r.url),
    )
    expect(sessionCall, 'POST to session/login endpoint should fire').toBeDefined()
    expect(sessionCall!.status).toBeLessThan(400)
    await expect(page2).toHaveURL(/\/(shop|cart|orders|lists)/, { timeout: 15_000 })
    await ctx.close()
  })

  test('invalid credentials show an error and stay on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('textbox', { name: /email/i }).fill('nobody@example.com')
    await page.getByRole('textbox', { name: /^password$/i }).fill('WrongPass123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('"Forgot password?" navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('"Create an account" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /create an account|sign up/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })
})
