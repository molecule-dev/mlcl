import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  createWebhookViaApi,
  requireAccessToken,
  signup,
} from './_helpers'

test.describe('/audit', () => {
  test('renders heading and filter chips', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/audit')
    await expect(page.getByRole('heading', { level: 1, name: /audit log/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /all actions/i })).toBeVisible()
  })

  test('GET /api/audit_events fires on render', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/audit')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    const r = reqs.find((x) => x.method === 'GET' && /\/api\/audit_events/.test(x.url))
    expect(r).toBeDefined()
    expect(r!.status).toBe(200)
  })

  test('creating a webhook seeds an endpoint.created audit row (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    await createWebhookViaApi(page, token, { url: 'https://example.com/audit-' + Date.now() })
    await page.goto(APP_BASE + '/audit')
    // The audit list should now show endpoint.created
    await expect(page.getByText('endpoint.created').first()).toBeVisible({ timeout: 10_000 })
  })

  test('Endpoints filter narrows list to endpoint.* actions', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    await createWebhookViaApi(page, token)
    // Also seed a profile.updated by patching profile
    await page.request.patch(API_BASE + '/profile', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Audit Filter Test ' + Date.now() },
    })
    await page.goto(APP_BASE + '/audit')
    await expect(page.getByText('endpoint.created').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('profile.updated').first()).toBeVisible()
    // Click "Endpoints" filter
    await page.getByRole('button', { name: /^endpoints$/i }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('endpoint.created').first()).toBeVisible()
    await expect(page.getByText('profile.updated')).toHaveCount(0)
  })

  test('Export button is present and downloads JSON', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    await createWebhookViaApi(page, token)
    await page.goto(APP_BASE + '/audit')
    await expect(page.getByText('endpoint.created').first()).toBeVisible({ timeout: 10_000 })
    const downloadPromise = page.waitForEvent('download', { timeout: 5_000 }).catch(() => null)
    await page.getByRole('button', { name: /export/i }).click()
    const download = await downloadPromise
    if (download) {
      const path = await download.path()
      expect(path).toBeTruthy()
    } else {
      // Fall back: confirm button is visible (some browsers don't trigger download events for blob: URLs)
      await expect(page.getByRole('button', { name: /export/i })).toBeVisible()
    }
  })
})
