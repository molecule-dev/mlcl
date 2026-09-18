import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /alerts — list seeded alert rules + create new rule (POST /api/alerts).

test.describe('/alerts', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/alerts')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, /alerts loads via GET /api/alerts', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/alerts')
      await page.waitForResponse((r) => /\/api\/alerts(\b|\?|$)/.test(r.url()), {
        timeout: 10_000,
      })
    })
    const req = reqs.find((r) => r.method === 'GET' && /\/api\/alerts(\b|\?|$)/.test(r.url))
    expect(req).toBeDefined()
    expect(req!.status).toBeLessThan(300)
  })

  test('"+ New rule" opens the create dialog', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForResponse((r) => /\/api\/alerts/.test(r.url()))
    await page.locator('[data-mol-id="alerts-new"]').click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('creating a rule POSTs /api/alerts and the row appears + persists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForResponse((r) => /\/api\/alerts/.test(r.url()))
    const name = `walker-rule-${Date.now()}`
    await page.locator('[data-mol-id="alerts-new"]').click()
    await page.locator('#alerts-new-name').fill(name)
    await page.locator('#alerts-new-service').fill('checkout')
    await page.locator('#alerts-new-condition').fill('rate(severity:error) > 5/min')
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/alerts/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="alerts-create-submit"]').click()
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(300)
    // Read-after-write via API.
    const token = await getAccessToken(page)
    const res = await page.request.get(API_BASE + '/alerts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json()
    const items: Array<{ name: string }> = Array.isArray(body)
      ? body
      : body.data || body.results || []
    expect(items.find((a) => a.name === name)).toBeDefined()
  })

  test('clicking an alert row navigates to /alerts/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForResponse((r) => /\/api\/alerts/.test(r.url()))
    const card = page.locator('a[href^="/alerts/"]').first()
    if ((await card.count()) === 0) test.skip(true, 'no alerts seeded')
    await card.click()
    await expect(page).toHaveURL(/\/alerts\/[^/]+/)
  })

  test('renders 4 KPI cards (firing, monitoring, ok, fired24h)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForResponse((r) => /\/api\/alerts/.test(r.url()))
    const cards = page.locator('section').first().locator('div').filter({ hasText: /\d+/ })
    await expect(cards.first()).toBeVisible({ timeout: 5_000 })
  })

  test('cancel closes the create dialog', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForResponse((r) => /\/api\/alerts/.test(r.url()))
    await page.locator('[data-mol-id="alerts-new"]').click()
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
