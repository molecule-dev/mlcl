/**
 * /devices — list + revoke. Every signup spawns a "current" device row;
 * the page must surface that, plus the sync-status pill ("Active now")
 * and a Sign-out button on non-current rows.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('devices page', () => {
  test('current device row is visible immediately after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/devices')
    await expect(page.getByText(/this device/i)).toBeVisible({ timeout: 15000 })
  })

  test('initial load fires GET /api/devices', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/devices')
      await page.waitForLoadState('networkidle')
    })
    const got = reqs.find((r) => /\/api\/devices(?:\?|$)/.test(r.url) && r.status === 200)
    expect(got).toBeTruthy()
  })

  test('sync summary shows the active device count', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/devices')
    await expect(page.locator('[data-mol-id="devices-summary"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="devices-summary"]')).toContainText(/1/)
  })

  test('current device row does NOT expose a Sign-out button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/devices')
    const currentRow = page
      .locator('[data-mol-id="devices-list"] > div')
      .filter({ hasText: /this device/i })
    await expect(currentRow.getByRole('button', { name: /sign out/i })).toHaveCount(0)
  })

  test('revoking another device removes it from the DB', async ({ page }) => {
    const { accessToken, userId } = await signup(page)
    const created = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/devices', {
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      data: { name: 'Phantom ' + Date.now(), userId },
      failOnStatusCode: false,
    })
    if (created.status() !== 201)
      test.skip(true, 'POST /devices not exposed; cannot exercise revoke flow.')
    const newId = ((await created.json()) as { id: string }).id
    await page.goto(APP_BASE + '/devices')
    await page
      .locator(`[data-mol-id="devices-list"] > div`)
      .filter({ hasText: 'Phantom' })
      .getByRole('button', { name: /sign out/i })
      .first()
      .click()
    await page.waitForLoadState('networkidle')
    const after = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/devices', {
      headers: { Authorization: 'Bearer ' + accessToken },
    })
    const list = (await after.json()) as Array<{ id: string }>
    expect(list.find((d) => d.id === newId)).toBeFalsy()
  })
})
