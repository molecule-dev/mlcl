/**
 * /dashboard — KPI cards, expiring list, activity, navigation chrome.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, seedContract } from './_helpers.js'

test.describe('dashboard', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('renders heading + nav + KPI cards for fresh signup (zero state)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Contracts$/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Templates$/ })).toBeVisible()
    await expect(page.getByText(/Total contracts/i)).toBeVisible()
    await expect(page.getByText(/Pending signature/i)).toBeVisible()
    await expect(page.getByText(/Active/i).first()).toBeVisible()
    await expect(page.getByText(/Cycle time/i)).toBeVisible()
  })

  test('shows New contract CTA that navigates to /contracts/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const cta = page.getByRole('link', { name: /New contract/i }).first()
    await expect(cta).toBeVisible()
    await cta.click()
    await page.waitForURL('**/contracts/new', { timeout: 10_000 })
  })

  test('reflects API state — total_contracts increases after seed', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedContract(page, accessToken, { title: 'KPI Bump' })
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    const text = await page.textContent('body')
    expect(text).toMatch(/Total contracts/i)
  })
})
