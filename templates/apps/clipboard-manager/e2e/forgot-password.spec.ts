/**
 * /forgot-password — POST /api/users/forgot-password. On success the
 * page swaps to a "we sent a reset link" confirmation. Errors render
 * inline.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('forgot password page', () => {
  test('renders email field + submit', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('form button[type="submit"]')).toBeVisible()
  })

  test('submit fires POST /api/users/forgot-password', async ({ page }) => {
    const email = uniqueEmail('forgot-net')
    await signup(page, email)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input#email').fill(email)
      await page.locator('form button[type="submit"]').click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot[-_]?password/.test(r.url),
    )
    expect(post, JSON.stringify(reqs.filter((r) => /forgot/.test(r.url)))).toBeTruthy()
    expect(post?.status).toBe(200)
  })

  test('submitting an existing email shows the success state', async ({ page }) => {
    const email = uniqueEmail('forgot-ok')
    await signup(page, email)
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input#email').fill(email)
    await page.locator('form button[type="submit"]').click()
    await expect(page.getByText(new RegExp(email.replace(/[.+]/g, '\\$&')))).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByRole('button', { name: /back to sign in/i })).toBeVisible()
  })

  test('"Back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await page.waitForURL('**/login', { timeout: 10000 })
  })

  test('submitting a non-existent email also shows success (no enumeration)', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input#email').fill(uniqueEmail('nobody'))
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(2000)
    await expect(
      page
        .locator('body')
        .getByText(/we sent a reset link/i)
        .first(),
    ).toBeVisible({ timeout: 10000 })
  })
})
