import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  bearerToken,
  flipThemeAndAssertChanged,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/signup', () => {
  test('renders the brand link with "Lexlet home" aria-label', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('link', { name: /lexlet home/i })).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await flipThemeAndAssertChanged(page)
  })

  test('renders display name, email and password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(
      page.getByRole('textbox', { name: /display name|your name|name/i }).first(),
    ).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i }).first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('"Log in" link → /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /^log\s*in$|^sign\s*in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('successful signup lands on /play with a bearer token', async ({ page }) => {
    const email = uniqueEmail('signup-ok')
    await signup(page, email, 'TestPass!1234')
    await expect(page).toHaveURL(/\/play$/)
    const token = await bearerToken(page)
    expect(token).toBeTruthy()
  })

  test('the streak headline renders', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading', { name: /start your streak/i })).toBeVisible()
  })
})
