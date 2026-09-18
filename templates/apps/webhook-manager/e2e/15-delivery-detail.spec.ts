import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  createWebhookViaApi,
  requireAccessToken,
  signup,
} from './_helpers'

test.describe('/deliveries/:id', () => {
  test('renders delivery detail with payload + response panels', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token)
    const apiPort = process.env.API_PORT || '4050'
    const r = await page.request.post(`http://localhost:${apiPort}/api/webhooks/${wh.id}/test`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { event_type: 'test' },
    })
    expect(r.ok()).toBe(true)
    const list = await page.request.get(API_BASE + '/deliveries?webhook_id=' + wh.id, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = await list.json()
    expect(items.length).toBeGreaterThan(0)
    const id = items[0].id

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/deliveries/' + id)
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    const detailGet = reqs.find(
      (x) => x.method === 'GET' && new RegExp('/api/deliveries/' + id).test(x.url),
    )
    expect(detailGet).toBeDefined()
    expect(detailGet!.status).toBe(200)
    // Page should reference the URL we sent to
    await expect(page.getByText(wh.url).first()).toBeVisible({ timeout: 5_000 })
  })

  test('non-existent delivery shows the not-found state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deliveries/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await expect(page.getByText(/not found|delivery not|no longer/i).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('back link returns the user to /deliveries', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token)
    await page.request.post(API_BASE + `/webhooks/${wh.id}/test`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { event_type: 'test' },
    })
    const list = await page.request.get(API_BASE + '/deliveries?webhook_id=' + wh.id, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = await list.json()
    const id = items[0].id
    await page.goto(APP_BASE + '/deliveries/' + id)
    await page
      .getByRole('link', { name: /back|deliveries/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/deliveries(?:\b|$)/, { timeout: 5_000 })
  })
})
