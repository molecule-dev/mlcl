import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup page', () => {
  test('Full name textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    const name = page.locator('input[name="name"], input[autocomplete="name"]').first()
    if (await name.count().catch(() => 0)) {
      await name.fill('Test User')
      expect(await name.inputValue()).toBe('Test User')
    }
  })

  test('Work email textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[type="email"]').first().fill('typed@example.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('typed@example.com')
  })

  test('Password textbox accepts user input and stays masked', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('input[autocomplete="new-password"]').first()
    await pw.fill('TestPass!1234')
    expect(await pw.inputValue()).toBe('TestPass!1234')
    expect(await pw.getAttribute('type')).toBe('password')
  })

  test('Show password toggle flips input type to text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('input[autocomplete="new-password"]').first()
    await pw.fill('secret123')
    const toggle = page.getByRole('button', { name: /show password/i }).first()
    if (await toggle.count().catch(() => 0)) {
      await toggle.click()
      const visible = page.locator('input[type="text"][autocomplete="new-password"]').first()
      await expect(visible).toBeVisible()
    }
  })

  test('Confirm password textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    const inputs = page.locator('input[autocomplete="new-password"]')
    const n = await inputs.count()
    if (n >= 2) {
      await inputs.nth(1).fill('TestPass!1234')
      expect(await inputs.nth(1).inputValue()).toBe('TestPass!1234')
    }
  })

  test('Create account button posts to /api/users and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup-spec')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email)
    })
    const createCall = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$|\/)/.test(r.url))
    expect(createCall, 'POST /api/users').toBeTruthy()
    expect(createCall?.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('Sign in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('a[href="/login"]').first().click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('About Recoup link is visible in the page footer or aside', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
