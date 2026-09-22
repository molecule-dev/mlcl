import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /settings — account / retention / billing tabs.

test.describe('/settings', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, /settings billing tab calls /api/billing/status and /api/billing/tiers', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      // Arm BEFORE the goto — both calls fire on mount.
      const statusHit = page.waitForResponse((r) => /\/api\/billing\/status/.test(r.url()), {
        timeout: 10_000,
      })
      const tiersHit = page.waitForResponse((r) => /\/api\/billing\/tiers/.test(r.url()), {
        timeout: 10_000,
      })
      await page.goto(APP_BASE + '/settings')
      await Promise.all([statusHit, tiersHit])
    })
    expect(reqs.find((r) => /\/api\/billing\/status/.test(r.url))).toBeDefined()
    expect(reqs.find((r) => /\/api\/billing\/tiers/.test(r.url))).toBeDefined()
  })

  test('saving the account form PATCHes /api/users/:id and persists the new name', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-tab-account"]').click()
    const newName = `Walker ${Date.now()}`
    await page.locator('#settings-name').fill(newName)
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && /\/api\/users\//.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="settings-account-save"]').click()
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(300)
    // Reload and confirm persisted.
    await page.reload()
    await page.locator('[data-mol-id="settings-tab-account"]').click()
    await expect(page.locator('#settings-name')).toHaveValue(newName, { timeout: 5_000 })
  })

  test('saving retention prefs PATCHes /api/preferences and persists across reload', async ({
    page,
  }) => {
    await signup(page)
    // The preferences slice loads on mount — arm before the goto.
    const prefsHit = page.waitForResponse((r) => /\/api\/preferences/.test(r.url()), {
      timeout: 10_000,
    })
    await page.goto(APP_BASE + '/settings')
    await prefsHit
    await page.locator('[data-mol-id="settings-tab-retention"]').click()
    await page.locator('#settings-hot-retention').fill('14')
    await page.locator('#settings-cold-retention').fill('180')
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && /\/api\/preferences/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="settings-retention-save"]').click()
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(300)
    // Reload — the server-side slice (not in-memory user state) must feed
    // the form, proving the prefs survive a full page load.
    // Arm BEFORE the reload — same race as the first load.
    const reloadHit = page.waitForResponse((r) => /\/api\/preferences/.test(r.url()), {
      timeout: 10_000,
    })
    await page.reload()
    await reloadHit
    await page.locator('[data-mol-id="settings-tab-retention"]').click()
    await expect(page.locator('#settings-hot-retention')).toHaveValue('14', { timeout: 5_000 })
    await expect(page.locator('#settings-cold-retention')).toHaveValue('180', { timeout: 5_000 })
  })

  test('billing tab "View all plans" navigates to /pricing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-tab-billing"]').click()
    await page.locator('[data-mol-id="settings-billing-pricing"]').click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('section tabs (account / retention / billing) toggle', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-tab-billing"]').click()
    await expect(page.locator('[data-mol-id="settings-billing"]')).toBeVisible()
    await page.locator('[data-mol-id="settings-tab-retention"]').click()
    await expect(page.locator('[data-mol-id="settings-retention-form"]')).toBeVisible()
    await page.locator('[data-mol-id="settings-tab-account"]').click()
    await expect(page.locator('[data-mol-id="settings-account-form"]')).toBeVisible()
  })

  test('renders the settings heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('account email change requires + sends the current password', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const newEmail = `walker-${Date.now()}@example.com`
    await page.locator('[data-mol-id="settings-tab-account"]').click()
    await page.locator('#settings-email').fill(newEmail)
    // Platform contract: changing the email requires the current password
    // (account-takeover defense). The form reveals the field on change.
    await page.locator('[data-mol-id="settings-account-current-password"]').fill('TestPass1234!')
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && /\/api\/users\//.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="settings-account-save"]').click()
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(300)
    // Confirm the new email actually stuck.
    const token = await getAccessToken(page)
    const meRes = await page.request.get(API_BASE + '/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await meRes.json()
    const me = body?.data ?? body?.props ?? body
    expect(me.email).toBe(newEmail)
  })
})
