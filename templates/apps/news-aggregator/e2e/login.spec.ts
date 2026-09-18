/**
 * Per-page coverage for /login. Cross-references e2e/observations/login.md.
 * The auth happy paths live in 01-auth.spec.ts; this file documents the
 * page-level UI invariants.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('renders the sign-in heading and forgot-password link', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /forgot/i }).first()).toBeVisible()
  })

  test('submits POST /api/users/log-in and emits the network call', async ({ page }) => {
    const email = uniqueEmail('na-login-page')
    const { password } = await signup(page, email)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/)

    const reqs = await captureNetwork(page, async () => {
      await page.getByLabel(/email/i).first().fill(email)
      await page
        .getByLabel(/password/i)
        .first()
        .fill(password)
      await page
        .getByRole('button', { name: /sign\s*in|log\s*in/i })
        .first()
        .click()
      await page.waitForURL(/\/home/, { timeout: 15_000 })
    })
    expect(
      reqs.some((r) => /(sign-in|log-in)/.test(r.url) && r.method === 'POST' && r.status === 200),
    ).toBe(true)
  })

  test('"Sign up" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign\s*up|create.*account/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })
})
