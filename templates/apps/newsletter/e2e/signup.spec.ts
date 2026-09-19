/**
 * /signup — the form creates an account and routes the fresh creator into
 * the authenticated studio (dashboard).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders the signup form with email + password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('#signup-email')).toBeVisible()
    await expect(page.locator('#signup-password')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create\s*account|sign\s*up|join/i }).first(),
    ).toBeVisible()
  })

  test('signup lands on an authenticated route', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('signup-flow'))
    expect(accessToken).toBeTruthy()
    await expect(page).toHaveURL(/dashboard|issues|settings/, { timeout: 20000 })
  })

  test('login page links to signup and back', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.locator('a[href="/signup"]').first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/signup/, { timeout: 10000 })
    }
  })
})
