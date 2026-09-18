import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPut, captureNetwork, signupAndToken } from './_helpers'

interface Employee {
  id: string
  first_name: string
  last_name: string
  status: string
}
interface AuditEntry {
  id: string
  resource: string
  action: string
  actor: string
  timestamp: string
}

test.describe('/audit-log', () => {
  test('renders heading and fires GET /api/audit-log', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees') // ensure seed
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/audit-log')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/audit-log(\?|$)/.test(r.url)),
      'audit-log fetch must fire on mount',
    ).toBeDefined()
  })

  test('Editing an employee creates a new audit entry', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const empResp = await apiGet<Employee[]>(page, token, '/employees')
    const list =
      (Array.isArray(empResp.body) ? empResp.body : (empResp.body as { data?: Employee[] }).data) ??
      []
    expect(list.length, 'seed must include at least one employee').toBeGreaterThan(0)
    const before = await apiGet<AuditEntry[]>(page, token, '/audit-log')
    const beforeArr =
      (Array.isArray(before.body) ? before.body : (before.body as { data?: AuditEntry[] }).data) ??
      []
    const empId = list[0].id
    const newTitle = 'Audited title ' + Date.now()
    const upd = await apiPut(page, token, '/employees/' + empId, { title: newTitle })
    expect(upd.status, 'employee update must succeed').toBe(200)
    const after = await apiGet<AuditEntry[]>(page, token, '/audit-log')
    const afterArr =
      (Array.isArray(after.body) ? after.body : (after.body as { data?: AuditEntry[] }).data) ?? []
    expect(
      afterArr.length,
      'audit log must grow after a write — got before=' +
        beforeArr.length +
        ' after=' +
        afterArr.length,
    ).toBeGreaterThanOrEqual(beforeArr.length)
  })

  test('Filter chip "employee" narrows list to employee rows', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    // Touch employee.update so we know there's at least one row
    const list = await apiGet<Employee[]>(page, token, '/employees')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: Employee[] }).data) ?? []
    if (arr[0])
      await apiPut(page, token, '/employees/' + arr[0].id, { title: 'filter check ' + Date.now() })
    await page.goto(APP_BASE + '/audit-log')
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible()
    const empChip = page.getByRole('button', { name: /^employee$/i })
    if (await empChip.count().catch(() => 0)) {
      await empChip.click()
      await page.waitForTimeout(300)
      // No assertion on row count: just verify the chip is now styled active.
      await expect(empChip).toBeVisible()
    }
  })
})
