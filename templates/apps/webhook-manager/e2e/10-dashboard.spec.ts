import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  captureNetwork,
  createWebhookViaApi,
  requireAccessToken,
  signup,
} from './_helpers'

test.describe('/dashboard', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, dashboard fetches /api/webhooks and /api/deliveries', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    const webhooksGet = reqs.find(
      (r) => r.method === 'GET' && /\/api\/webhooks(?:\?|$)/.test(r.url),
    )
    const deliveriesGet = reqs.find(
      (r) => r.method === 'GET' && /\/api\/deliveries(?:\?|$)/.test(r.url),
    )
    expect(webhooksGet, 'GET /api/webhooks').toBeDefined()
    expect(deliveriesGet, 'GET /api/deliveries').toBeDefined()
    expect(webhooksGet!.status).toBe(200)
    expect(deliveriesGet!.status).toBe(200)
  })

  test('empty workspace shows empty-state copy, no demo data', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    // No deliveries yet → empty state visible
    await expect(
      page.getByText(/No deliveries yet|No endpoints yet|create your first/i).first(),
    ).toBeVisible()
    // No demo data should leak through
    await expect(page.locator('text=Spec order events')).toHaveCount(0)
  })

  test('after creating a webhook + sending a test, dashboard shows real delivery + endpoint', async ({
    page,
  }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token, {
      url: 'https://example.com/dashboard-test-' + Date.now(),
      description: 'Dashboard live data test',
    })
    // Send a test delivery
    const r = await page.request.post(
      `http://localhost:${process.env.API_PORT || '4050'}/api/webhooks/${wh.id}/test`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { event_type: 'test' },
      },
    )
    expect(r.ok(), `POST /webhooks/${wh.id}/test must succeed`).toBe(true)

    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    // The live URL should appear in Recent deliveries OR in Top endpoints
    await expect(page.getByText(wh.url)).toHaveCount(2, { timeout: 10_000 })
  })

  test('"New endpoint" CTA navigates to /endpoints/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /new endpoint/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/endpoints\/new/, { timeout: 10_000 })
  })
})
