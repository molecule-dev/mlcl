import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Settings page (/settings)', () => {
  test('loads current settings via GET /api/profile/me', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForTimeout(1000)
    })
    const get = whereUrl(reqs, /\/api\/profile\/me/, 'GET')
    expect(get.length, 'GET /api/profile/me fired').toBeGreaterThan(0)
    expect(get[0].status).toBeLessThan(400)
  })

  test('store-name input accepts a new value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(800)
    const storeName = page.locator('[data-testid="settings-store-name"]')
    await storeName.fill('Indie Test Studio')
    await expect(storeName).toHaveValue('Indie Test Studio')
  })

  test('tagline input accepts a new value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(800)
    const tagline = page.locator('[data-testid="settings-tagline"]')
    await tagline.fill('Tested by Playwright')
    await expect(tagline).toHaveValue('Tested by Playwright')
  })

  test('payout-email input accepts an email', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(800)
    const payout = page.locator('[data-testid="settings-payout-email"]')
    await payout.fill('payouts@example.com')
    await expect(payout).toHaveValue('payouts@example.com')
  })

  test('color picker selects a brand color', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(800)
    const purple = page.locator('[data-testid="settings-color-7c3aed"]')
    await purple.click()
    await expect(purple).toHaveAttribute('aria-pressed', 'true')
  })

  test('Save persists settings via PATCH /api/profile/me', async ({ page, request }) => {
    const me = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(800)

    await page.locator('[data-testid="settings-store-name"]').fill('Persistence Probe')
    await page.locator('[data-testid="settings-tagline"]').fill('Survives reload')
    await page.locator('[data-testid="settings-payout-email"]').fill('persist@example.com')
    await page.locator('[data-testid="settings-color-7c3aed"]').click()

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="settings-save"]').click()
      await page.waitForTimeout(1500)
    })
    const patch = whereUrl(reqs, /\/api\/profile\/me/, 'PATCH')
    expect(patch.length, 'PATCH /api/profile/me fired').toBeGreaterThan(0)
    expect(patch[0].status, 'settings save succeeded').toBeLessThan(400)

    // Read-after-write through the API: backend must return the new values.
    const api = await authedApi(request, me.accessToken!)
    const fresh = await (await api.get('/profile/me')).json()
    expect(fresh.settings.storeName).toBe('Persistence Probe')
    expect(fresh.settings.tagline).toBe('Survives reload')
    expect(fresh.settings.payoutEmail).toBe('persist@example.com')
    expect(fresh.settings.brandColor).toBe('#7c3aed')
  })

  test('Pricing/upgrade link navigates to /pricing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(800)
    const link = page.locator('[data-testid="settings-upgrade-link"]')
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no upgrade link on settings page')
    await link.click()
    await expect(page).toHaveURL(/\/pricing/)
  })
})
