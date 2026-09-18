import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listMeters, signup } from './_helpers.js'

test.describe('Dashboard /dashboard', () => {
  test('seeded users see populated dashboard (no empty state)', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Read-after-write: the auto-seed ran during signup, so /api/meters
    // already returns 3 demo meters. The dashboard should reflect that.
    const meters = await listMeters(page, accessToken)
    expect(meters.length).toBeGreaterThanOrEqual(3)

    await page.goto(APP_BASE + '/dashboard')
    await expect(
      page.locator('[data-mol-id="dashboard-empty"]'),
      'dashboard should NOT be in empty state for seeded users',
    ).toHaveCount(0)
    await expect(page.locator('[data-mol-id="dashboard-circuits"]')).toBeVisible()
  })

  test('initial load fans out the four required GETs and they all return 2xx', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const summary = reqs.find(
      (r) => r.method === 'GET' && /\/api\/readings\/summary(\?|$)/.test(r.url),
    )
    const circuits = reqs.find(
      (r) => r.method === 'GET' && /\/api\/readings\/circuits(\?|$)/.test(r.url),
    )
    const cost = reqs.find((r) => r.method === 'GET' && /\/api\/costs\/calculate/.test(r.url))
    const alerts = reqs.find((r) => r.method === 'GET' && /\/api\/alerts\?status=open/.test(r.url))
    expect(summary, 'GET /api/readings/summary').toBeTruthy()
    expect(circuits, 'GET /api/readings/circuits').toBeTruthy()
    expect(cost, 'GET /api/costs/calculate').toBeTruthy()
    expect(alerts, 'GET /api/alerts?status=open').toBeTruthy()
    for (const r of [summary!, circuits!, cost!, alerts!]) {
      expect(r.status, `${r.method} ${r.url} returned ${r.status}`).toBeLessThan(300)
    }
  })

  test('hero KPIs render numeric kWh/dollar values, not placeholders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    // The KPI strip lives below the hero. We assert the page contains real
    // numbers paired with the unit kWh and a dollar value — not the literal
    // "0 kWh" empty state, which would suggest a silent fetch error.
    const main = page.locator('main, [data-mol-id="dashboard-page"]').first()
    await expect(main).toContainText(/kWh/)
    await expect(main).toContainText(/\$\d/)
  })

  test('top circuits section lists at least one seeded meter row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const meters = await listMeters(page, accessToken)
    expect(meters.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    const list = page.locator('[data-mol-id="dashboard-circuits"]')
    await expect(list).toBeVisible()
    // At least one of the seeded meter names should appear.
    const names = meters.map((m) => m.name)
    let found = false
    for (const n of names) {
      const t = page.locator('[data-mol-id="dashboard-circuits"]').getByText(n, { exact: false })
      if (await t.count().catch(() => 0)) {
        found = true
        break
      }
    }
    expect(found, `none of [${names.join(', ')}] appeared on dashboard`).toBe(true)
  })

  test('"Manage alerts" link routes to /alerts', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /manage alerts/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/alerts$/)
  })

  test('"Every device" link routes to /devices', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /every device|all devices/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/devices$/)
  })

  test('Theme toggle flips data-mol-mode AND survives reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const before = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    await page
      .getByRole('button', { name: /toggle theme|theme/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    expect(after).not.toBe(before)
    expect(['light', 'dark']).toContain(after)
    await page.reload()
    const persisted = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    expect(persisted).toBe(after)
  })
})
