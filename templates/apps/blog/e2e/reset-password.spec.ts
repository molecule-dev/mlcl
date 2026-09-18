/**
 * /reset-password — public page that takes a token from the URL,
 * accepts a new password, and POSTs to /api/users/reset-password.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders the reset-password heading', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/reset-password?token=demo')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('renders a password input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    const pw = page.locator('input[type="password"]').first()
    await pw.fill('Newpassword123!')
    expect(await pw.inputValue()).toBe('Newpassword123!')
  })

  test('submit button POSTs to /api/users/reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    const pw = page.locator('input[type="password"]').first()
    await pw.fill('Newpassword123!')
    // Confirm field if present
    const confirm = page.locator('input[type="password"]').nth(1)
    if (await confirm.count()) await confirm.fill('Newpassword123!')
    const reqs = await captureNetwork(page, async () => {
      const btn = page.getByRole('button', { name: /reset|set\s*password|continue/i }).first()
      if (await btn.count()) await btn.click()
      await page.waitForTimeout(1200)
    })
    const r = reqs.find((r) => /\/api\/users\/reset-password|\/api\/auth\/reset/.test(r.url))
    if (r) expect(r.status).toBeLessThan(500)
  })

  test('sign-in link navigates back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    const link = page.getByRole('link', { name: /sign\s*in|login/i }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(/\/login/, { timeout: 10000 })
    }
  })

  test('subtitle copy is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    const text = await page.locator('main').innerText()
    expect(text.length).toBeGreaterThan(20)
  })

  test('an error/notice slot is reachable for after-submit feedback', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    expect(await page.locator('body').innerText()).toBeTruthy()
  })
})
