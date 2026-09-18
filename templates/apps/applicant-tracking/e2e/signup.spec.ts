import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders form fields and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByLabel(/confirm.*password|password.*confirm/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create.*account|sign\s*up/i })).toBeVisible()
  })

  test('signing in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign in|already.*account/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('mismatched passwords surface an inline error', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel(/email/i).fill(uniqueEmail('mismatch'))
    await page.getByLabel(/^password$/i).fill('Password!123')
    await page.getByLabel(/confirm.*password|password.*confirm/i).fill('Different!456')
    await page.getByRole('button', { name: /create.*account|sign\s*up/i }).click()
    await expect(page.getByText(/do not match/i)).toBeVisible()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('valid signup creates a user and routes to /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup')
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.getByLabel(/email/i).fill(email)
      await page.getByLabel(/^password$/i).fill('TestPass123!')
      await page.getByLabel(/confirm.*password|password.*confirm/i).fill('TestPass123!')
      await page.getByRole('button', { name: /create.*account|sign\s*up/i }).click()
      await page.waitForURL(/\/dashboard$/, { timeout: 20000 })
    })
    expect(
      requests.some(
        (r) => r.method === 'POST' && /\/users\b(?!\/log)/.test(r.url) && r.status === 201,
      ),
    ).toBeTruthy()
  })

  test('signup page renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await expect(page.getByRole('button', { name: /create.*account|sign\s*up/i })).toBeVisible()
    })
  })
})
