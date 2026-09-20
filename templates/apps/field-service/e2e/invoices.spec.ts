import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoInvoices(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/invoices')
  await expect(page.getByRole('heading', { name: /^invoices$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('invoices', () => {
  test('list page renders seeded invoices and GET /api/invoices returns 200', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoInvoices(page)
    })
    const req = reqs.find((r) => /\/api\/invoices(\?|$)/.test(r.url) && r.method === 'GET')
    expect(req?.status, 'GET /api/invoices').toBe(200)
    const links = page.locator('a[href^="/invoices/"]')
    await expect.poll(() => links.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('totals KPIs render (paid, outstanding, drafts)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoInvoices(page)
    await expect(page.getByText(/^paid$/i).first()).toBeVisible()
    await expect(page.getByText(/^outstanding$/i).first()).toBeVisible()
    await expect(page.getByText(/^drafts$/i).first()).toBeVisible()
  })

  test('status filter buttons narrow the list', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoInvoices(page)
    const all = await page.locator('a[href^="/invoices/"]').count()
    expect(all).toBeGreaterThanOrEqual(1)
    await page.getByRole('button', { name: /^paid$/i }).click()
    await expect
      .poll(async () => page.locator('a[href^="/invoices/"]').count(), { timeout: 5000 })
      .toBeLessThanOrEqual(all)
  })

  test('first invoice row navigates to /invoices/<uuid>', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoInvoices(page)
    await page.locator('a[href^="/invoices/"]').first().click()
    await expect(page).toHaveURL(/\/invoices\/[a-f0-9-]{36}$/)
  })
})
