import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, completeOnboarding, signup } from './_helpers.js'

test.describe('/weight (WeightTracking)', () => {
  test('Unit toggle switches lb ↔ kg and refetches /api/weight', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/weight')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^kg$/i }).first().click()
      await page.waitForTimeout(700)
    })
    const get = reqs.find((r) => /\/api\/weight/.test(r.url) && r.method === 'GET')
    expect(get).toBeTruthy()
  })

  test('"Log weight" toggle reveals the inline form', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/weight')
    await page
      .getByRole('button', { name: /log weight/i })
      .first()
      .click()
    await expect(page.locator('input[type=number]').first()).toBeVisible()
  })

  test('Weight number input accepts a value', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/weight')
    await page
      .getByRole('button', { name: /log weight/i })
      .first()
      .click()
    const inp = page.locator('input[type=number]').first()
    await inp.fill('170.5')
    await expect(inp).toHaveValue('170.5')
  })

  test('Save submits weight (lb-converted to kg) and the new entry appears', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/weight')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page
      .getByRole('button', { name: /log weight/i })
      .first()
      .click()
    await page.locator('input[type=number]').first().fill('170.5')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Save$/i })
        .first()
        .click()
      await page.waitForTimeout(900)
    })
    const post = reqs.find((r) => /\/api\/weight($|\?)/.test(r.url) && r.method === 'POST')
    expect(post).toBeTruthy()
    const weights = await api<Array<{ weight_kg: number | string }>>(
      page,
      'GET',
      '/weight?limit=12',
    )
    expect(weights.length).toBeGreaterThan(0)
    const kg = Number(weights[0].weight_kg)
    expect(Math.abs(kg - 77.34)).toBeLessThan(0.5)
  })

  test('Empty state shows when user has no logs', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/weight')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await expect(page.getByText(/no weigh-ins yet|log your first/i).first()).toBeVisible()
  })

  test('Trend SVG renders once two entries exist', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    // Seed two entries server-side
    await api(page, 'POST', '/weight', { weight_kg: 78.0 })
    await api(page, 'POST', '/weight', { weight_kg: 77.5 })
    await page.goto(APP_BASE + '/weight')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await expect(page.locator('svg polyline').first()).toBeVisible({ timeout: 5_000 })
  })
})
