/**
 * /forgot-password — POST /api/users/forgot-password swaps the form
 * for a "Check your email." success view; nav links work.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('forgot-password page', () => {
  test('renders email field and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('form button[type="submit"]')).toBeVisible()
  })

  test('submitting hits POST /api/users/forgot-password and shows success view', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = uniqueEmail('fp')
    await page.locator('input#email').fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').click()
      await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 8000 })
    })
    const fp = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
    expect(fp, JSON.stringify(reqs)).toBeTruthy()
    expect(fp?.status).toBeLessThan(400)
  })

  test('success view contains the email address', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = uniqueEmail('fp-shows-email')
    await page.locator('input#email').fill(email)
    await page.locator('form button[type="submit"]').click()
    await expect(page.getByText(email)).toBeVisible({ timeout: 8000 })
  })

  test('"Back to sign in" button after success navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input#email').fill(uniqueEmail('fp-back'))
    await page.locator('form button[type="submit"]').click()
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: /back to sign in/i }).click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('"Sign In" footer link navigates to /login (form view)', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('a[href="/login"]').first().click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('submitting with empty email does not POST', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').click()
      await page.waitForTimeout(500)
    })
    const calls = reqs.filter((r) => /forgot-password/.test(r.url) && r.method === 'POST')
    expect(calls, JSON.stringify(calls)).toEqual([])
  })
})
