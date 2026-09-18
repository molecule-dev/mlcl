/**
 * API-tokens spec.
 *
 * The Settings page exposes a "Create token" form. Tokens are surfaced
 * once on creation (plaintext) and only the SHA-256 hash is stored.
 * These tests assert:
 *   - POST /api/api-tokens returns the plaintext exactly once and never
 *     leaks the hash.
 *   - GET /api/api-tokens lists the row but never returns `hashed_token`.
 *   - POST /api/api-tokens/:id/revoke marks the row revoked.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, captureNetwork, signup } from './_helpers.js'

interface TokenRow {
  id: string
  label: string
  hashed_token?: string
  revoked_at?: string | null
  plaintext?: string
}

test.describe('/api-tokens (Settings page)', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('creating a token returns the plaintext once and never the hash', async ({ page }) => {
    const created = await apiPost<TokenRow>(page, '/api-tokens', { label: 'CI Token' })
    expect(created.plaintext, 'plaintext should be returned on create').toMatch(/^csb_/)
    expect(created.hashed_token, 'hashed_token must NEVER be returned').toBeUndefined()
  })

  test('listing tokens never includes hashed_token', async ({ page }) => {
    await apiPost(page, '/api-tokens', { label: 'List Token' })
    const list = await apiGet<TokenRow[]>(page, '/api-tokens')
    expect(list.length).toBeGreaterThan(0)
    for (const row of list) {
      expect(row.hashed_token, 'list payload leaked hashed_token').toBeUndefined()
    }
  })

  test('revoke endpoint flips revoked_at', async ({ page }) => {
    const created = await apiPost<TokenRow>(page, '/api-tokens', { label: 'Doomed' })
    await apiPost(page, `/api-tokens/${created.id}/revoke`, {})
    const list = await apiGet<TokenRow[]>(page, '/api-tokens')
    const found = list.find((t) => t.id === created.id)
    expect(found?.revoked_at, 'revoked_at should be set after revoke').toBeTruthy()
  })

  test('the Settings page fires GET /api/api-tokens on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto('/settings')
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    })
    const list = reqs.find((r) => /\/api\/api-tokens(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(list, 'GET /api/api-tokens should fire on settings load').toBeTruthy()
    expect(list!.status).toBeLessThan(300)
  })
})
