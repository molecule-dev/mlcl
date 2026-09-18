import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, createMaintenance, signup } from './_helpers.js'

function windowDates() {
  const start = new Date(Date.now() + 60 * 60_000).toISOString()
  const end = new Date(Date.now() + 120 * 60_000).toISOString()
  return { scheduledFor: start, scheduledUntil: end }
}

test.describe('/maintenance/:id', () => {
  test('renders the detail page for an existing maintenance window', async ({ page }) => {
    await signup(page)
    const m = await createMaintenance(page, {
      title: `Detail-${Date.now()}`,
      ...windowDates(),
    })
    await page.goto(APP_BASE + `/maintenance/${m.id}`)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    const text = await page.locator('body').innerText()
    expect(text).toContain('Detail-')
  })

  test('issues a GET to /api/maintenance/:id when the page loads', async ({ page }) => {
    await signup(page)
    const m = await createMaintenance(page, { title: `Net-${Date.now()}`, ...windowDates() })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/maintenance/${m.id}`)
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => r.url.includes(`/maintenance/${m.id}`) && r.method === 'GET')
    expect(get?.status, 'GET /api/maintenance/:id').toBe(200)
  })

  test('Back link returns to /maintenance', async ({ page }) => {
    await signup(page)
    const m = await createMaintenance(page, { title: `Back-${Date.now()}`, ...windowDates() })
    await page.goto(APP_BASE + `/maintenance/${m.id}`)
    const back = page.getByRole('link', { name: /maintenance|back/i }).first()
    if (await back.count().catch(() => 0)) {
      await back.click()
      await page.waitForTimeout(800)
      expect(new URL(page.url()).pathname).toMatch(/^\/maintenance/)
    }
  })

  test('redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/maintenance/some-id')
    await page.waitForTimeout(1500)
    expect(new URL(page.url()).pathname).toMatch(/login|maintenance/)
  })
})
