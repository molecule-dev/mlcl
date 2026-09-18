import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('Reset password /reset-password', () => {
  test('renders the form with email + token + new password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('heading', { name: /set a new password/i })).toBeVisible()
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[placeholder*="token"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('submitting bad token surfaces an error or stays on /reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(uniqueEmail('reset'))
      await page.locator('input[placeholder*="token"]').first().fill('not-a-real-token')
      await page.locator('input[type="password"]').first().fill('NewPass!1234')
      await page.getByRole('button', { name: /update password/i }).click()
      await page.waitForTimeout(2000)
    })
    // Either the form returned us to /login on success OR stayed on /reset-password.
    // Critically: the POST must have fired against our backend, not a 404.
    const sent = reqs.find((r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url))
    expect(sent, 'POST /api/users/reset-password not observed').toBeTruthy()
    // Don't allow the dev to misroute the call to a 404.
    expect(sent!.status).not.toBe(404)
  })

  test('Sign in instead link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /sign in instead/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Toggle theme flips <html data-mol-mode>', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const before = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    await page
      .getByRole('button', { name: /toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    expect(after).not.toBe(before)
  })

  test('Logo link routes to /', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /Ascent/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('email is a required field', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('button', { name: /update password/i }).click()
    await page.waitForTimeout(500)
    // Stays on /reset-password — the email input has `required` attribute.
    expect(page.url()).toContain('/reset-password')
  })

  test('Token field is also required (browser-validation prevents submit when empty)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('reset-token'))
    await page.locator('input[type="password"]').first().fill('NewPass!1234')
    await page.getByRole('button', { name: /update password/i }).click()
    await page.waitForTimeout(500)
    // Token blank → browser blocks submit, URL still on /reset-password.
    expect(page.url()).toContain('/reset-password')
  })
})
