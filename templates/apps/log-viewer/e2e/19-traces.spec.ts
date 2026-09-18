import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /traces — distributed-trace list rendering trace cards from /api/traces.

test.describe('/traces', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/traces')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, /traces loads via GET /api/traces', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/traces')
      await page.waitForResponse((r) => /\/api\/traces(\b|\?|$)/.test(r.url()), {
        timeout: 10_000,
      })
    })
    const req = reqs.find((r) => r.method === 'GET' && /\/api\/traces(\b|\?|$)/.test(r.url))
    expect(req).toBeDefined()
    expect(req!.status).toBeLessThan(300)
  })

  test('renders the distributed traces heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/traces')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('renders ≥ 1 trace row after seed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/traces')
    await page.waitForResponse((r) => /\/api\/traces/.test(r.url()))
    const links = page.locator('a[href^="/traces/"]')
    await expect(links.first()).toBeVisible({ timeout: 5_000 })
  })

  test('clicking a trace navigates to /traces/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/traces')
    await page.waitForResponse((r) => /\/api\/traces/.test(r.url()))
    const link = page.locator('a[href^="/traces/"]').first()
    if ((await link.count()) === 0) test.skip(true, 'no traces seeded')
    await link.click()
    await expect(page).toHaveURL(/\/traces\/[^/]+/)
  })

  test('renders KPI cards (errors / slow / total / span count)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/traces')
    await page.waitForResponse((r) => /\/api\/traces/.test(r.url()))
    await expect(
      page.locator('section').first().locator('div').filter({ hasText: /\d+/ }).first(),
    ).toBeVisible({ timeout: 5_000 })
  })
})
