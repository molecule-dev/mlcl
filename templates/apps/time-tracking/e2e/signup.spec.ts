import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_NAME } from '../src/branding.js'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup page', () => {
  test('signup form fields are all visible', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('[data-test="signup-form"]')).toBeVisible()
    await expect(page.locator('[data-test="signup-first-name"]')).toBeVisible()
    await expect(page.locator('[data-test="signup-last-name"]')).toBeVisible()
    await expect(page.locator('[data-test="signup-email"]')).toBeVisible()
    await expect(page.locator('[data-test="signup-password"]')).toBeVisible()
    await expect(page.locator('[data-test="signup-confirm"]')).toBeVisible()
    await expect(page.locator('[data-test="signup-submit"]')).toBeVisible()
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"schedule Chrono" landing logo link navigates to /', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: APP_NAME }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('first-name and last-name fields preserve typed values', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('[data-test="signup-first-name"]').fill('Ada')
    await page.locator('[data-test="signup-last-name"]').fill('Lovelace')
    await expect(page.locator('[data-test="signup-first-name"]')).toHaveValue('Ada')
    await expect(page.locator('[data-test="signup-last-name"]')).toHaveValue('Lovelace')
  })

  test('email field accepts typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('[data-test="signup-email"]').fill('ada@example.com')
    await expect(page.locator('[data-test="signup-email"]')).toHaveValue('ada@example.com')
  })

  test('password and confirm-password fields accept input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('[data-test="signup-password"]').fill('Pass1234!')
    await page.locator('[data-test="signup-confirm"]').fill('Pass1234!')
    await expect(page.locator('[data-test="signup-password"]')).toBeVisible()
    await expect(page.locator('[data-test="signup-confirm"]')).toBeVisible()
  })

  test('valid signup → POST /api/users + redirect to /dashboard', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
    })
    const su = reqs.find((r) => /\/api\/users(\?|$|\/$)/.test(r.url) && r.method === 'POST')
    expect(su, 'POST /api/users').toBeTruthy()
    expect(su?.status, 'sign-up status').toBeLessThan(300)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('signup persists the access token to the httpOnly session cookie', async ({ page }) => {
    await signup(page)
    // [M1-1] After signup the access token lives in memory + an httpOnly
    // `token` cookie (prod: `__Host-token`) — the security model deliberately
    // removed the XSS-exfiltratable localStorage copy. Verify the real
    // credential: the cookie is set.
    const cookies = await page.context().cookies()
    expect(
      cookies.some((c) => /(^|[-_])token$/i.test(c.name) && c.value),
      'expected the httpOnly session token cookie to be set',
    ).toBeTruthy()
  })

  test('signup with mismatched confirm password — submit is disabled and stays on /signup', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail()
    await page.locator('[data-test="signup-first-name"]').fill('Mismatch')
    await page.locator('[data-test="signup-last-name"]').fill('Tester')
    await page.locator('[data-test="signup-email"]').fill(email)
    await page.locator('[data-test="signup-password"]').fill('CorrectHorseBattery1!')
    await page.locator('[data-test="signup-confirm"]').fill('DIFFERENT-PASSWORD-2!')
    // Mismatch surfaces inline error and disables submit
    await expect(page.locator('text=/passwords don.t match/i')).toBeVisible()
    await expect(page.locator('[data-test="signup-submit"]')).toBeDisabled()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
