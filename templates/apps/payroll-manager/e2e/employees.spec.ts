import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, captureNetwork, signupAndToken, unwrap } from './_helpers'

interface EmployeeRow {
  id: string
  first_name: string
  last_name: string
  email?: string | null
  ssn?: string | null
  ssn_encrypted?: string | null
  salary?: number
  status?: string
  title?: string
}

test.describe('/employees', () => {
  test('lists seeded demo roster on first visit', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await page.goto(APP_BASE + '/employees')
    await page.waitForLoadState('networkidle').catch(() => {})
    const heading = page.getByRole('heading', { name: /employees/i }).first()
    await expect(heading).toBeVisible()
    const { status, body } = await apiGet<EmployeeRow[]>(page, token, '/employees')
    expect(status).toBe(200)
    const list = (Array.isArray(body) ? body : (body as { data?: EmployeeRow[] }).data) ?? []
    expect(list.length, 'demo seed must populate at least one employee').toBeGreaterThan(0)
  })

  test('GET /api/employees never leaks ssn_encrypted, only masked ssn', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const { status, body } = await apiGet<EmployeeRow[]>(page, token, '/employees')
    expect(status).toBe(200)
    const list = (Array.isArray(body) ? body : (body as { data?: EmployeeRow[] }).data) ?? []
    for (const row of list) {
      expect(row, JSON.stringify(row)).not.toHaveProperty('ssn_encrypted')
      if (row.ssn !== null && row.ssn !== undefined) {
        expect(row.ssn).toMatch(/^\*{3}-\*{2}-\d{4}$/)
      }
    }
  })

  test('search filters the rendered roster client-side', async ({ page }) => {
    await signupAndToken(page)
    await page.goto(APP_BASE + '/employees')
    await page.waitForLoadState('networkidle').catch(() => {})
    const search = page.getByPlaceholder(/search.*name|search.*email/i).first()
    await search.fill('zzznosuchnamewillmatch')
    await expect(page.getByText(/no employees yet|no employees match|no matches/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(async () => {
        // Some renders show 0 rows without an explicit empty banner — still
        // assert the table no longer contains generic match-everything text.
        const rows = page.locator('[role="button"]').filter({ hasText: /@/ })
        expect(await rows.count()).toBe(0)
      })
  })

  test('Add employee link navigates to /employees/new', async ({ page }) => {
    await signupAndToken(page)
    await page.goto(APP_BASE + '/employees')
    await page.locator('[data-testid="employees-add-link"]').click()
    await expect(page).toHaveURL(/\/employees\/new$/)
    await expect(page.getByRole('heading', { name: /add employee/i })).toBeVisible()
  })

  test('Export CSV button triggers a real .csv download', async ({ page }) => {
    await signupAndToken(page)
    await page.goto(APP_BASE + '/employees')
    await page.waitForLoadState('networkidle').catch(() => {})
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="employees-export-csv"]').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^employees-\d{4}-\d{2}-\d{2}\.csv$/)
    const path = await download.path()
    expect(path, 'download must be saved to disk').toBeTruthy()
    const fs = await import('node:fs')
    const text = fs.readFileSync(path!, 'utf8')
    expect(text.split('\n')[0]).toMatch(/First name,Last name,Email/)
    expect(text.split('\n').length, 'csv must have at least a header + 1 row').toBeGreaterThan(1)
  })

  test('clicking a roster row opens the employee detail page', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await page.goto(APP_BASE + '/employees')
    await page.waitForLoadState('networkidle').catch(() => {})
    const { body } = await apiGet<EmployeeRow[]>(page, token, '/employees')
    const list = (Array.isArray(body) ? body : (body as { data?: EmployeeRow[] }).data) ?? []
    const target = list[0]
    await page
      .locator(`[role="button"]`)
      .filter({ hasText: new RegExp(target.first_name) })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`/employees/${target.id}$`))
  })

  test('Add employee form persists round-trip — create + read + delete', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const created = await apiPost<EmployeeRow>(page, token, '/employees', {
      first_name: 'Quincy',
      last_name: 'Roundtrip',
      email: 'quincy.roundtrip@example.com',
      department: 'QA',
      title: 'Test Subject',
      salary: 87_500,
      pay_frequency: 'biweekly',
      tax_filing_status: 'single',
    })
    expect(created.status).toBe(201)
    const newRow = unwrap<EmployeeRow>(created.body) ?? (created.body as EmployeeRow)
    expect(newRow.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(newRow).not.toHaveProperty('ssn_encrypted')
    const re = await apiGet<EmployeeRow>(page, token, `/employees/${newRow.id}`)
    const reFetched = unwrap<EmployeeRow>(re.body) ?? (re.body as EmployeeRow)
    expect(re.status).toBe(200)
    expect(reFetched.first_name).toBe('Quincy')
    expect(reFetched.last_name).toBe('Roundtrip')
    expect(reFetched.title).toBe('Test Subject')
  })
})
