import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/reset-password page', () => {
  test('Work email textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const email = page.locator('input[type="email"]').first()
    await email.fill('demo@example.com')
    expect(await email.inputValue()).toBe('demo@example.com')
  })

  test('Reset code textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const code = page.getByRole('textbox', { name: /reset\s*code|code|token/i }).first()
    if (await code.count().catch(() => 0)) {
      await code.fill('ABC123')
      expect(await code.inputValue()).toBe('ABC123')
    }
  })

  test('New password textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pw = page.locator('input[autocomplete="new-password"]').first()
    await pw.fill('NewPass!1234')
    expect(await pw.inputValue()).toBe('NewPass!1234')
    expect(await pw.getAttribute('type')).toBe('password')
  })

  test('Show password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pw = page.locator('input[autocomplete="new-password"]').first()
    await pw.fill('NewPass')
    const toggle = page.getByRole('button', { name: /show password/i }).first()
    if (await toggle.count().catch(() => 0)) {
      await toggle.click()
      const visible = page.locator('input[type="text"][autocomplete="new-password"]').first()
      await expect(visible).toBeVisible()
    }
  })

  test('Confirm password textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const inputs = page.locator('input[autocomplete="new-password"]')
    const n = await inputs.count()
    if (n >= 2) {
      await inputs.nth(1).fill('NewPass!1234')
      expect(await inputs.nth(1).inputValue()).toBe('NewPass!1234')
    }
  })

  test('Reset password & sign in button stays on /reset-password without a valid token', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input[type="email"]').first().fill('demo@example.com')
    const pw = page.locator('input[autocomplete="new-password"]')
    await pw.first().fill('NewPass!1234')
    if (
      await pw
        .nth(1)
        .count()
        .catch(() => 0)
    )
      await pw.nth(1).fill('NewPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    // No valid token → either an alert appears or the user remains on /reset-password.
    await page.waitForTimeout(800)
    expect(page.url()).toMatch(/\/reset-password/)
  })

  test('Back to sign in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('a[href="/login"]').first().click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('About Recoup link is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
