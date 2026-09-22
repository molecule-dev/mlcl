import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('Signup /signup', () => {
  test('valid signup persists access token and lets user reach /dashboard', async ({ page }) => {
    const { accessToken } = await signup(page)
    expect(accessToken).toMatch(/^eyJ/)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('signup POST hits /api/users and returns a session', async ({ page }) => {
    const email = uniqueEmail()
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill('TestPass!1234')
      await page.locator('form button[type="submit"]').first().click()
      await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
    expect(post, 'expected POST /api/users').toBeTruthy()
    expect(post!.status).toBeLessThan(300)
  })

  test('duplicate email fails the second time and stays on /signup', async ({ page }) => {
    // The API's non-enumerable duplicate-email response is a 403; the
    // browser logs every 4xx fetch as a console error, which is expected
    // here — the test asserts the failure UI, not console silence.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    const email = uniqueEmail('dup')
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('TestPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })

    // Logout context, retry signup with same email.
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('TestPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/signup')
  })

  test('back-arrow returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('button', { name: /back|go back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
