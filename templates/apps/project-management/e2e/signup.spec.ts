/**
 * /signup — new user creation. Verifies registration POST hits the API,
 * a JWT lands in localStorage, and the user is routed to /dashboard.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signOut, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders the form with name + email + password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input#name')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('valid signup hits POST /users/register, sets JWT, and routes to /dashboard', async ({
    page,
  }) => {
    const email = uniqueEmail('signup-ok')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('input#name').fill('Signup OK')
      await page.locator('input#email').fill(email)
      await page.locator('input#password').fill('TestPass!1234')
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForURL('**/dashboard', { timeout: 15000 })
    })
    const reg = reqs.find(
      (r) =>
        r.method === 'POST' &&
        (/\/api\/users\/(register|sign-up|signup)/.test(r.url) ||
          /\/api\/users\??(?:\?|$)/.test(r.url)),
    )
    expect(reg, 'POST register call').toBeTruthy()
    expect(reg?.status, 'register status').toBeLessThan(400)
    const token = await getAccessToken(page)
    expect(token).toBeTruthy()
  })

  test('signing up the same email twice surfaces an error', async ({ page }) => {
    const email = uniqueEmail('signup-dup')
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('Dup')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('TestPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await signOut(page)
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('Dup2')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('TestPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 })
    await expect(page).toHaveURL(/\/signup/)
  })

  test('Sign-in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })
})
