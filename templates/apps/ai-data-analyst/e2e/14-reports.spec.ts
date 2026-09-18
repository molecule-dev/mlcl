import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /reports — list of saved reports as thumbnail cards from
// GET /api/saved_reports.

test.describe('/reports', () => {
  test('renders one thumbnail per saved report the API returns', async ({ page }) => {
    await signup(page)
    // The expected thumbnail count is read from the very response the page
    // rendered, not from how many reports the demo seed happens to write.
    let reports: unknown[] = []
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      const resp = await page.waitForResponse(
        (r) => /\/api\/saved_reports/.test(r.url()) && r.request().method() === 'GET',
        { timeout: 15_000 },
      )
      reports = (await resp.json()) as unknown[]
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/saved_reports($|\?)/.test(r.url))
    expect(get).toBeDefined()
    expect(get!.status).toBe(200)
    expect(reports.length, 'the account has saved reports to list').toBeGreaterThan(0)
    const cards = page.locator('main li')
    await expect(cards).toHaveCount(reports.length, { timeout: 5_000 })
  })

  test('"New report" CTA navigates to /query', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.getByRole('button', { name: /new report/i }).click()
    await expect(page).toHaveURL(/\/query/)
  })

  test('clicking a report card navigates to /reports/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForResponse((r) => /\/api\/saved_reports/.test(r.url()))
    const firstLink = page.locator('a[href^="/reports/"]').first()
    await firstLink.click()
    await expect(page).toHaveURL(/\/reports\/[a-f0-9-]{8,}/)
  })
})
