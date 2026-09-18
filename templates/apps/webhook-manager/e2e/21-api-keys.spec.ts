import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, requireAccessToken, signup } from './_helpers'

test.describe('/settings/api-keys', () => {
  test('renders the heading and toggle button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/api-keys')
    await expect(page.getByRole('heading', { level: 1, name: /api keys/i })).toBeVisible()
    await expect(page.locator('[data-mol-id="api-keys-toggle-form"]')).toBeVisible()
  })

  test('empty state visible until first key created', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/api-keys')
    await expect(page.locator('[data-mol-id="api-keys-empty"]')).toBeVisible()
  })

  test('generating a key shows the plaintext exactly once + adds a row to the list (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/api-keys')
    await page.locator('[data-mol-id="api-keys-toggle-form"]').click()
    const keyName = 'tf-prod-' + Date.now()
    await page.locator('[data-mol-id="api-keys-name-input"]').fill(keyName)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="api-keys-create-submit"]').click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/api_keys(?:[/?]|$)/.test(r.url))
    expect(post).toBeDefined()
    expect(post!.status).toBeLessThan(300)
    // The plaintext appears once
    const revealed = await page.locator('[data-mol-id="api-keys-revealed-secret"]').textContent()
    expect(revealed).toMatch(/^pk_(live|test)_[a-f0-9]+/)
    // The row appears in the list (masked)
    const token = await requireAccessToken(page)
    const list = await page.request.get(API_BASE + '/api_keys', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = await list.json()
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].name).toBe(keyName)
    expect(items[0].key_masked).toMatch(/^pk_(live|test)_••••[a-f0-9]{4}$/)
    // The hash is never exposed
    expect(items[0].key_hash).toBeUndefined()
  })

  test('revoking a key flips is_revoked = true (read-after-write)', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const r = await page.request.post(API_BASE + '/api_keys', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'rev-' + Date.now(), env: 'live', scopes: ['endpoints:read'] },
    })
    const created = await r.json()
    await page.goto(APP_BASE + '/settings/api-keys')
    page.once('dialog', (d) => d.accept())
    await page.locator(`[data-mol-id="api-keys-revoke-${created.id}"]`).click()
    await page.waitForTimeout(1500)
    const list = await page.request.get(API_BASE + '/api_keys', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = await list.json()
    const found = items.find((k: { id: string }) => k.id === created.id)
    expect(found).toBeDefined()
    expect(found.is_revoked).toBe(true)
  })

  test('GET /api/api_keys fires on render', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings/api-keys')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    const r = reqs.find((x) => x.method === 'GET' && /\/api\/api_keys/.test(x.url))
    expect(r).toBeDefined()
    expect(r!.status).toBe(200)
  })
})
