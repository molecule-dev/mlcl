import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, signupViaUI, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup via UI lands the user on /dashboard with their boards endpoint reachable', async ({
    page,
  }) => {
    const { email } = await signupViaUI(page)
    await expect(page).toHaveURL(/\/dashboard$/)
    const res = await page.request.get(API_BASE + '/boards')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    // First-time user has no boards yet.
    expect(body).toHaveLength(0)
    // Email is real and unique per test run.
    expect(email).toMatch(/@example\.com$/)
  })

  test('login redirects an already-signed-up user back to /dashboard', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const email = uniqueEmail()
    const password = 'TestPass123!'
    const res = await page.request.post(API_BASE + '/users', {
      data: { email, password, name: 'Driftboarder' },
    })
    expect(res.status()).toBe(201)
    await ctx.close()

    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    await page2.goto(APP_BASE + '/login')
    await page2.getByLabel(/Email|Work email/i).fill(email)
    await page2.getByLabel(/Password/i).fill(password)
    await page2.getByRole('button', { name: /Sign in/i }).click()
    await expect(page2).toHaveURL(/\/dashboard$/, { timeout: 15000 })
    await ctx2.close()
  })

  test('unauthenticated request to /api/boards returns 401', async ({ request }) => {
    const res = await request.get(API_BASE + '/boards')
    expect(res.status()).toBe(401)
  })

  test('signup page renders the signup form (route /signup)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(
      page.getByRole('heading', { name: /Sign up|Create.*account|Get started/i }).first(),
    ).toBeVisible()
    await expect(page.getByLabel(/Email|Work email/i).first()).toBeVisible()
    await expect(page.getByLabel(/Password/i).first()).toBeVisible()
  })

  test('forgot-password page renders the email field (route /forgot-password)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByLabel(/Email/i).first()).toBeVisible()
  })

  test('reset-password page is reachable (route /reset-password)', async ({ page }) => {
    const res = await page.goto(
      APP_BASE + '/reset-password?token=fake-test-token-for-route-coverage',
    )
    expect(res?.status()).toBeLessThan(500)
  })

  test('plan-updated page is reachable after auth (route /plan-updated)', async ({ page }) => {
    await signupViaUI(page)
    const res = await page.goto(APP_BASE + '/plan-updated')
    expect(res?.status()).toBeLessThan(500)
  })
})
