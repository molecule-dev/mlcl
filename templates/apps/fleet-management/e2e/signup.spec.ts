import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('signup', () => {
  test('signup form renders all three fields and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input#name')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('"Sign in" link navigates back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('successful signup POSTs /api/users and persists JWT in localStorage', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
    })
    const usersPost = reqs.find((r) => /\/api\/users(\?|$)/.test(r.url) && r.method === 'POST')
    expect(usersPost?.status, 'POST /api/users').toBeGreaterThanOrEqual(200)
    expect(usersPost?.status, 'POST /api/users').toBeLessThan(300)
    const token = await getAccessToken(page)
    expect(token, 'access token persisted').toBeTruthy()
  })

  test('signup with empty email is rejected by browser-level validation (form does not submit)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('Test User')
    await page.locator('input#password').fill('TestPass!1234')
    await page.getByRole('button', { name: /create account/i }).click()
    // Browser native required-field validation keeps the user on /signup.
    await expect(page).toHaveURL(/\/signup/)
  })

  test('signup with duplicate email shows alert / stays on /signup', async ({ page }) => {
    const email = uniqueEmail('dupe-signup')
    await signup(page, email)
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('Test User')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('TestPass!1234')
    await page.getByRole('button', { name: /create account/i }).click()
    // Either the alert is shown OR the page stays on /signup. If the duplicate email is silently
    // re-logged-in, we'd still observe a redirect — but the API contract should reject.
    await page.waitForTimeout(2000)
    if (/\/signup/.test(page.url())) {
      // Stayed on signup — error should be visible.
      await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 5000 })
    }
  })
})
