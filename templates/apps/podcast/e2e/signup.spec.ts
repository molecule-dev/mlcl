import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders the form with name/email/password fields and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByLabel(/^name$/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('show-password toggle reveals the password value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pwd = page.getByLabel(/^password$/i)
    await pwd.fill('TestPass123!')
    await expect(pwd).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pwd).toHaveAttribute('type', 'text')
  })

  test('"Sign In" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('successful signup creates a user, redirects to /discover, and the listener home renders', async ({
    page,
  }) => {
    const email = uniqueEmail('signup')
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.getByLabel(/^name$/i).fill('Demo Listener')
      await page.getByLabel(/email/i).fill(email)
      await page.getByLabel(/^password$/i).fill('TestPass123!')
      await page.getByRole('button', { name: /create account/i }).click()
      await page.waitForURL(/\/discover$/, { timeout: 20000 })
    })
    expect(
      requests.some((r) => r.method === 'POST' && /\/api\/users\b/.test(r.url) && r.status === 201),
    ).toBeTruthy()
    await expect(page.getByRole('heading', { name: /^discover$/i, level: 1 })).toBeVisible()
  })

  test('typing into the name input updates the field value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const name = page.getByLabel(/^name$/i)
    await name.fill('Alice')
    await expect(name).toHaveValue('Alice')
  })

  test('typing into the email input updates the field value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.getByLabel(/email/i)
    await email.fill('alice@example.com')
    await expect(email).toHaveValue('alice@example.com')
  })

  test('signup page renders with no console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
    })
  })
})
