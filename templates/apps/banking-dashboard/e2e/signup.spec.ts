/**
 * /signup — name+email+password creates a real account, persists a
 * JWT, and lands the user on the authed dashboard.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders name + email + password fields and the submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input#name')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('form button[type="submit"]')).toBeVisible()
  })

  test('submitting a brand-new account hits POST /api/users with 200 and persists a token', async ({
    page,
  }) => {
    const email = uniqueEmail('signup-good')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('input#name').fill('Spec User')
      await page.locator('input#email').fill(email)
      await page.locator('input#password').fill('TestPass!1234')
      await page.locator('form button[type="submit"]').click()
      await expect(page).not.toHaveURL(/\/signup/, { timeout: 20000 })
    })
    const created = reqs.find((r) => /\/api\/users(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(created, JSON.stringify(reqs)).toBeTruthy()
    expect(created?.status, JSON.stringify(reqs)).toBeLessThan(300)
    const tok = await getAccessToken(page)
    expect(tok).toBeTruthy()
  })

  test('signing up with a duplicate email surfaces an error and stays on /signup', async ({
    page,
  }) => {
    // The API refuses the duplicate POST /api/users with 403 — that refusal
    // IS the case under test.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: /status of 403/,
    })
    const email = uniqueEmail('dup')
    const password = 'TestPass!1234'
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('First')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('form button[type="submit"]').click()
    await expect(page).not.toHaveURL(/\/signup/, { timeout: 20000 })
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('Second')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('form button[type="submit"]').click()
    await expect(page.locator('[data-mol-id="signup-error"], [role="alert"]').first()).toBeVisible({
      timeout: 8000,
    })
  })

  test('"Sign in" footer link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('a[href="/login"]').first().click()
    await page.waitForURL('**/login', { timeout: 5000 })
    await expect(page.locator('input#email')).toBeVisible()
  })

  test('show/hide password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('input#password')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('submit with empty fields does not POST', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').click()
      await page.waitForTimeout(500)
    })
    const userCalls = reqs.filter((r) => /\/api\/users/.test(r.url) && r.method === 'POST')
    expect(userCalls, JSON.stringify(userCalls)).toEqual([])
  })

  test('OAuth buttons render when configured', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const oauth = page.getByRole('button', { name: /google|github|apple|gitlab|twitter/i })
    if ((await oauth.count()) > 0) {
      await expect(oauth.first()).toBeVisible()
    }
  })

  test('signup helper signs up + lands somewhere off /signup', async ({ page }) => {
    const { accessToken } = await signup(page)
    expect(accessToken).toBeTruthy()
    await expect(page).not.toHaveURL(/\/signup/)
  })

  test('after signup, /api/accounts is reachable with the persisted token', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
