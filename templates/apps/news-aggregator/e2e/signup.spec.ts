/**
 * Per-page coverage for /signup. Cross-references e2e/observations/signup.md.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('renders the brand heading and Create Account button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading', { name: /vantage/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('Create Account submits POST /api/users with form values', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('na-signup-page')
    await page
      .getByLabel(/^name$/i)
      .first()
      .fill('Page Tester')
    await page.getByLabel(/email/i).first().fill(email)
    await page
      .getByLabel(/^password$/i)
      .first()
      .fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /create account/i }).click()
      await page.waitForURL(/\/home/, { timeout: 15_000 })
    })
    expect(
      reqs.some(
        (r) =>
          /\/api\/users/.test(r.url) && r.method === 'POST' && r.status >= 200 && r.status < 300,
      ),
    ).toBe(true)
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
