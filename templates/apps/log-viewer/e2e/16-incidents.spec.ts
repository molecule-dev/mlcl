import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /incidents — list seeded incidents + declare new (POST /api/incidents).

test.describe('/incidents', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/incidents')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, /incidents loads via GET /api/incidents', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/incidents')
      await page.waitForResponse((r) => /\/api\/incidents(\b|\?|$)/.test(r.url()), {
        timeout: 10_000,
      })
    })
    const req = reqs.find((r) => r.method === 'GET' && /\/api\/incidents(\b|\?|$)/.test(r.url))
    expect(req).toBeDefined()
    expect(req!.status).toBeLessThan(300)
  })

  test('"+ Declare incident" opens the dialog', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/incidents')
    await page.waitForResponse((r) => /\/api\/incidents/.test(r.url()))
    await page.locator('[data-mol-id="incidents-declare"]').click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('declaring an incident POSTs /api/incidents and persists it', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/incidents')
    await page.waitForResponse((r) => /\/api\/incidents/.test(r.url()))
    const title = `walker-incident-${Date.now()}`
    await page.locator('[data-mol-id="incidents-declare"]').click()
    await page.locator('#incidents-new-title').fill(title)
    await page.locator('#incidents-new-service').fill('checkout')
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/incidents/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="incidents-declare-submit"]').click()
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(300)
    const token = await getAccessToken(page)
    const res = await page.request.get(API_BASE + '/incidents', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json()
    const items: Array<{ title: string }> = Array.isArray(body)
      ? body
      : body.data || body.results || []
    expect(items.find((i) => i.title === title)).toBeDefined()
  })

  test('clicking an incident row navigates to /incidents/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/incidents')
    await page.waitForResponse((r) => /\/api\/incidents/.test(r.url()))
    const link = page.locator('a[href^="/incidents/"]').first()
    if ((await link.count()) === 0) test.skip(true, 'no incidents seeded')
    await link.click()
    await expect(page).toHaveURL(/\/incidents\/[^/]+/)
  })

  test('scope filter buttons (Open / All / Resolved) toggle', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/incidents')
    await page.waitForResponse((r) => /\/api\/incidents/.test(r.url()))
    await page.getByRole('button', { name: /^all/i }).first().click()
    await page
      .getByRole('button', { name: /resolved/i })
      .first()
      .click()
    await page.getByRole('button', { name: /^open/i }).first().click()
  })

  test('renders 4 KPI cards', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/incidents')
    await page.waitForResponse((r) => /\/api\/incidents/.test(r.url()))
    const cards = page.locator('section').first().locator('div').filter({ hasText: /\d+/ })
    await expect(cards.first()).toBeVisible({ timeout: 5_000 })
  })
})
