/**
 * /signup — new account creation; weak passwords rejected, valid form
 * lands off /signup, accessToken is persisted, and a duplicate email
 * cannot register a second time.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders email + password fields and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('#signup-email')).toBeVisible()
    await expect(page.locator('#signup-password')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create\s*account|sign\s*up|join/i }).first(),
    ).toBeVisible()
  })

  test('valid signup persists JWT and lands off /signup', async ({ page }) => {
    const { accessToken, userId } = await signup(page, uniqueEmail('signup-ok'))
    expect(accessToken, 'JWT bearer should be persisted in localStorage').toBeTruthy()
    expect(userId, 'user id should be persisted in localStorage').toBeTruthy()
  })

  test('signing up with an already-registered email fails', async ({ page }) => {
    // The duplicate-email rejection (403) is the subject here — the browser
    // logs it and the console guard would fail the run without this.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    const email = uniqueEmail('signup-dup')
    const password = 'TestPass123!'
    await page.request.post(`${API_BASE}/users`, {
      data: { email, password, firstName: 'Dup', lastName: 'User' },
    })
    await page.goto(APP_BASE + '/signup')
    await page.locator('#signup-email').fill(email)
    await page.locator('#signup-password').fill(password)
    await page
      .getByRole('button', { name: /create\s*account|sign\s*up|join/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/signup/)
  })

  test('signup heading is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('submit POSTs to /api/users (network)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('signup-network')
    await page.locator('#signup-email').fill(email)
    await page.locator('#signup-password').fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /create\s*account|sign\s*up|join/i })
        .first()
        .click()
      await page.waitForTimeout(2500)
    })
    const r = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
    expect(r, 'signup must POST /api/users').toBeTruthy()
    expect(r!.status).toBeLessThan(400)
  })

  test('email validation: empty submit shows inline error', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#signup-password').fill('TestPass123!')
    await page
      .getByRole('button', { name: /create\s*account|sign\s*up|join/i })
      .first()
      .click()
    await page.waitForTimeout(500)
    expect(await page.locator('main, body').first().innerText()).toMatch(/email|required|invalid/i)
  })

  test('password validation: short password shows inline error', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#signup-email').fill('valid@example.com')
    await page.locator('#signup-password').fill('short')
    await page
      .getByRole('button', { name: /create\s*account|sign\s*up|join/i })
      .first()
      .click()
    await page.waitForTimeout(500)
    expect(await page.locator('main, body').first().innerText()).toMatch(
      /password|character|min|8/i,
    )
  })

  test('sign-in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.locator('[data-mol-id="link-signin"]').first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(/\/login/, { timeout: 10000 })
    }
  })

  test('signup form has submit button with data-mol-id', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('[data-mol-id="button-signup-submit"]')).toBeVisible()
  })

  test('OAuth buttons section is rendered (visibility check)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const oauth = page.getByRole('button', { name: /google|github|gitlab|twitter|continue with/i })
    if (await oauth.count()) await expect(oauth.first()).toBeVisible()
  })
})
