import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, signupAndToken, unwrap } from './_helpers'

interface EmployeeRow {
  id: string
  first_name: string
  last_name: string
  email?: string | null
  title?: string | null
  status?: string
  ssn?: string | null
  ssn_encrypted?: string | null
}

test.describe('/employees/:id/edit', () => {
  test('preloads existing employee + persists edits round-trip', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const list = await apiGet<EmployeeRow[]>(page, token, '/employees')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: EmployeeRow[] }).data) ?? []
    const target = arr[0]

    await page.goto(APP_BASE + `/employees/${target.id}/edit`)
    await expect(page.getByRole('heading', { name: /update employee/i })).toBeVisible()
    await expect(page.locator('[data-testid="employee-first-name"]')).toHaveValue(target.first_name)

    const newTitle = 'Updated By Test ' + Date.now()
    await page.locator('[data-testid="employee-title"]').fill(newTitle)
    await page.locator('[data-testid="employee-status"]').selectOption('on_leave')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="employee-form-submit"]').click()
      await page.waitForURL(new RegExp(`/employees/${target.id}$`), { timeout: 15_000 })
    })
    const put = reqs.find(
      (r) => r.method === 'PUT' && r.url.includes(`/api/employees/${target.id}`),
    )
    expect(put, 'PUT /api/employees/:id must fire').toBeDefined()
    expect(put!.status).toBeLessThan(400)

    const re = await apiGet<EmployeeRow>(page, token, `/employees/${target.id}`)
    const data = unwrap<EmployeeRow>(re.body) ?? re.body
    expect(data.title).toBe(newTitle)
    expect(data.status).toBe('on_leave')
    expect(data).not.toHaveProperty('ssn_encrypted')
  })

  test('updating SSN re-masks correctly on next read', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const list = await apiGet<EmployeeRow[]>(page, token, '/employees')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: EmployeeRow[] }).data) ?? []
    const target = arr[0]
    await page.goto(APP_BASE + `/employees/${target.id}/edit`)
    await page.locator('[data-testid="employee-ssn"]').fill('999-88-7777')
    await page.locator('[data-testid="employee-form-submit"]').click()
    await page.waitForURL(new RegExp(`/employees/${target.id}$`), { timeout: 15_000 })
    const re = await apiGet<EmployeeRow>(page, token, `/employees/${target.id}`)
    const data = unwrap<EmployeeRow>(re.body) ?? re.body
    expect(data.ssn).toBe('***-**-7777')
  })

  test('Cancel returns to detail page without saving', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const list = await apiGet<EmployeeRow[]>(page, token, '/employees')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: EmployeeRow[] }).data) ?? []
    const target = arr[0]
    await page.goto(APP_BASE + `/employees/${target.id}/edit`)
    await page.locator('[data-testid="employee-first-name"]').fill('SomethingChanged')
    await page.getByRole('link', { name: /cancel/i }).click()
    await expect(page).toHaveURL(new RegExp(`/employees/${target.id}$`))
    const re = await apiGet<EmployeeRow>(page, token, `/employees/${target.id}`)
    const data = unwrap<EmployeeRow>(re.body) ?? re.body
    expect(data.first_name).toBe(target.first_name)
  })
})
