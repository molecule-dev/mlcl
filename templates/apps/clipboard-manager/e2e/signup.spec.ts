/**
 * /signup — POST /api/users with name/email/password. On 201 the auth
 * client persists the JWT to localStorage and the page navigates to
 * /clips. Validation errors render inline.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders three fields + submit', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input#name')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('form button[type="submit"]')).toBeVisible()
  })

  test('successful signup persists JWT and routes to /clips', async ({ page }) => {
    const result = await signup(page)
    await expect(page).toHaveURL(/\/clips/)
    expect(result.accessToken.length).toBeGreaterThan(100)
    expect(result.userId).toMatch(/[0-9a-f-]{36}/i)
  })

  test('successful signup fires POST /api/users (201)', async ({ page }) => {
    const email = uniqueEmail('signup-net')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('input#name').fill('Net Probe')
      await page.locator('input#email').fill(email)
      await page.locator('input#password').fill('TestPass!1234')
      await page.locator('form button[type="submit"]').click()
      await page.waitForURL(/\/clips/, { timeout: 20_000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users(?:\?|$)/.test(r.url))
    expect(post).toBeTruthy()
    expect(post?.status).toBe(201)
  })

  test('signup also persists user.email matching what was typed', async ({ page }) => {
    const email = uniqueEmail('signup-persist')
    const { accessToken } = await signup(page, email)
    const meResp = await page.request.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const me = (await meResp.json()) as { props?: { email?: string }; email?: string }
    const meEmail = me.props?.email ?? me.email
    expect(meEmail).toBe(email)
  })

  test('duplicate email shows inline error and stays on /signup', async ({ page }) => {
    // Expected 4xx: the duplicate-email POST surfaces as a browser console
    // resource error; the inline error banner below is the real assertion.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    const email = uniqueEmail('dup')
    await signup(page, email)
    // Sign out so we can hit the form again as anon
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('Twin User')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('TestPass!1234')
    await page.locator('form button[type="submit"]').click()
    // Deterministic: wait for the inline error, not a fixed timeout.
    await expect(page.locator('[data-mol-id="signup-error"], [role="alert"]').first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Sign in instead" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const signInLink = page.getByRole('link', { name: /sign in/i }).first()
    await signInLink.click()
    await page.waitForURL('**/login', { timeout: 10000 })
  })
})
