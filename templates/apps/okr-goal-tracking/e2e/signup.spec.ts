import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, getAccessToken, uniqueEmail } from './_helpers.js'

test.describe('Signup /signup', () => {
  test('full flow: fill form, POST /api/users, redirect to /dashboard, token persists', async ({
    page,
  }) => {
    const email = uniqueEmail('signup')
    await page.goto(APP_BASE + '/signup')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[autocomplete="name"]').first().fill('Avery Test')
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill('TestPass!1234')
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForURL('**/dashboard', { timeout: 15000 })
    })
    const created = reqs.find((r) => r.method === 'POST' && /\/api\/users(\b|$|\?)/.test(r.url))
    expect(created, 'POST /api/users not observed').toBeTruthy()
    expect(created!.status).toBeLessThan(300)

    const token = await getAccessToken(page)
    expect(token, 'access token must be present after signup').toBeTruthy()
    const meRes = await page.request.get(API_BASE + '/users/me')
    const meRaw = (await meRes.json()) as {
      email?: string
      id?: string
      props?: { email?: string; id?: string }
    }
    const user = meRaw.props ?? meRaw
    expect(user.email).toBe(email)
    expect(user.id).toBeTruthy()
  })

  test('duplicate signup is rejected (email already in use)', async ({ page }) => {
    const email = uniqueEmail('dup')
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[autocomplete="name"]').first().fill('First')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('TestPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })

    // Now try to sign up with the same email from a fresh context.
    // Clearing cookies while the dashboard is still mounting its fetches
    // can 401 them, and the duplicate POST /api/users itself 403s — both
    // are the EXPECTED noise of this flow, so allow them up front.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of (401|403)',
    })
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[autocomplete="name"]').first().fill('Second')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('TestPass!1234')
    await page.locator('form button[type="submit"]').first().click()

    // Stays on /signup with an error.
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/signup')
  })

  test('Sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Email field is required (browser validation prevents empty submit)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[type="password"]').first().fill('TestPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    // No navigation should happen — email is required.
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/signup')
  })

  test('Password field is required (browser validation prevents empty submit)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[type="email"]').first().fill('test@example.com')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/signup')
  })

  test('Toggle theme flips <html data-mol-mode>', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const before = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    await page
      .getByRole('button', { name: /toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    expect(after).not.toBe(before)
  })

  test('Logo link goes to /', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /Ascent/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/)
  })
})
