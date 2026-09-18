import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, uniqueEmail } from './_helpers.js'

test.describe('helpdesk-ticketing: /signup', () => {
  test('GET /signup renders the email + password form', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('input[type="email"], #email').first()).toBeVisible()
    await expect(page.locator('input[type="password"], #password').first()).toBeVisible()
  })

  test('blank submit on /signup keeps the user on /signup', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('button', { name: /create\s*account|sign\s*up/i })
      .first()
      .click()
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\/signup/)
  })

  test('successful /signup leaves /signup and persists JWT in localStorage', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/signup')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('#email, input[type="email"]').first().fill(uniqueEmail('signup-spec'))
      await page.locator('#password, input[type="password"]').first().fill('SignupSpec1!')
      await page
        .getByRole('button', { name: /create\s*account|sign\s*up/i })
        .first()
        .click()
      await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
    })
    const tok = await getAccessToken(page)
    expect(tok ?? '').not.toBe('')
    expect(reqs.some((r) => r.method === 'POST' && r.url.includes('/api/users'))).toBe(true)
  })
})
