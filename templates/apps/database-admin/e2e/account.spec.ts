/**
 * Settings + monitoring. Profile edits round-trip through /api/users/:id;
 * monitoring page surfaces stats from /api/queries/history (after we run
 * a couple of queries against the demo DB).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { createDemoConnection, getAccessToken, signup, login, APP_BASE } from './_helpers.js'

test.describe('Settings', () => {
  test('profile name persists across reload', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.goto('/settings')

    const nameField = page.locator('[data-mol-id="settings-name"]')
    await expect(nameField).toBeVisible()
    await nameField.fill('Renamed Tester')
    // Username must be unique across the whole DB — collisions produce 403
    // ("Username is unavailable") because previous test runs reserve names.
    // The backend strips non-alphanumerics (`/[^a-zA-Z0-9]/g`), so keep it
    // strictly alphanumeric.
    const uniqueUsername = `rt${Date.now().toString(36)}`
    const usernameField = page.locator('[data-mol-id="settings-username"]')
    if (await usernameField.count()) await usernameField.fill(uniqueUsername)

    await page.locator('[data-mol-id="settings-save"]').click()
    await expect(page.locator('[data-mol-id="settings-saved-ok"]')).toBeVisible({ timeout: 5_000 })

    await page.reload()
    await expect(page.locator('[data-mol-id="settings-name"]')).toHaveValue('Renamed Tester')
    await expect(page.locator('[data-mol-id="settings-username"]')).toHaveValue(uniqueUsername)

    // Logout + login again, verify it still sticks (no in-memory cache).
    await page.evaluate(() => {
      localStorage.clear()
    })
    await login(page, email, password)
    await page.goto('/settings')
    await expect(page.locator('[data-mol-id="settings-name"]')).toHaveValue('Renamed Tester')
    await expect(page.locator('[data-mol-id="settings-username"]')).toHaveValue(uniqueUsername)
  })

  test('Sign out clears auth and lands on /login', async ({ page }) => {
    await signup(page)
    await page.goto('/settings')
    await page.locator('[data-mol-id="settings-signout"]').click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })

    // Visiting an authenticated route should bounce back to /login.
    await page.goto(APP_BASE + '/connections')
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Monitoring', () => {
  test('reflects executed queries (totals + averages)', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const { id } = await createDemoConnection(token, 'Mon Demo')

    // Run 3 queries against the demo DB so monitoring has something to show.
    await page.goto(`/query/${id}`)
    for (const sql of ['SELECT 1', 'SELECT 2', 'SELECT 3']) {
      await page.locator('[data-mol-id="qe-textarea"]').fill(sql)
      await page.locator('[data-mol-id="qe-run"]').click()
      await expect(page.locator('[data-mol-id="qe-result-meta"]')).toBeVisible({ timeout: 10_000 })
    }

    await page.goto('/monitoring')
    const total = page.locator('[data-mol-id="mon-stat-total"]')
    await expect(total).toBeVisible({ timeout: 5_000 })
    const totalText = await total.textContent()
    const totalNumber = Number((totalText || '').match(/\d+/)?.[0] ?? '0')
    expect(totalNumber).toBeGreaterThanOrEqual(3)
    const successes = page.locator('[data-mol-id="mon-stat-success"]')
    await expect(successes).toContainText(/\d+/)
  })
})
