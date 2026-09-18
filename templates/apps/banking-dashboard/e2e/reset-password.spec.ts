/**
 * /reset-password — invalid token returns 400; the form, links, and
 * pre-fill from `?token=…&email=…` query work as documented.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('reset-password page', () => {
  test('renders email + token + new-password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#token')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
  })

  test('pre-fills email + token from query params', async ({ page }) => {
    const email = uniqueEmail('rp-pre')
    await page.goto(APP_BASE + `/reset-password?email=${encodeURIComponent(email)}&token=ABCDEF12`)
    await expect(page.locator('input#email')).toHaveValue(email)
    await expect(page.locator('input#token')).toHaveValue('ABCDEF12')
  })

  test('submitting with an invalid token surfaces an error and stays on /reset-password', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input#email').fill(uniqueEmail('rp-bad'))
    await page.locator('input#token').fill('NOT-A-REAL-TOKEN')
    await page.locator('input#password').fill('NewTestPass!1234')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').click()
      await expect(page.locator('[data-mol-id="reset-error"], [role="alert"]').first()).toBeVisible(
        {
          timeout: 8000,
        },
      )
    })
    const rp = reqs.find(
      (r) => /\/api\/(?:users\/)?reset[_-]password/.test(r.url) && r.method === 'POST',
    )
    expect(rp, JSON.stringify(reqs)).toBeTruthy()
    expect(rp?.status).toBeGreaterThanOrEqual(400)
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('show/hide password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pw = page.locator('input#password')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('a[href="/login"]').first().click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('"Request a new link" navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('a[href="/forgot-password"]').first().click()
    await page.waitForURL('**/forgot-password', { timeout: 5000 })
  })

  test('submitting with empty fields does not POST', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').click()
      await page.waitForTimeout(500)
    })
    const calls = reqs.filter(
      (r) => /\/api\/(?:users\/)?reset[_-]password/.test(r.url) && r.method === 'POST',
    )
    expect(calls, JSON.stringify(calls)).toEqual([])
  })

  test('reset-password handler responds 400 with structured errorKey for bad token', async ({
    page,
  }) => {
    const res = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/users/reset-password', {
      data: { token: 'definitely-not-a-real-token-xyz', password: 'NewTestPass!1234' },
      failOnStatusCode: false,
    })
    expect(res.status(), 'expected 4xx for bogus reset token').toBeGreaterThanOrEqual(400)
    expect(res.status(), 'expected 4xx for bogus reset token').toBeLessThan(500)
    const body = await res.json()
    expect(body).toHaveProperty('errorKey')
  })
})
