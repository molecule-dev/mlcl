import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, API_BASE, signup } from './_helpers.js'

test.describe('/settings persists warehouse preferences', () => {
  test('changing prefs + saving + reloading retains the values', async ({ page }) => {
    const { accessToken, userId } = await signup(page)
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

    // Verify backend invariant: the user row's oauthData.warehousePrefs reflects our pick.
    const res = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.ok()).toBe(true)
    const json = (await res.json()) as {
      props: { oauthData?: { warehousePrefs?: Record<string, unknown> } }
    }
    const stored = json.props?.oauthData?.warehousePrefs ?? {}
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
