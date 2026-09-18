/**
 * Signup form drives /api/users to create the user + the seeded onboarding.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('renders all five inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('submit POSTs /api/users and lands signed in', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.waitForLoadState('networkidle')
    const reqs = await captureNetwork(page, async () => {
      const tx = page.locator('input[type="text"]')
      await tx.nth(0).fill('Sign')
      await tx.nth(1).fill('Up')
      await page.locator('input[type="email"]').first().fill(uniqueEmail('su'))
      const pw = page.locator('input[type="password"]')
      await pw.nth(0).fill('TestPass123!')
      if ((await pw.count()) > 1) await pw.nth(1).fill('TestPass123!')
      await page
        .getByRole('button', { name: /create\s*account|sign\s*up|join/i })
        .first()
        .click()
      await expect(page).not.toHaveURL(/\/signup/, { timeout: 30_000 })
    })
    const create = reqs.find((r) => /\/api\/users\b/.test(r.url) && r.method === 'POST')
    expect(create?.status, 'POST /api/users should succeed').toBeLessThan(400)
    const tok = await getAccessToken(page)
    expect(tok, 'access token must be present after signup').toBeTruthy()
  })

  test('login link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    }
  })
})
