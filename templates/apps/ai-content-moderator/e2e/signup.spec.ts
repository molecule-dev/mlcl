/**
 * /signup — form validation + happy path + persisted login session.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders the signup form with first/last/email/password/confirm fields', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input#signup-first-name')).toBeVisible()
    await expect(page.locator('input#signup-last-name')).toBeVisible()
    await expect(page.locator('input#signup-email')).toBeVisible()
    await expect(page.locator('input#signup-password')).toBeVisible()
    await expect(page.locator('input#signup-confirm')).toBeVisible()
  })

  test('mismatched passwords show inline alert and stay on /signup (no API call)', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('input#signup-first-name').fill('Mis')
      await page.locator('input#signup-last-name').fill('Match')
      await page.locator('input#signup-email').fill('mismatch-' + Date.now() + '@flagship.test')
      await page.locator('input#signup-password').fill('TestPass!1234')
      await page.locator('input#signup-confirm').fill('Different!9999')
      await page.locator('form[data-mol-id="signup-form"] button[type="submit"]').click()
      await expect(page.locator('[role="alert"]')).toContainText(/match/i, { timeout: 5000 })
    })
    await expect(page).toHaveURL(/\/signup/)
    // No /api/users POST should have been issued for client-side mismatch
    const userCreate = reqs.find((r) => /\/api\/users(\/?$|\?)/.test(r.url) && r.method === 'POST')
    expect(userCreate, 'no POST /api/users when client-side validation fails').toBeUndefined()
  })

  test('happy path: signup creates user, lands on /dashboard, persists JWT', async ({ page }) => {
    const email = uniqueEmail('signup-happy')
    const password = 'TestPass!1234'
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('input#signup-first-name').fill('Happy')
      await page.locator('input#signup-last-name').fill('User')
      await page.locator('input#signup-email').fill(email)
      await page.locator('input#signup-password').fill(password)
      await page.locator('input#signup-confirm').fill(password)
      await page.locator('form[data-mol-id="signup-form"] button[type="submit"]').click()
      await page.waitForURL('**/dashboard', { timeout: 15000 })
    })
    // The signup must have triggered a successful POST to the auth backend
    const created = reqs.find((r) => /\/api\/users(\/?$|\?)/.test(r.url) && r.method === 'POST')
    expect(created?.status, 'POST /api/users from signup form').toBeLessThan(300)
    // JWT bearer token must be persisted by the auth client
    const token = await getAccessToken(page)
    expect(token, 'access token persisted after signup').toBeTruthy()
  })

  test('"Sign in" link navigates back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('a[href="/login"]').first().click()
    await page.waitForURL('**/login', { timeout: 5000 })
    await expect(page.locator('input#login-email')).toBeVisible()
  })

  test('after signup, page.reload() keeps me on /dashboard (session persists)', async ({
    page,
  }) => {
    const email = uniqueEmail('signup-persist')
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#signup-first-name').fill('Persist')
    await page.locator('input#signup-last-name').fill('User')
    await page.locator('input#signup-email').fill(email)
    await page.locator('input#signup-password').fill('TestPass!1234')
    await page.locator('input#signup-confirm').fill('TestPass!1234')
    await page.locator('form[data-mol-id="signup-form"] button[type="submit"]').click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
