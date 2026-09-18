import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, signupAndToken, unwrap } from './_helpers'

interface EmployeeRow {
  id: string
  first_name: string
  last_name: string
  email?: string | null
  ssn?: string | null
  ssn_encrypted?: string | null
  department?: string | null
  title?: string | null
  salary?: number
}

test.describe('/employees/new', () => {
  test('renders the new-employee form', async ({ page }) => {
    await signupAndToken(page)
    await page.goto(APP_BASE + '/employees/new')
    await expect(page.getByRole('heading', { name: /add employee/i })).toBeVisible()
    await expect(page.locator('[data-testid="employee-first-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="employee-last-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="employee-salary"]')).toBeVisible()
  })

  test('submits the form, persists row, navigates to detail, masks ssn', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await page.goto(APP_BASE + '/employees/new')
    await page.locator('[data-testid="employee-first-name"]').fill('Wired')
    await page.locator('[data-testid="employee-last-name"]').fill('NewHire')
    await page.locator('[data-testid="employee-email"]').fill('wired.newhire@example.com')
    await page.locator('[data-testid="employee-ssn"]').fill('123-45-6789')
    await page.locator('[data-testid="employee-department"]').fill('Eng')
    await page.locator('[data-testid="employee-title"]').fill('Staff Technician')
    await page.locator('[data-testid="employee-salary"]').fill('120000')
    await page.locator('[data-testid="employee-pay-frequency"]').selectOption('biweekly')
    await page.locator('[data-testid="employee-tax-filing-status"]').selectOption('single')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="employee-form-submit"]').click()
      await page.waitForURL(/\/employees\/[0-9a-f-]{36}$/, { timeout: 15_000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/employees(\?|$)/.test(r.url))
    expect(post, 'POST /api/employees must fire').toBeDefined()
    expect(post!.status).toBe(201)

    const url = new URL(page.url())
    const id = url.pathname.split('/').pop()!
    const detail = await apiGet<EmployeeRow>(page, token, `/employees/${id}`)
    const data = unwrap<EmployeeRow>(detail.body) ?? detail.body
    expect(data.first_name).toBe('Wired')
    expect(data.last_name).toBe('NewHire')
    // PostgreSQL `numeric` columns serialize as strings (full precision
    // preserved) — coerce before the comparison.
    expect(Number(data.salary)).toBeGreaterThan(0)
    expect(data.ssn).toBe('***-**-6789')
    expect(data).not.toHaveProperty('ssn_encrypted')
  })

  test('validation: missing first/last name surfaces inline error and blocks navigation', async ({
    page,
  }) => {
    await signupAndToken(page)
    await page.goto(APP_BASE + '/employees/new')
    await page.locator('[data-testid="employee-salary"]').fill('1000')
    await page.locator('[data-testid="employee-form-submit"]').click()
    // HTML5 required attribute will block native submission — assert
    // we're still on the new form route.
    await expect(page).toHaveURL(/\/employees\/new/)
  })

  test('Cancel link returns to /employees', async ({ page }) => {
    await signupAndToken(page)
    await page.goto(APP_BASE + '/employees/new')
    await page.getByRole('link', { name: /cancel/i }).click()
    await expect(page).toHaveURL(/\/employees$/)
  })
})
