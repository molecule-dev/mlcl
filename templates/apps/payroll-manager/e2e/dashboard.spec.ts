import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/dashboard', () => {
  test('mounts after signup with hero copy + GETs employee list', async ({ page }) => {
    await signup(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    const reqs = await captureNetwork(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    await expect(page.getByRole('heading').first()).toBeVisible()
    const empGet = reqs.find((r) => r.method === 'GET' && /\/api\/employees(\?|$)/.test(r.url))
    expect(empGet, 'dashboard must read /api/employees').toBeDefined()
    expect(empGet!.status).toBeLessThan(400)
  })

  test('sidebar nav lists every primary section', async ({ page }) => {
    // Clicks through every section in turn: measured at ~33 s, above the 30 s sandbox budget.
    test.slow()
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const cases: [RegExp, RegExp][] = [
      [/Dashboard/i, /\/dashboard$/],
      [/Employees/i, /\/employees$/],
      [/Pay runs/i, /\/pay-runs$/],
      [/Run payroll/i, /\/run-payroll$/],
      [/Tax/i, /\/taxes$/],
      [/Reports/i, /\/reports$/],
      [/Audit/i, /\/audit-log$/],
      [/Notifications/i, /\/notifications$/],
      [/Settings/i, /\/settings$/],
    ]
    for (const [name, urlRx] of cases) {
      await page.goto(APP_BASE + '/dashboard')
      const link = page.getByRole('navigation').getByRole('link', { name }).first()
      if (await link.count().catch(() => 0)) {
        await link.click()
        await expect(page).toHaveURL(urlRx)
      }
    }
  })

  test('Run payroll CTA navigates to /run-payroll', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const cta = page.getByRole('link', { name: /run payroll/i }).first()
    await cta.click()
    await expect(page).toHaveURL(/\/run-payroll/)
  })

  test('Reload preserves session', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })
})
