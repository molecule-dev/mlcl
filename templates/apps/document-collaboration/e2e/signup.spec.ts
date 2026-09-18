/**
 * /signup — form renders, submission lands off /signup with a JWT
 * persisted, and the new user lands on the dashboard.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('form renders the expected inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const textInputs = page.locator('input[type="text"]')
    await expect(textInputs).toHaveCount(2) // first / last
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]')).toHaveCount(2)
    await expect(page.getByRole('button', { name: /create\s*account/i })).toBeVisible()
  })

  test('valid signup lands on /dashboard with a JWT bearer in localStorage', async ({ page }) => {
    const { email, accessToken, userId } = await signup(page, uniqueEmail('signup-good'))
    await expect(page).toHaveURL(/\/dashboard/)
    expect(accessToken, 'JWT should be persisted on signup').toBeTruthy()
    expect(userId, 'user id should be persisted on signup').toBeTruthy()
    expect(email).toMatch(/@example\.com$/)
  })

  test('seeded demo content appears for a brand new user', async ({ page }) => {
    await signup(page, uniqueEmail('signup-seed'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForSelector('[data-testid="dashboard-doc-grid"]', { timeout: 15000 })
    const cards = page.locator('[data-testid="dashboard-doc-grid"] > *')
    expect(await cards.count(), 'demo seed should ship 3 documents').toBeGreaterThanOrEqual(3)
    // Notifications strip should also be populated.
    const activity = page.locator('[data-testid="dashboard-activity"] > li')
    expect(await activity.count(), 'demo seed should ship at least 1 notification').toBeGreaterThan(
      0,
    )
  })

  test('signup rejects an already-registered email with a 4xx', async ({ page }) => {
    const { email } = await signup(page, uniqueEmail('signup-dup'))
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[type="text"]').nth(0).fill('Dup')
    await page.locator('input[type="text"]').nth(1).fill('Licate')
    await page.locator('input[type="email"]').first().fill(email)
    const pwInputs = page.locator('input[type="password"]')
    await pwInputs.nth(0).fill('SecondAttempt!9')
    await pwInputs.nth(1).fill('SecondAttempt!9')
    await page.getByRole('button', { name: /create\s*account/i }).click()
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/signup/)
  })

  test('login link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForURL('**/login', { timeout: 5000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})

test.describe('signup — network', () => {
  test('signup submit triggers POST /api/users', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    const reqs = await captureNetwork(page, async () => {
      const textInputs = page.locator('input[type="text"]')
      const count = await textInputs.count()
      if (count >= 2) {
        await textInputs.nth(0).fill('Net')
        await textInputs.nth(1).fill('User')
      } else if (count === 1) {
        await textInputs.first().fill('Net User')
      }
      await page.locator('input[type="email"]').first().fill(uniqueEmail('signup-net'))
      const pwInputs = page.locator('input[type="password"]')
      const pcount = await pwInputs.count()
      for (let i = 0; i < pcount; i++) await pwInputs.nth(i).fill('TestPass123!')
      await page
        .getByRole('button', { name: /create account|sign up/i })
        .first()
        .click()
      await page.waitForTimeout(2000)
    })
    expect(reqs.some((r) => r.method === 'POST' && r.url.includes('/api/users'))).toBe(true)
  })
})
