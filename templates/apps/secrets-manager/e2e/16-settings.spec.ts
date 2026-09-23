import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, signup } from './_helpers'

// /settings — workspace + account + plan controls. GET /api/billing/status
// is fetched on load to render the plan card.

test.describe('/settings', () => {
  test('renders plan card backed by /api/billing/status', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForTimeout(1500)
    })
    const status = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url))
    expect(status, 'GET /api/billing/status should fire on /settings').toBeDefined()
    expect(status!.status).toBe(200)
    await expect(page.locator('[data-mol-id="settings-billing-plan"]')).toBeVisible()
  })

  test('Upgrade CTA links to /pricing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(1500)
    const cta = page.locator('[data-mol-id="settings-billing-upgrade"]')
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', /\/pricing/)
  })

  test('Saving the organisation name PATCHes /api/settings/me and persists across reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(1500)
    const orgName = 'Arcanum Labs ' + Date.now()
    await page.locator('[data-mol-id="settings-org-name"]').fill(orgName)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-org-save"]').click()
      await page.waitForTimeout(1500)
    })
    // The org pref lives in the app-owned server-side slice. The platform
    // user resource NEVER returns `oauthData` on reads, so a write via
    // PATCH /api/users/:id evaporates on the next GET /users/me — the
    // settings channel is the only persistence that survives a reload.
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/settings\/me$/.test(r.url))
    expect(patch, 'PATCH /api/settings/me should fire on org save').toBeDefined()
    expect(patch!.status, 'org save should succeed').toBeLessThan(300)
    // Reload-and-read: org name persists through the settings channel.
    await page.reload()
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-mol-id="settings-org-name"]')).toHaveValue(orgName)
    // Truth from API.
    const me = await apiFetch(page, 'GET', '/settings/me')
    expect(me.status).toBe(200)
    const slice = me.json as { settings: { org: { name: string } } }
    expect(slice.settings.org.name).toBe(orgName)
  })

  test('Saving the account display name PATCHes /api/users/:id and persists across reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(1500)
    const accountName = 'Cypher Walker ' + Date.now()
    await page.locator('[data-mol-id="settings-account-name"]').fill(accountName)
    await page.locator('[data-mol-id="settings-account-save"]').click()
    await page.waitForTimeout(1500)
    await page.reload()
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-mol-id="settings-account-name"]')).toHaveValue(accountName)
    const me = await apiFetch(page, 'GET', '/users/me')
    expect((me.json as { props: { name?: string } }).props.name).toBe(accountName)
  })
})
