import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiSignup, captureNetwork, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('Forgot password page (/forgot-password)', () => {
  test('renders heading, email input, submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /Recover access/i })).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  })

  test('email field is type=email and required', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.locator('#email')
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('required', '')
  })

  test('submit POSTs /api/users/forgot-password and shows success status', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('#email').fill(u.email)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByRole('status')).toBeVisible({ timeout: 10_000 })
    })
    const fp = whereUrl(reqs, /\/api\/users\/forgot-password/, 'POST')
    expect(fp.length, 'POST /api/users/forgot-password should fire').toBeGreaterThan(0)
    expect(fp[0].status, 'should not 5xx (Mailgun real-keys are configured)').toBeLessThan(500)
  })

  test('success state replaces form with mark_email_read panel and back-to-login link', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('#email').fill(u.email)
    await page.getByRole('button', { name: /send reset link/i }).click()
    const status = page.getByRole('status')
    await expect(status).toBeVisible({ timeout: 10_000 })
    await expect(status).toContainText(new RegExp(u.email.replace(/[.+]/g, '\\$&')))
    await page
      .getByRole('link', { name: /back to sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('footer "Back to sign in" link routes to /login (pre-submit)', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /back to sign in/i })
    await expect(link).toHaveAttribute('href', /\/login/)
  })

  test('unknown email does NOT 5xx and still shows success state (no enumeration)', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('#email').fill(uniqueEmail('nobody'))
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByRole('status')).toBeVisible({ timeout: 10_000 })
    })
    const fp = whereUrl(reqs, /\/api\/users\/forgot-password/, 'POST')
    expect(fp[0].status).toBeLessThan(500)
  })

  test('AuthBrandHeader Fugue heading is visible on the page', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /^Fugue$/ })).toBeVisible()
  })

  test('direct API call returns 200 (or 4xx for empty body) — invariant: no 5xx', async ({
    request,
  }) => {
    const u = await apiSignup(request)
    const res = await request.post(API_BASE + '/users/forgot-password', {
      data: { email: u.email },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBeLessThan(500)
  })
})
