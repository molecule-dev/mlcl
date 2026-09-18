import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, signupAndToken } from './_helpers'

interface EmployeeRow {
  id: string
  first_name: string
  last_name: string
  ssn?: string | null
}

test.describe('/employees/:id', () => {
  test('renders the detail card for a seeded employee', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const list = await apiGet<EmployeeRow[]>(page, token, '/employees')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: EmployeeRow[] }).data) ?? []
    expect(arr.length, 'demo seed must include employees').toBeGreaterThan(0)
    const target = arr[0]
    await page.goto(APP_BASE + `/employees/${target.id}`)
    await expect(page.getByText(new RegExp(target.first_name, 'i')).first()).toBeVisible()
    await expect(page.getByText(new RegExp(target.last_name, 'i')).first()).toBeVisible()
  })

  test('Edit link navigates to /employees/:id/edit', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const list = await apiGet<EmployeeRow[]>(page, token, '/employees')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: EmployeeRow[] }).data) ?? []
    const target = arr[0]
    await page.goto(APP_BASE + `/employees/${target.id}`)
    await page.locator('[data-testid="employee-edit-link"]').click()
    await expect(page).toHaveURL(new RegExp(`/employees/${target.id}/edit$`))
  })

  test('SSN field shows last-4 mask, never the raw encrypted blob', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const list = await apiGet<EmployeeRow[]>(page, token, '/employees')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: EmployeeRow[] }).data) ?? []
    const target = arr[0]
    await page.goto(APP_BASE + `/employees/${target.id}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    const html = await page.content()
    // Hard invariant: the encrypted SSN blob must NEVER reach the DOM.
    expect(html).not.toMatch(/ssn_encrypted/)
    // If the seeded employee carries an SSN, the page must render it as
    // the standard last-4 mask `***-**-NNNN` somewhere in the body text.
    if (target.ssn) {
      const bodyText = await page.locator('body').innerText()
      expect(bodyText, 'masked SSN must appear on the detail page').toMatch(/\*{3}-\*{2}-\d{4}/)
    }
  })

  test('Back-to-employees crumb returns to list', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const list = await apiGet<EmployeeRow[]>(page, token, '/employees')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: EmployeeRow[] }).data) ?? []
    const target = arr[0]
    await page.goto(APP_BASE + `/employees/${target.id}`)
    await page
      .getByRole('link', { name: /employees/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/employees$/)
  })
})
