/**
 * /settings — display name + email come from auth, theme + notification
 * preferences persist across reloads, profile save round-trips through
 * PATCH /users/:id.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiSignupAndPrime,
  authHeaders,
  getAccessToken,
  uniqueEmail,
} from './_helpers.js'

test.describe('settings page', () => {
  test('preloads the authenticated user (no Alex Rivera placeholder)', async ({ page }) => {
    const { email, name } = await apiSignupAndPrime(
      page,
      uniqueEmail('set-load'),
      'TestPass123!',
      'Casey Loaded',
    )
    await page.goto(APP_BASE + '/settings')
    const display = page.locator('[data-mol-id="settings-display-name"]')
    await expect(display).toHaveValue(name)
    const emailInput = page.locator('[data-mol-id="settings-email"]')
    await expect(emailInput).toHaveValue(email)
    const body = await page.locator('body').innerText()
    expect(body).not.toContain('Alex Rivera')
    expect(body).not.toContain('alex.rivera@pulse.com')
  })

  test('saving display name round-trips through PATCH /users/:id', async ({ page }) => {
    const { accessToken, userId } = await apiSignupAndPrime(
      page,
      uniqueEmail('set-save'),
      'TestPass123!',
      'Initial Name',
    )
    expect(userId).toBeTruthy()
    await page.goto(APP_BASE + '/settings')
    const display = page.locator('[data-mol-id="settings-display-name"]')
    await display.fill('Updated Name')
    await page.locator('[data-mol-id="settings-save-profile"]').click()
    await expect(page.locator('[data-mol-id="settings-saved-notice"]')).toBeVisible()
    const fresh = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: authHeaders(accessToken),
    })
    const body = (await fresh.json()) as { props?: { name?: string } }
    expect(body.props?.name).toBe('Updated Name')
  })

  test('theme toggle persists across reload (storage adapter wired)', async ({ page }) => {
    await apiSignupAndPrime(page, uniqueEmail('set-theme'))
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-theme-dark"]').click()
    await expect
      .poll(async () => {
        return await page.evaluate(() => document.documentElement.getAttribute('data-mol-theme'))
      })
      .toBe('dark')
    const stored = await page.evaluate(() => window.localStorage.getItem('molecule-theme'))
    expect(stored).toBe('dark')
    await page.reload()
    const themeAfterReload = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-theme'),
    )
    expect(themeAfterReload).toBe('dark')
  })

  test('notification preferences persist across reload', async ({ page }) => {
    await apiSignupAndPrime(page, uniqueEmail('set-notif'))
    await page.goto(APP_BASE + '/settings')
    const desktop = page.locator('[data-mol-id="settings-toggle-desktop"]')
    // Take the baseline only once the toggle is actually rendered, so `before`
    // is the real starting state rather than whatever existed mid-render.
    await expect(desktop).toBeVisible()
    const before = await desktop.getAttribute('aria-checked')
    await desktop.click()
    await expect.poll(async () => await desktop.getAttribute('aria-checked')).not.toBe(before)
    await page.reload()
    // After a reload the toggle first renders its DEFAULT and only flips once the
    // saved preference is fetched, so a single getAttribute() here raced that
    // request and read the pre-hydration value — the test then failed and passed
    // on retry. Poll until the persisted value shows up.
    await expect
      .poll(
        async () =>
          page.locator('[data-mol-id="settings-toggle-desktop"]').getAttribute('aria-checked'),
        { timeout: 10_000, message: 'toggle must keep its new value across a reload' },
      )
      .not.toBe(before)
  })

  test('logout button clears auth state and lands on /login', async ({ page }) => {
    await apiSignupAndPrime(page, uniqueEmail('set-logout'))
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-logout"]').click()
    await page.waitForURL('**/login', { timeout: 10000 })
    const token = await getAccessToken(page)
    expect(token).toBeFalsy()
  })
})
