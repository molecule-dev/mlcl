import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedPost, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('company detail page (/companies/:id)', () => {
  test('mount fires GET /api/companies/:id', async ({ page }) => {
    await signup(page)
    const company = await authedPost(page, '/companies', {
      name: `CompanyDetail ${Date.now()}`,
      description: 'Seeded for companies__id.spec.',
    })
    const companyId = (company?.data ?? company).id
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/companies/${companyId}`)
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'GET' && new RegExp(`/api/companies/${companyId}`).test(r.url)),
    ).toBeTruthy()
  })

  test('renders the company name as a heading', async ({ page }) => {
    await signup(page)
    const name = `CompanyDetail ${Date.now()}`
    const company = await authedPost(page, '/companies', { name, description: 'Seed.' })
    const companyId = (company?.data ?? company).id
    await page.goto(APP_BASE + `/companies/${companyId}`)
    await expect(page.getByRole('heading', { name: new RegExp(name, 'i') })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    const company = await authedPost(page, '/companies', {
      name: `CompanyDetail ${Date.now()}`,
      description: 'Seed.',
    })
    const companyId = (company?.data ?? company).id
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + `/companies/${companyId}`)
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
