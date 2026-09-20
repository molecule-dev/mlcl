import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoDashboard(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.getByRole('heading', { name: /today's board/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('dashboard', () => {
  test('GET /api/jobs, /api/quotes and /api/invoices all return 200 on mount', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoDashboard(page)
    })
    for (const endpoint of ['/api/jobs', '/api/quotes', '/api/invoices']) {
      const req = reqs.find((r) => r.url.includes(endpoint) && r.method === 'GET')
      expect(req?.status, `GET ${endpoint}`).toBe(200)
    }
  })

  test('KPI cards render (today, technician, revenue, outstanding)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDashboard(page)
    await expect(page.getByText(/today's jobs/i).first()).toBeVisible()
    await expect(page.getByText(/need a technician/i).first()).toBeVisible()
    await expect(page.getByText(/revenue this week/i).first()).toBeVisible()
    await expect(page.getByText(/outstanding invoices/i).first()).toBeVisible()
  })

  test('"New quote" CTA links to /quotes/new', async ({ page }) => {
    await signup(page)
    await gotoDashboard(page)
    await page.getByRole('link', { name: /\+ new quote/i }).click()
    await expect(page).toHaveURL(/\/quotes\/new/)
  })

  test('"Open dispatch" CTA links to /dispatch', async ({ page }) => {
    await signup(page)
    await gotoDashboard(page)
    await page.getByRole('link', { name: /open dispatch/i }).click()
    await expect(page).toHaveURL(/\/dispatch/)
  })

  test('today section links to job detail pages', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDashboard(page)
    const jobLinks = page.locator('a[href^="/jobs/"]')
    await expect.poll(() => jobLinks.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('quotes panel links to quote pages', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDashboard(page)
    const quoteLinks = page.locator('a[href^="/quotes/"]')
    await expect.poll(() => quoteLinks.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })
})
