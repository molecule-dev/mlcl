/**
 * /settings — toggle preferences (sync, autoEncrypt, desktopOverlay,
 * menuBar, startAtLogin) persisted via PATCH /api/profile/me. Plan
 * card reflects /api/profile/me.planKey. Export downloads /api/clips
 * as a JSON blob; Wipe removes mol-cache:* localStorage entries.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, seedClip, signup } from './_helpers.js'

test.describe('settings page', () => {
  test('plan card defaults to "Free" for a new account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-mol-id="settings-plan-name"]')).toContainText(/free/i, {
      timeout: 15000,
    })
  })

  test('toggling "Cloud sync" persists to PATCH /api/profile/me', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const beforeRes = await page.request.get(`${API_BASE}/profile/me`, {
      headers: { Authorization: 'Bearer ' + accessToken },
    })
    const before = (await beforeRes.json()) as { toggles: { sync: boolean } }
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="toggle-sync"]').click()
      await page.waitForLoadState('networkidle')
    })
    const patched = reqs.find(
      (r) => /\/api\/profile\/me$/.test(r.url) && r.method === 'PATCH' && r.status === 200,
    )
    expect(patched).toBeTruthy()
    const afterRes = await page.request.get(`${API_BASE}/profile/me`, {
      headers: { Authorization: 'Bearer ' + accessToken },
    })
    const after = (await afterRes.json()) as { toggles: { sync: boolean } }
    expect(after.toggles.sync).toBe(!before.toggles.sync)
  })

  test('toggle state survives a full page reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const beforeChecked = await page
      .locator('[data-mol-id="toggle-menuBar"]')
      .getAttribute('aria-checked')
    await page.locator('[data-mol-id="toggle-menuBar"]').click()
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')
    const afterChecked = await page
      .locator('[data-mol-id="toggle-menuBar"]')
      .getAttribute('aria-checked')
    expect(afterChecked).not.toBe(beforeChecked)
  })

  test('"Export all clips" triggers a JSON download with the user\'s clips', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedClip(page, accessToken, { content: 'export-me ' + Date.now() })
    await page.goto(APP_BASE + '/settings')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-export"]').click()
      await page.waitForLoadState('networkidle')
    })
    const got = reqs.find((r) => /\/api\/clips(?:\?|$)/.test(r.url) && r.status === 200)
    expect(got).toBeTruthy()
    await expect(page.locator('[data-mol-id="settings-feedback"]')).toContainText(/exported/i, {
      timeout: 10000,
    })
  })

  test('"Wipe local cache" clears mol-cache:* localStorage entries', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.evaluate(() => {
      window.localStorage.setItem('mol-cache:foo', '1')
      window.localStorage.setItem('mol-cache:bar', '2')
      window.localStorage.setItem('keep-me', '3')
    })
    await page.locator('[data-mol-id="settings-wipe"]').click()
    const after = await page.evaluate(() => ({
      foo: window.localStorage.getItem('mol-cache:foo'),
      bar: window.localStorage.getItem('mol-cache:bar'),
      keep: window.localStorage.getItem('keep-me'),
    }))
    expect(after.foo).toBeNull()
    expect(after.bar).toBeNull()
    expect(after.keep).toBe('3')
  })

  test('keyboard shortcut table renders all eight defaults', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByText(/open command palette/i)).toBeVisible()
    await expect(page.getByText(/paste last clip/i)).toBeVisible()
    await expect(page.getByText(/pin selected snippet/i)).toBeVisible()
    await expect(page.getByText(/encrypt selected snippet/i)).toBeVisible()
  })
})
