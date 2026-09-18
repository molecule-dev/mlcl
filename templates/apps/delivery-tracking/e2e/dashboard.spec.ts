import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiRequest,
  asList,
  captureNetwork,
  expectNoConsoleErrors,
  signup,
  unwrap,
} from './_helpers.js'

test.describe('/dashboard', () => {
  test('renders the operations dashboard for an authed user', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(page.getByRole('heading', { name: /Operations dashboard/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: /In transit \+ flagged/i })).toBeVisible()
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/reports\/dashboard/.test(r.url)),
      'must GET /api/reports/dashboard',
    ).toBeTruthy()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/shipments(\?|$)/.test(r.url)),
      'must GET /api/shipments',
    ).toBeTruthy()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/alerts(\?|$)/.test(r.url)),
      'must GET /api/alerts',
    ).toBeTruthy()
  })

  test('"In transit" KPI value matches /api/reports/dashboard.in_transit', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(/^In transit$/i).first()).toBeVisible()
    const { status, body } = await apiRequest<unknown>(page, 'GET', '/api/reports/dashboard')
    expect(status).toBe(200)
    const stats = unwrap<{ in_transit: number }>(body)
    expect(typeof stats.in_transit).toBe('number')
    await expect(page.getByText(String(stats.in_transit), { exact: true }).first()).toBeVisible()
  })

  test('seeded shipments appear in the "In transit + flagged" feed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const { body } = await apiRequest<unknown>(page, 'GET', '/api/shipments')
    const list = asList<any>(body)
    const flagged = list.filter((s: any) =>
      ['in_transit', 'out_for_delivery', 'exception'].includes(s.status),
    )
    expect(flagged.length).toBeGreaterThan(0)
    await expect(page.getByText(flagged[0].tracking_number).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('"View all" link routes to /shipments', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /View all/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/shipments/)
  })

  test('dashboard does not surface unhandled errors', async ({ page }) => {
    const errors = expectNoConsoleErrors(page)
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /Operations dashboard/i })).toBeVisible()
    await page.waitForTimeout(1_500)
    expect(errors).toEqual([])
  })

  test('reload preserves the authed dashboard (token persists)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /Operations dashboard/i })).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /Operations dashboard/i })).toBeVisible()
  })
})
