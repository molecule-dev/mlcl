import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, API_BASE, signup } from './_helpers.js'

test.describe('/settings persists warehouse preferences', () => {
  test('changing prefs + saving + reloading retains the values', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings-page')).toBeVisible()
    await expect(page.getByTestId('settings-form')).toBeVisible()

    // Change low-stock to a non-default value.
    const lowStock = page.getByTestId('settings-low-stock')
    await lowStock.fill('77')
    await page.getByTestId('settings-carrier').selectOption('fedex')
    const autoAlloc = page.getByTestId('settings-auto-allocate')
    if (await autoAlloc.isChecked()) await autoAlloc.uncheck()
    await page.getByTestId('settings-save').click()
    await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 8000 })

    // Verify backend invariant: the per-user preferences row reflects our pick.
    // (The platform user resource never returns oauthData on reads — the
    // server-side /preferences channel is the persistence of record.)
    const res = await page.request.get(`${API_BASE}/preferences`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.ok()).toBe(true)
    const json = (await res.json()) as { warehousePrefs?: Record<string, unknown> }
    const stored = json.warehousePrefs ?? {}
    expect(Number(stored.lowStockThreshold)).toBe(77)
    expect(stored.defaultCarrier).toBe('fedex')
    expect(stored.autoAllocateRush).toBe(false)

    // Reload the page; the saved values come back without re-saving.
    await page.reload()
    await expect(page.getByTestId('settings-form')).toBeVisible()
    await expect(page.getByTestId('settings-low-stock')).toHaveValue('77')
    await expect(page.getByTestId('settings-carrier')).toHaveValue('fedex')
    expect(await page.getByTestId('settings-auto-allocate').isChecked()).toBe(false)
  })
})
