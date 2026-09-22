import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test.describe('login', () => {
  test('signs in an existing user and lands on /dashboard', async ({ page }) => {
    const { email, password } = await signup(page, uniqueEmail('loginuser'))
    await page.evaluate(() => window.localStorage.clear())
    await login(page, email, password)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    const token = await getAccessToken(page)
    expect(token).toBeTruthy()
  })

  test('rejects an unknown email with an inline error', async ({ page }) => {
    // The API correctly 403s the bad credential; the browser logs the failed
    // fetch, so pre-arm the console guard before the request fires.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.goto(APP_BASE + '/login')
    await page.locator('#fld-work-email').fill('nonexistent+' + Date.now() + '@example.com')
    await page.locator('#fld-password').fill('SomePass123!')
    await page
      .getByRole('button', { name: /sign\s*in/i })
      .first()
      .click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('rejects a wrong password with an inline error', async ({ page }) => {
    // Expected 403 from the API (bad credential) — see the unknown-email test.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    const { email } = await signup(page, uniqueEmail('wrongpw'))
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('#fld-work-email').fill(email)
    await page.locator('#fld-password').fill('Wrong123!')
    await page
      .getByRole('button', { name: /sign\s*in/i })
      .first()
      .click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('protected routes redirect to /login when not authenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('signing in issues POST /users/log-in', async ({ page }) => {
    const { email, password } = await signup(page, uniqueEmail('loginnet'))
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    const call = reqs.find((r) => /\/users\/log-in$/.test(r.url) && r.method === 'POST')
    expect(call?.status, 'POST /users/log-in returned 200').toBe(200)
  })
})
