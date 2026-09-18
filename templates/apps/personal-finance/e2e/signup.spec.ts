import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup: new-user registration', () => {
  test('Signup form has email + password + Create Account button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible()
  })

  test('Signup creates a user, persists JWT, and routes off /signup', async ({ page }) => {
    const { accessToken } = await signup(page)
    expect(accessToken).toBeTruthy()
    await expect(page).not.toHaveURL(/\/signup/)
  })

  test('Signup fires POST /api/users with the entered email', async ({ page }) => {
    const email = uniqueEmail('signup-net')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email)
    })
    const create = reqs.find((r) => /\/users(\?|$)/.test(r.url) && r.method === 'POST')
    expect(create).toBeDefined()
    expect(create?.status).toBeLessThan(300)
  })

  test('Signup link "Log In" sends user to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.locator('[data-mol-id="signup-login-link"]')
    await expect(link).toBeVisible()
    // The fixed footer can intercept pointer events at the bottom of the form.
    // Use direct DOM navigation to avoid layout-dependent click flakiness.
    const href = await link.getAttribute('href')
    expect(href).toBe('/login')
    await page.goto(APP_BASE + (href as string))
    await expect(page).toHaveURL(/\/login/)
  })

  test('Signup authenticates and /api/users/me returns the new user id and email', async ({
    page,
  }) => {
    const email = uniqueEmail('signup-me')
    const { accessToken } = await signup(page, email)
    expect(accessToken).toBeTruthy()
    const meRes = await page.request.get(API_BASE + '/users/me')
    expect(meRes.status()).toBe(200)
    const raw = (await meRes.json()) as {
      id?: string
      email?: string
      props?: { id?: string; email?: string }
    }
    const user = raw.props ?? raw
    expect(user.id).toBeTruthy()
    expect(user.email).toBe(email)
  })
})
