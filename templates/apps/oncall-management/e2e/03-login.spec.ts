import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('logs in an existing user via the form', async ({ page }) => {
    const { email, password } = await signup(page, uniqueEmail('login'))
    await page.context().clearCookies()
    await login(page, email, password)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('wrong password keeps the user on /login', async ({ page }) => {
    // A wrong password is an expected 403 from the log-in endpoint.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    const { email } = await signup(page, uniqueEmail('badpass'))
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('#login-email, input[type="email"]').first().fill(email)
    await page.locator('#login-password, input[type="password"]').first().fill('WrongPass999!')
    const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
    await expect(submit).toBeEnabled({ timeout: 10_000 })
    await submit.click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page links to signup + forgot password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15_000 })
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
    await expect(page.locator('a[href="/forgot-password"]').first()).toBeVisible()
  })
})
