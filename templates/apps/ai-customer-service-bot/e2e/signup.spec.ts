import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('signup form lands a fresh user on /dashboard', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
    })
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
    const post = reqs.find((r) => /\/api\/users\b/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/users should fire on signup').toBeTruthy()
    expect(post!.status, 'signup POST returned non-2xx').toBeLessThan(300)
  })

  test('navigates to /login when "already have an account" link clicked', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in|already.*account/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('email field accepts a fresh value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('signup')
    await page.getByLabel(/email/i).first().fill(email)
    await expect(page.getByLabel(/email/i).first()).toHaveValue(email)
  })

  test('password field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.getByLabel(/^password$/i).first()
    await pw.fill('TestPass123!')
    await expect(pw).toHaveValue('TestPass123!')
  })

  test('toggling the password visibility button flips the input type', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.getByLabel(/^password$/i).first()
    await pw.fill('TestPass123!')
    await expect(pw).toHaveAttribute('type', 'password')
    const toggle = page.getByRole('button', { name: /toggle password visibility/i }).first()
    await toggle.click()
    await expect(pw).toHaveAttribute('type', 'text')
  })
})
