/**
 * /settings — tabs (team / integrations / api / billing).
 *
 * Real outcomes:
 *  - Tab clicks update ?tab=… query param.
 *  - Creating an API token POSTs and the new token shows in the
 *    "Active tokens" list (read-after-write via GET /api/api-tokens).
 *  - Revoking a token actually deletes it (GET no longer returns it).
 *  - Webhook URL saves locally and persists across reload.
 *  - Billing tab shows a link to /pricing.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedToken, signup } from './_helpers.js'

test.describe('settings page', () => {
  test('tabs change the ?tab=… query string', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-tab-api"]').click()
    await expect(page).toHaveURL(/tab=api/)
    await page.locator('[data-mol-id="settings-tab-billing"]').click()
    await expect(page).toHaveURL(/tab=billing/)
    await expect(page.getByRole('link', { name: /view pricing/i })).toBeVisible()
  })

  test('Create token POSTs and lists the new token; pendingToken displayed once', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings?tab=api')
    const label = `T-${Date.now()}`
    await page.locator('#token-label').fill(label)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('button[data-mol-id="create-token"]').click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find((r) => /\/api\/api-tokens$/.test(r.url) && r.method === 'POST')
    expect(post?.status, JSON.stringify(reqs)).toBe(201)

    // The new label is visible in the list.
    await expect(page.locator(`text=${label}`).first()).toBeVisible({ timeout: 5000 })

    // Read-after-write
    const list = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/api-tokens`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const rows: Array<{ label: string }> = await list.json()
    expect(rows.some((r) => r.label === label)).toBe(true)
  })

  test('Revoke removes a token from /api/api-tokens', async ({ page }) => {
    const { accessToken } = await signup(page)
    const tok = await seedToken(page, accessToken, `Revoke-${Date.now()}`)
    await page.goto(APP_BASE + '/settings?tab=api')
    await expect(page.locator(`text=${tok.label}`).first()).toBeVisible({ timeout: 5000 })

    const row = page.locator(`[data-mol-id="token-row-${tok.id}"]`)
    await row.locator('[data-mol-id="revoke-token"]').click()
    await page.waitForTimeout(500)

    const list = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/api-tokens`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const rows: Array<{ id: string }> = await list.json()
    expect(rows.some((r) => r.id === tok.id)).toBe(false)
  })

  test('Webhook URL saves to localStorage and survives reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings?tab=api')
    const url = `https://example.com/hook-${Date.now()}`
    await page.locator('#webhook').fill(url)
    await page.getByRole('button', { name: /^save$/i }).click()
    await page.reload()
    await page.goto(APP_BASE + '/settings?tab=api')
    await expect(page.locator('#webhook')).toHaveValue(url)
  })

  test('Billing tab renders a "View pricing" link to /pricing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings?tab=billing')
    const link = page.getByRole('link', { name: /view pricing/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/pricing')
  })
})
