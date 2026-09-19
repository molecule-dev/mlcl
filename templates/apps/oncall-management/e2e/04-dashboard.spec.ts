import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  getOverview,
  listIncidents,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/dashboard', () => {
  test('anonymous redirected off /dashboard', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 15_000 })
  })

  test('renders on-call now per schedule from /api/overview', async ({ page }) => {
    await signup(page, uniqueEmail('dash-oncall'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    const r = reqs.find((x) => x.method === 'GET' && /\/api\/overview(\?|$)/.test(x.url))
    expect(r, '/dashboard should fetch /api/overview').toBeTruthy()
    expect(r!.status).toBeLessThan(400)
    const overview = await getOverview(page)
    expect(overview.oncall_now.length, 'seeded schedules appear').toBeGreaterThan(0)
    // The on-call card grid anchors one card per schedule.
    for (const entry of overview.oncall_now.slice(0, 3)) {
      const card = page.locator(`a[href^="/schedules/"]`, { hasText: entry.schedule_name }).first()
      if (entry.oncall) {
        await expect(card).toBeVisible()
        await expect(card).toContainText(entry.oncall.name)
      }
    }
  })

  test('KPI counters render real numbers from the seed', async ({ page }) => {
    await signup(page, uniqueEmail('dash-kpi'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    const overview = await getOverview(page)
    const incidents = await listIncidents(page)
    expect(incidents.length).toBeGreaterThan(0)
    expect(overview.counts.open).toBeGreaterThan(0)
    // The unacked counter card must equal the API's triggered count once loaded.
    const unacked = page.locator('[data-stats-eyebrow]').filter({ hasText: 'Unacked' }).first()
    await expect(unacked).toBeVisible()
    await expect
      .poll(
        async () => {
          const text = (await unacked.innerText()).replace(/[^0-9]/g, '')
          const match = text.match(/\d+$/)
          return match ? Number(match[0]) : -1
        },
        { timeout: 10_000 },
      )
      .toBe(overview.counts.triggered)
  })

  test('sidebar links navigate to primary sections', async ({ page }) => {
    await signup(page, uniqueEmail('dash-nav'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    for (const path of [
      '/incidents',
      '/schedules',
      '/escalation-policies',
      '/postmortems',
      '/team',
      '/settings',
    ]) {
      const link = page.locator(`a[href="${path}"]`).first()
      if (await link.count()) {
        await expect(link).toBeVisible()
      }
    }
  })

  test('unacked critical incident shows the pager banner with an ack CTA', async ({ page }) => {
    await signup(page, uniqueEmail('dash-banner'))
    const overview = await getOverview(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    if (overview.counts.triggered > 0) {
      await expect(page.locator('[data-mol-id="dashboard-pager-ack"]').first()).toBeVisible()
    } else {
      expect(await page.locator('[data-mol-id="dashboard-pager-ack"]').count()).toBe(0)
    }
  })

  test('no console errors during dashboard load', async ({ page }) => {
    await signup(page, uniqueEmail('dash-clean'))
    const errs: string[] = []
    page.on('pageerror', (e) => errs.push(e.message))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    expect(errs).toEqual([])
  })
})
