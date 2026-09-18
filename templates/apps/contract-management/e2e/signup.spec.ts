/**
 * /signup — fields render, mismatched passwords show error, valid signup
 * lands authenticated and persists JWT bearer token.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders all required fields + submit', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('#signup-firstName')).toBeVisible()
    await expect(page.locator('#signup-lastName')).toBeVisible()
    await expect(page.locator('#signup-email')).toBeVisible()
    await expect(page.locator('#signup-password')).toBeVisible()
    await expect(page.locator('#signup-confirm')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create.*account|sign\s*up|join/i }).first(),
    ).toBeVisible()
  })

  test('mismatched passwords show inline error and stay on page', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#signup-firstName').fill('A')
    await page.locator('#signup-lastName').fill('B')
    await page.locator('#signup-email').fill(uniqueEmail('mismatch'))
    await page.locator('#signup-company').fill('Acme')
    await page.locator('#signup-password').fill('Hunter2!@#x')
    await page.locator('#signup-confirm').fill('Different!@#x')
    await page
      .getByRole('button', { name: /create.*account|sign\s*up|join/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('valid signup lands authenticated', async ({ page }) => {
    const { accessToken, userId } = await signup(page)
    expect(accessToken, 'JWT should be in localStorage').toBeTruthy()
    expect(userId, 'user id should be in localStorage').toBeTruthy()
    await expect(page).not.toHaveURL(/\/signup/)
  })

  test('login link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('a[href="/login"]').first().click()
    await page.waitForURL('**/login', { timeout: 5_000 })
    await expect(page.locator('#login-email')).toBeVisible()
  })
})
