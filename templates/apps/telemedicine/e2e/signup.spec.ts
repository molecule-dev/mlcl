import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/signup — Account creation', () => {
  test('renders the form with name + email + password inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input#name')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeEnabled()
  })

  test('Show/hide password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pwd = page.locator('input#password')
    await pwd.fill('TestPass!1234')
    await expect(pwd).toHaveAttribute('type', 'password')
    const toggle = page.getByRole('button', { name: /show password/i }).first()
    await toggle.click()
    await expect(pwd).toHaveAttribute('type', 'text')
    await page
      .getByRole('button', { name: /hide password/i })
      .first()
      .click()
    await expect(pwd).toHaveAttribute('type', 'password')
  })

  test('Submitting valid credentials creates the user, persists token, and lands the user authenticated', async ({
    page,
  }) => {
    const email = uniqueEmail('signup-spec')
    await page.goto(APP_BASE + '/signup')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input#name').fill('Spec User')
      await page.locator('input#email').fill(email)
      await page.locator('input#password').fill('TestPass!1234')
      await page.getByRole('button', { name: /create account/i }).click()
      await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
    })
    const createCall = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
    expect(createCall, 'submit must POST /api/users').toBeTruthy()
    expect(createCall!.status).toBeLessThan(400)
    const accessToken = await getAccessToken(page)
    expect(accessToken, 'access token was persisted').toBeTruthy()
    const meRes = await page.request.get(API_BASE + '/profile/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(meRes.status()).toBe(200)
    const me = (await meRes.json()) as { email?: string; name?: string }
    expect(me.email).toBe(email)
    expect(me.name).toBe('Spec User')
  })

  test('Footer shows Privacy / Terms / HIPAA labels', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('link', { name: /privacy/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /terms/i }).first()).toBeVisible()
    await expect(page.getByText(/HIPAA/i)).toBeVisible()
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Resigning up with the same email returns a duplicate-account error', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('Dup User')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('TestPass!1234')
    await page.getByRole('button', { name: /create account/i }).click()
    // Stays on /signup; UI surfaces an error alert
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\/signup/)
    await expect(page.locator('[data-mol-id="signup-error"]')).toBeVisible({ timeout: 10000 })
  })
})
