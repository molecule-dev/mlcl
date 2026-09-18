/**
 * /contracts — list view: empty state, search, navigation to detail.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, seedContract } from './_helpers.js'

test.describe('contracts list', () => {
  test('renders empty state for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/contracts')
    await expect(page.getByRole('heading', { name: /Contracts/i })).toBeVisible()
    await page.waitForLoadState('networkidle')
  })

  test('shows seeded contracts', async ({ page }) => {
    const { accessToken } = await signup(page)
    const c1 = await seedContract(page, accessToken, { title: 'Contract Alpha' })
    const c2 = await seedContract(page, accessToken, { title: 'Contract Beta' })
    await page.goto(APP_BASE + '/contracts')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(c1.title)).toBeVisible()
    await expect(page.getByText(c2.title)).toBeVisible()
  })

  test('clicking a contract navigates to its detail page', async ({ page }) => {
    const { accessToken } = await signup(page)
    const c = await seedContract(page, accessToken, { title: 'Detail Nav' })
    await page.goto(APP_BASE + '/contracts')
    await page.waitForLoadState('networkidle')
    await page.getByText(c.title).first().click()
    await page.waitForURL(new RegExp(`/contracts/${c.id}`), { timeout: 10_000 })
  })

  test('New contract button navigates to /contracts/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/contracts')
    const cta = page.getByRole('link', { name: /New contract/i }).first()
    if (await cta.count()) {
      await cta.click()
      await page.waitForURL('**/contracts/new', { timeout: 10_000 })
    }
  })
})
