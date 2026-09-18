/**
 * /signup — fresh-user creation, persists access token + user row, lands
 * on /dashboard. Failing input combos surface inline errors without
 * persisting anything.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('signup with valid fields persists the user and lands on /dashboard', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
    })
    await expect(page).toHaveURL(/\/dashboard/)
    const reg = reqs.find(
      (r) =>
        /\/api\/users\/register|\/api\/auth\/register|\/api\/users(?:$|\?|\b)/.test(r.url) &&
        r.method === 'POST',
    )
    expect(reg, 'POST register call').toBeTruthy()
    expect(reg?.status, 'register status code').toBeLessThan(400)
  })

  test('access token is persisted and survives reload', async ({ page }) => {
    await signup(page)
    const tokenBefore = await getAccessToken(page)
    expect(tokenBefore).toBeTruthy()
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/)
    const tokenAfter = await getAccessToken(page)
    expect(tokenAfter).toBe(tokenBefore)
  })

  test('mismatched passwords surface inline error and do not POST', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#signup-first-name').fill('Test')
    await page.locator('input#signup-last-name').fill('User')
    await page.locator('input#signup-company').fill('Test Co')
    await page.locator('input#signup-email').fill(uniqueEmail('mismatch'))
    await page.locator('input#signup-password').fill('AAAAaaaaaa1!')
    await page.locator('input#signup-confirm').fill('BBBBbbbbbb1!')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').first().click()
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
    })
    expect(reqs.find((r) => /\/api\/users(?:$|\b)/.test(r.url) && r.method === 'POST')).toBeFalsy()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('Sign-in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /sign in/i }).click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })
})
