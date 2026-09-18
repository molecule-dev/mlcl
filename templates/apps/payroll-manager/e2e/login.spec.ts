import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signupAndToken } from './_helpers'

test.describe('/login', () => {
  test('happy path — known credentials reach /dashboard', async ({ page }) => {
    const { email, password } = await signupAndToken(page)
    await page.context().clearCookies()
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    await login(page, email, password)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('bad password surfaces an alert and stays on /login', async ({ page }) => {
    const { email } = await signupAndToken(page)
    await page.context().clearCookies()
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('definitely-wrong-password')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('forgot-password link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot password/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('show-password toggle reveals plaintext characters', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('input#password')
    await pw.fill('TestPass123!')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('"create an account" link sends to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /create an account/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('reload after login keeps user inside auth-protected app', async ({ page }) => {
    const { email, password } = await signupAndToken(page)
    await page.context().clearCookies()
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    await login(page, email, password)
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
