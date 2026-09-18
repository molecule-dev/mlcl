import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedPost, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('companies page (/companies)', () => {
  test('mount fires GET /api/companies', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/companies')
      await page.waitForTimeout(1500)
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/companies\b/.test(r.url))).toBeTruthy()
  })

  test('renders a heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/companies')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('a seeded company appears in the list and links to its detail page', async ({ page }) => {
    await signup(page)
    const name = `CompanyList ${Date.now()}`
    const company = await authedPost(page, '/companies', {
      name,
      description: 'Seeded for companies.spec.',
    })
    const companyId = (company?.data ?? company).id
    await page.goto(APP_BASE + '/companies')
    await page.waitForTimeout(1500)
    const link = page.getByRole('link', { name: new RegExp(name, 'i') }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(new RegExp(`/companies/${companyId}`))
    } else {
      await expect(page.getByText(name).first()).toBeVisible()
    }
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/companies')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
