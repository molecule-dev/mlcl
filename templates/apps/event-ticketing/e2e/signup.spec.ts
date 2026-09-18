import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/signup page', () => {
  test('happy path creates a new user and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup-ok')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email, 'TestPass!1234')
    })
    await expect(page).toHaveURL(/\/dashboard/)
    const reg = reqs.find((r) => r.method === 'POST' && /\/api\/users(?!\/log-in)/.test(r.url))
    expect(reg, 'POST /api/users registration').toBeTruthy()
    expect(reg?.status).toBeLessThan(400)
  })

  test('mismatched passwords show inline error and disable submit', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('mismatch'))
    const pwds = page.locator('input[autocomplete="new-password"]')
    await pwds.nth(0).fill('Password1!')
    await pwds.nth(1).fill('Different1!')
    await expect(page.getByText(/passwords don.?t match/i)).toBeVisible()
    expect(await page.locator('form button[type="submit"]').first().isDisabled()).toBe(true)
  })

  test('display-name input preserves typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const name = page.locator('input[type="text"]').first()
    await name.fill('Alex Rivera')
    expect(await name.inputValue()).toBe('Alex Rivera')
  })

  test('email is required (HTML5 validity)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('input[type="email"]').first()
    expect(await email.evaluate((el: HTMLInputElement) => el.required)).toBe(true)
  })

  test('first password input is type=password by default', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('input[autocomplete="new-password"]').first()
    expect(await pw.getAttribute('type')).toBe('password')
  })
})
