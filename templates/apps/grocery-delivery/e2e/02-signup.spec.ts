import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, signup, uniqueEmail } from './_helpers'

// /signup — name, email, password. Successful signup → /shop. Same email
// twice should be rejected by the API (POST /api/users → 409 or 4xx).

test.describe('/signup', () => {
  test('renders form fields and Create account button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('textbox', { name: /full name/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /^password$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('signup creates a user and navigates into the authenticated app', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users(\b|\/|\?|$)/.test(r.url))
    expect(post, 'POST /api/users should fire on signup').toBeDefined()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(300)
    // Successfully entered authenticated zone — Shop or some authed page
    await expect(page).toHaveURL(/\/(shop|cart|orders|lists)/, { timeout: 15_000 })
  })

  test('"Sign in" link navigates back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('signup persists the user — re-load /shop honors the session cookie', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('me')
    await signup(page, email)
    // The token cookie is set on signup. Reloading /shop should keep the
    // user authenticated (no /login redirect), and a separate request with
    // the same cookies should hit /api/cart (a session-required endpoint).
    await page.goto(APP_BASE + '/shop')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const res = await request
      .get(API_BASE + '/cart', {
        headers: { Cookie: cookieHeader },
      })
      .catch(() => null)
    expect(res, 'GET /api/cart with the session cookie should return a response').toBeTruthy()
    expect(res!.status(), `/api/cart status ${res!.status()}`).toBeLessThan(400)
  })

  test('signup with show-password toggle reveals password text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pwInput = page.getByRole('textbox', { name: /^password$/i })
    await pwInput.fill('TopSecret123!')
    await expect(pwInput).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pwInput).toHaveAttribute('type', 'text')
  })
})
