import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  createWebhookViaApi,
  requireAccessToken,
  signup,
} from './_helpers'

test.describe('/endpoints/:id', () => {
  test('renders endpoint details', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token)
    await page.goto(APP_BASE + '/endpoints/' + wh.id)
    await expect(page.locator('h1', { hasText: wh.url })).toBeVisible()
    await expect(page.getByText(/Signing secret/i)).toBeVisible()
    await expect(page.getByText(/Subscribed events/i)).toBeVisible()
  })

  test('"Send test" creates a real delivery row and refreshes the list (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token, {
      url: 'https://example.com/test-button-' + Date.now(),
    })
    await page.goto(APP_BASE + '/endpoints/' + wh.id)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send test/i }).click()
      await page.waitForTimeout(3500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/webhooks\/[^/]+\/test/.test(r.url))
    expect(post, 'POST /webhooks/:id/test').toBeDefined()
    expect(post!.status).toBeLessThan(300)
    // Read-after-write: the new delivery is in /deliveries
    const r = await page.request.get(API_BASE + '/deliveries?webhook_id=' + wh.id, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = await r.json()
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThan(0)
    const d = items[0]
    expect(d.webhook_id).toBe(wh.id)
    expect(d.url).toBe(wh.url)
  })

  test('Pause toggles is_active = false (read-after-write)', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token)
    await page.goto(APP_BASE + '/endpoints/' + wh.id)
    await page.getByRole('button', { name: /^pause$/i }).click()
    await page.waitForTimeout(2000)
    const r = await page.request.get(API_BASE + '/webhooks/' + wh.id, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const row = await r.json()
    expect(row.is_active).toBe(false)
  })

  test('Resume flips is_active back to true (read-after-write)', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token, { is_active: false })
    await page.goto(APP_BASE + '/endpoints/' + wh.id)
    await page.getByRole('button', { name: /^resume$/i }).click()
    await page.waitForTimeout(2000)
    const r = await page.request.get(API_BASE + '/webhooks/' + wh.id, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const row = await r.json()
    expect(row.is_active).toBe(true)
  })

  test('Delete removes the row and navigates to /endpoints', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token)
    await page.goto(APP_BASE + '/endpoints/' + wh.id)
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /^delete$/i }).click()
    await page.waitForURL(/\/endpoints$/, { timeout: 15_000 })
    const r = await page.request.get(API_BASE + '/webhooks/' + wh.id, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(r.status()).toBe(404)
  })

  test('reveal/hide secret toggle changes the displayed text', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token)
    await page.goto(APP_BASE + '/endpoints/' + wh.id)
    // Default: masked dots
    await expect(page.getByText(/whsec_••••/)).toBeVisible()
    // Toggle reveal
    await page.getByRole('button', { name: /reveal secret|show secret/i }).click()
    await page.waitForTimeout(300)
    // After reveal, the dot mask string should not be visible
    const masked = await page
      .getByText(/^whsec_••••••••••••••••$/)
      .isVisible()
      .catch(() => false)
    expect(masked).toBe(false)
  })
})
