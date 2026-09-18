/**
 * /signup — registration. Asserts form, real POST /api/signup, redirect
 * to /home, and a working back-link to /login.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('signup', () => {
  test('renders all five inputs (first/last/email/password/confirm)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[autocomplete="given-name"]')).toBeVisible()
    await expect(page.locator('input[autocomplete="family-name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[autocomplete="new-password"]').first()).toBeVisible()
    await expect(page.locator('input[autocomplete="new-password"]').nth(1)).toBeVisible()
  })

  test('submitting calls POST /api/users and lands on /home with a stored token', async ({
    page,
  }) => {
    // Collected into an array rather than a `let`: TypeScript cannot see the
    // assignment inside the captureNetwork callback and narrows a `let` to
    // `never` at the assertion below.
    const results: Array<Awaited<ReturnType<typeof signup>>> = []
    const email = uniqueEmail()
    const reqs = await captureNetwork(page, async () => {
      results.push(await signup(page, email))
    })
    expect(results[0]?.accessToken.length).toBeGreaterThan(20)
    await expect(page).toHaveURL(/\/home/)
    const signupCalls = reqs.filter(
      (r) => /\/api\/users\b/.test(r.url) && r.method === 'POST' && !r.url.includes('/log-in'),
    )
    expect(
      signupCalls.length,
      JSON.stringify(reqs.map((r) => `${r.method} ${r.url} ${r.status}`)),
    ).toBeGreaterThan(0)
    expect(signupCalls[0].status).toBeLessThan(400)
  })

  test('login page is reachable from the signup back-link', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
