import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, apiFetch, captureNetwork, signup } from './_helpers'

// /settings — three sections: organization, account, billing.
// API: GET /api/users/me, GET /api/billing/status, PATCH /api/users/me.

test.describe('/settings', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('GET /api/users/me + GET /api/billing/status fire on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForTimeout(2000)
    })
    const me = reqs.find((r) => r.method === 'GET' && /\/api\/users\/me$/.test(r.url))
    const billing = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url))
    expect(me, 'GET /api/users/me should fire').toBeDefined()
    expect(me!.status).toBe(200)
    expect(billing, 'GET /api/billing/status should fire').toBeDefined()
    expect(billing!.status).toBe(200)
    await expect(page.locator('[data-mol-id="page-settings"]')).toBeVisible()
  })

  test('renders organization section by default', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-mol-id="settings-org-section"]')).toBeVisible()
  })

  test('switching to "account" section reveals account form with email', async ({ page }) => {
    const creds = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(2000)
    await page.locator('[data-mol-id="settings-nav-account"]').click()
    await expect(page.locator('[data-mol-id="settings-account-section"]')).toBeVisible()
    // The email lives in an <input value>, and toContainText reads TEXT content,
    // not input values — so it never saw it, while the user id (rendered as text)
    // passed. Assert the field itself.
    await expect(page.locator('#settings-account-email-input')).toHaveValue(creds.email)
  })

  test('switching to "billing" section reveals plan info', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(2000)
    await page.locator('[data-mol-id="settings-nav-billing"]').click()
    await expect(page.locator('[data-mol-id="settings-billing-section"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-billing-upgrade"]')).toBeVisible()
  })

  test('upgrade button navigates to /pricing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(2000)
    await page.locator('[data-mol-id="settings-nav-billing"]').click()
    await page.locator('[data-mol-id="settings-billing-upgrade"]').click()
    await expect(page).toHaveURL(/\/pricing/, { timeout: 5000 })
  })

  test('saving organization name PATCHes /api/settings and persists org_name', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(2000)
    const orgName = `acme-${Date.now()}`
    await page.locator('[data-mol-id="settings-org-name-input"]').fill(orgName)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-org-save"]').click()
      await page.waitForTimeout(2000)
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/settings/.test(r.url))
    expect(patch, 'PATCH /api/settings should fire').toBeDefined()
    expect(patch!.status).toBeGreaterThanOrEqual(200)
    expect(patch!.status).toBeLessThan(300)
    // Read-after-write through the app's own settings channel. (The platform
    // user resource NEVER returns oauthData on reads, so /users/me can't
    // prove persistence — /api/settings reads the stored slice server-side.)
    const me = await apiFetch(page, 'GET', '/settings')
    const settings = me.json as { settings?: { org_name?: string } }
    expect(settings.settings?.org_name).toBe(orgName)
  })

  test('saving display name PATCHes /api/users/me and persists name', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(2000)
    await page.locator('[data-mol-id="settings-nav-account"]').click()
    const next = `Foo Bar ${Date.now()}`
    await page.locator('[data-mol-id="settings-account-name-input"]').fill(next)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-account-save"]').click()
      await page.waitForTimeout(2000)
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/users\/me/.test(r.url))
    expect(patch, 'PATCH /api/users/me should fire').toBeDefined()
    expect(patch!.status).toBeGreaterThanOrEqual(200)
    expect(patch!.status).toBeLessThan(300)
    // Read-after-write: name persisted.
    const me = await apiFetch(page, 'GET', '/users/me')
    expect((me.json as { props?: { name?: string } }).props?.name).toBe(next)
  })
})
