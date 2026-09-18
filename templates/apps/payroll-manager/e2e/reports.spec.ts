import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, signupAndToken, unwrap } from './_helpers'

test.describe('/reports', () => {
  test('mounts and fires the three report endpoints', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    await expect(page.getByRole('heading').first()).toBeVisible()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/reports\/payroll-summary/.test(r.url)),
      'payroll-summary GET expected',
    ).toBeDefined()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/reports\/department-costs/.test(r.url)),
      'department-costs GET expected',
    ).toBeDefined()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/reports\/tax-liability/.test(r.url)),
      'tax-liability GET expected',
    ).toBeDefined()
  })

  test('GET /api/reports/department-costs returns rows after seed', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    const { status, body } = await apiGet<{
      departments: { department: string; head_count: number; total_salary: number }[]
    }>(page, token, '/reports/department-costs')
    expect(status).toBe(200)
    const data = unwrap<{ departments: Array<{ head_count: number }> }>(body) ?? body
    expect(
      data.departments.length,
      'department-costs must include at least one department',
    ).toBeGreaterThan(0)
    const totalHead = data.departments.reduce((s, d) => s + (d.head_count ?? 0), 0)
    expect(totalHead, 'department head-count rollup must be > 0 after seed').toBeGreaterThan(0)
  })
})
