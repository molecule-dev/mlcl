import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('Signup', () => {
  test('renders fields and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('#signup-email')).toBeVisible()
    await expect(page.locator('#signup-password')).toBeVisible()
    await expect(page.locator('#signup-name')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('submit fires POST /api/users and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('#signup-name').fill('Avery Liu')
      await page.locator('#signup-email').fill(email)
      await page.locator('#signup-password').fill('TestPass123!')
      await page.getByRole('button', { name: /create account/i }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    })
    const usersPost = whereUrl(reqs, /\/api\/users(?:\?|$)/, 'POST')
    expect(usersPost.length, 'POST /api/users should fire').toBeGreaterThan(0)
    expect(usersPost[0].status, 'signup endpoint must succeed').toBe(201)
  })

  test('signup persists user — read-after-write succeeds', async ({ page, request }) => {
    const session = await signup(page)
    expect(session.accessToken).toBeTruthy()
    expect(session.userId).toBeTruthy()
    const me = await request.get(API_BASE + '/users/' + session.userId, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    expect(me.status()).toBe(200)
    const body = await me.json()
    const user = body.props ?? body.user ?? body
    expect(user.email).toBe(session.email)
  })

  test('duplicate signup is rejected', async ({ page, request }) => {
    const first = await signup(page)
    const dup = await request.post(API_BASE + '/users', {
      data: { email: first.email, password: 'TestPass123!', name: 'dup' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(dup.status()).not.toBe(201)
  })

  test('links to /login for existing users', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /^Sign in$/ })
    await expect(link).toHaveAttribute('href', /\/login/)
  })
})
