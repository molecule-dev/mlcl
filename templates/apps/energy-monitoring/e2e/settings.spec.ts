import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getMe, listRatePlans, signup } from './_helpers.js'

test.describe('Settings /settings', () => {
  test('rate plan section loads existing seeded plan', async ({ page }) => {
    const { accessToken } = await signup(page)
    const plans = await listRatePlans(page, accessToken)
    expect(plans.length).toBeGreaterThan(0)

    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="settings-rate-form"]')).toBeVisible()
  })

  test('rate plan save round-trips through /api/costs/rates', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    // Switch to flat rate so we don't have to fiddle with the peak window
    // validation; flat-only is one of the two valid presets.
    await page.locator('[data-mol-id="settings-rate-preset-flat"]').first().click()
    await page.locator('[data-mol-id="settings-flat-rate"]').fill('0.27')
    await page.locator('[data-mol-id="settings-currency"]').fill('USD')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-rate-save"]').first().click()
      await expect(page.locator('[data-mol-id="settings-rate-saved"]')).toBeVisible({
        timeout: 10000,
      })
    })
    const write = reqs.find(
      (r) => /^(POST|PUT)$/.test(r.method) && /\/api\/costs\/rates/.test(r.url),
    )
    expect(write, 'expected POST or PUT /api/costs/rates').toBeTruthy()
    expect(write!.status).toBeLessThan(300)

    const after = await listRatePlans(page, accessToken)
    const active = after.find((p) => p.status === 'active') ?? after[0]
    expect(Number(active.rate_per_kwh)).toBeCloseTo(0.27, 2)
    expect(active.currency).toBe('USD')
    // Flat preset clears peak fields.
    expect(active.peak_rate).toBeNull()
  })

  test('notifications panel saves notifyPush/notifyEmail to /api/me', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    await page.locator('[data-mol-id="settings-section-notifications"]').first().click()
    // Toggle email OFF
    const emailToggle = page.locator('[data-mol-id="settings-notify-email"]').first()
    const wasOn = (await emailToggle.getAttribute('aria-pressed')) === 'true'
    await emailToggle.click()

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-notify-save"]').first().click()
      await expect(page.locator('[data-mol-id="settings-notify-saved"]')).toBeVisible({
        timeout: 10000,
      })
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/me(\?|$)/.test(r.url))
    expect(patch, 'expected PATCH /api/me').toBeTruthy()
    expect(patch!.status).toBeLessThan(300)

    const me = await getMe(page, accessToken)
    expect(me.notifyEmail).toBe(!wasOn)
  })

  test('Data export section downloads a CSV', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.locator('[data-mol-id="settings-section-export"]').first().click()
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.locator('[data-mol-id="settings-export-csv"]').first().click(),
    ])
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/\.csv$/i)
  })
})
