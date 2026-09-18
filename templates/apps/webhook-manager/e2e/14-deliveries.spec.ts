import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  captureNetwork,
  createWebhookViaApi,
  requireAccessToken,
  signup,
} from './_helpers'

test.describe('/deliveries', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/deliveries')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('empty state when no deliveries exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deliveries')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await expect(page.getByText(/no deliveries|nothing here/i).first()).toBeVisible()
  })

  test('after sending a test, the delivery appears in the list (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token, {
      url: 'https://example.com/list-' + Date.now(),
    })
    await page.request.post(
      `http://localhost:${process.env.API_PORT || '4050'}/api/webhooks/${wh.id}/test`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { event_type: 'test' },
      },
    )
    await page.goto(APP_BASE + '/deliveries')
    await expect(page.getByText(wh.url).first()).toBeVisible({ timeout: 10_000 })
  })

  test('GET /api/deliveries fires on render', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/deliveries')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    const r = reqs.find((x) => x.method === 'GET' && /\/api\/deliveries/.test(x.url))
    expect(r).toBeDefined()
    expect(r!.status).toBe(200)
  })

  test('clicking a delivery row navigates to /deliveries/:id', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token)
    await page.request.post(
      `http://localhost:${process.env.API_PORT || '4050'}/api/webhooks/${wh.id}/test`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { event_type: 'test' },
      },
    )
    await page.goto(APP_BASE + '/deliveries')
    await page.waitForTimeout(1500)
    // Click the first delivery card
    const link = page.locator('a[href^="/deliveries/"]').first()
    await link.click()
    await expect(page).toHaveURL(/\/deliveries\/[0-9a-f-]{8,}/, { timeout: 10_000 })
  })
})
