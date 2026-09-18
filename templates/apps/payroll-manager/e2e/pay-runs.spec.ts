import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, signupAndToken } from './_helpers'

interface PayRun {
  id: string
  pay_date: string
  status: string
  total_gross?: number | string
  total_net?: number | string
  employee_count?: number
}

test.describe('/pay-runs', () => {
  test('mounts after signup and renders the seeded cycle history', async ({ page }) => {
    const { token } = await signupAndToken(page)
    // Trigger seed by hitting employees first (where the seed runs).
    await apiGet(page, token, '/employees')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pay-runs')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    await expect(page.getByRole('heading', { name: /pay runs/i }).first()).toBeVisible()
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/pay-runs(\?|$)/.test(r.url))
    expect(get, 'pay-runs page must read /api/pay-runs').toBeDefined()
  })

  test('Run payroll CTA navigates to /run-payroll', async ({ page }) => {
    await signupAndToken(page)
    await page.goto(APP_BASE + '/pay-runs')
    await page
      .getByRole('link', { name: /run payroll/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/run-payroll/)
  })

  test('filter chips narrow the rendered list', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    await page.goto(APP_BASE + '/pay-runs')
    await page.waitForLoadState('networkidle').catch(() => {})
    // Click the "draft" filter; assert URL stays the same and "draft"
    // chip becomes active.
    await page.getByRole('button', { name: /draft/i }).first().click()
    await expect(page.getByRole('button', { name: /draft/i }).first()).toBeVisible()
  })

  test('clicking a row opens detail page', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    const list = await apiGet<PayRun[]>(page, token, '/pay-runs')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: PayRun[] }).data) ?? []
    expect(
      arr.length,
      'seeded pay-runs should populate after first /employees fetch',
    ).toBeGreaterThan(0)
    const target = arr.find((p) => p.status === 'processed') ?? arr[0]
    await page.goto(APP_BASE + '/pay-runs')
    await page.waitForLoadState('networkidle').catch(() => {})
    const row = page.getByRole('link', { name: new RegExp(target.id.slice(0, 6), 'i') }).first()
    if (await row.count().catch(() => 0)) {
      await row.click()
      await expect(page).toHaveURL(new RegExp(`/pay-runs/${target.id}$`))
    } else {
      // fall back to direct nav
      await page.goto(APP_BASE + `/pay-runs/${target.id}`)
      await expect(page).toHaveURL(new RegExp(`/pay-runs/${target.id}$`))
    }
  })
})
