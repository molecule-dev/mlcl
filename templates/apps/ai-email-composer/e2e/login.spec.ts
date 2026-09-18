import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup, uniqueEmail } from './_helpers.js'

test('login round-trips via the same email', async ({ page, browser }) => {
  const email = uniqueEmail('login')
  const password = 'TestPass123!'

  const ctx1 = await browser.newContext()
  const p1 = await ctx1.newPage()
  await signup(p1, email, password)
  await ctx1.close()

  await login(page, email, password)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
})

test('protected route redirects to login when signed out', async ({ page }) => {
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForURL(/\/login/, { timeout: 15_000 })
  await expect(page).toHaveURL(/\/login/)
})

test('login form exposes email + password inputs and a Sign In button', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.locator('input[type="email"], input#email').first()).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
})
