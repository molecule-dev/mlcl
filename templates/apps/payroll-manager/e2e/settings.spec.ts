import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, signupAndToken, unwrap } from './_helpers'

interface CompanySettings {
  legal_name: string
  ein?: string
  address?: string
  cadence?: string
  cycle_end_day?: string
  pay_date_offset?: number
}

test.describe('/settings', () => {
  test('renders the company profile', async ({ page }) => {
    const { token } = await signupAndToken(page)
    // company_settings is created together with the employees seed
    // — touch /employees first so it exists.
    await apiGet(page, token, '/employees')
    // The name to look for comes from the API, not from the demo company:
    // the legal name is the first thing an app's owner changes.
    const settings = await apiGet<CompanySettings>(page, token, '/company-settings')
    const company = unwrap<CompanySettings>(settings.body) ?? settings.body
    expect(company.legal_name, 'company profile must carry a legal name').toBeTruthy()
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
    await expect(page.getByText(company.legal_name).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Edit profile, save, reload — change persists', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
    await page
      .getByRole('button', { name: /^edit$/i })
      .first()
      .click()
    const eins = page.locator('input[type="text"]').nth(1)
    const newEin = `99-${Math.floor(1_000_000 + Math.random() * 8_999_999)}`
    await eins.fill(newEin)
    await page
      .getByRole('button', { name: /^save$/i })
      .first()
      .click()
    await expect(page.getByText(/^saved\.$/i)).toBeVisible({ timeout: 5_000 })
    const re = await apiGet<CompanySettings>(page, token, '/company-settings')
    const data = unwrap<CompanySettings>(re.body) ?? re.body
    expect(data.ein).toBe(newEin)
    await page.reload()
    await expect(page.getByText(newEin)).toBeVisible({ timeout: 5_000 })
  })

  test('Edit pay schedule cadence, save — change reflected on reload', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
    // The schedule card is the second "Edit" button (after company profile)
    await page
      .getByRole('button', { name: /^edit$/i })
      .nth(1)
      .click()
    const cadenceSelect = page.getByRole('combobox').first()
    await cadenceSelect.selectOption('monthly')
    await page
      .getByRole('button', { name: /^save$/i })
      .first()
      .click()
    await expect(page.getByText(/^saved\.$/i)).toBeVisible({ timeout: 5_000 })
    const re = await apiGet<CompanySettings>(page, token, '/company-settings')
    const data = unwrap<CompanySettings>(re.body) ?? re.body
    expect(data.cadence).toBe('monthly')
  })
})
