import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Login page (/login)', () => {
  test('Snagr brand link navigates back to /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: 'Snagr' }).click()
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/?$/)
  })

  test('Email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByLabel('Email address').fill('test@example.com')
    await expect(page.getByLabel('Email address')).toHaveValue('test@example.com')
  })

  test('Password input accepts text and is masked by default', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByLabel('Password', { exact: true })
    await pw.fill('Secret123!')
    await expect(pw).toHaveValue('Secret123!')
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('"Show password" toggle flips password input type', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByLabel('Password', { exact: true })
    await pw.fill('Secret123!')
    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(pw).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('"Remember me" checkbox toggles', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const remember = page.getByRole('checkbox', { name: 'Remember me' })
    const initial = await remember.isChecked()
    await remember.click()
    await expect(remember).toBeChecked({ checked: !initial })
  })

  test('"Forgot password?" link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('"Create an account" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /create an account/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Sign-in submit posts /api/users/log-in and redirects to /dashboard', async ({ page }) => {
    const creds = await signup(page)
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.getByLabel('Email address').fill(creds.email)
      await page.getByLabel('Password', { exact: true }).fill(creds.password)
      await page.getByRole('button', { name: /sign in to snag/i }).click()
      await page.waitForURL('**/dashboard', { timeout: 15_000 })
    })
    const logins = reqs.filter((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(logins.length, 'POST /api/users/log-in fired').toBeGreaterThan(0)
    expect(
      logins.every((r) => r.status === 200),
      'log-in returned 200',
    ).toBe(true)
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})
