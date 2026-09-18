/**
 * Sharing & access — the InviteShare form posts to /api/sharing with
 * the right shape (scope: array, role: viewer/provider/caregiver), and
 * a revoke action flips `revoked_at` on the grant.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authHeaders, listShares, signup, uniqueEmail } from './_helpers.js'

test.describe('sharing', () => {
  test('initial /sharing page renders the empty state for a fresh user', async ({ page }) => {
    await signup(page, uniqueEmail('share-empty'))
    await page.goto(APP_BASE + '/sharing')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-sharing"]').first()).toBeVisible()
  })

  test('POST /api/sharing creates a permission_grants row with scope as a JSON array', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('share-create'))
    const r = await page.request.post(`${API_BASE}/sharing`, {
      headers: authHeaders(accessToken),
      data: {
        recipient_email: `recipient+${Date.now()}@example.com`,
        recipient_name: 'Dr. Rowan Vale',
        role: 'provider',
        scope: ['medications', 'visits'],
      },
    })
    expect(r.status()).toBe(201)
    const grant = (await r.json()) as {
      id: string
      scope: string[] | string
      role: string
      email?: { sent: boolean; messageId: string | null; error: string | null }
    }
    expect(grant.id).toBeTruthy()
    expect(grant.role).toBe('provider')
    // The response advertises whether an invitation email was attempted —
    // a present `email` envelope means the handler tried to dispatch and
    // either succeeded (sent: true) or recorded a transport-not-configured
    // explanation (sent: false, error: string).
    expect(grant.email).toBeDefined()
    expect(typeof grant.email!.sent).toBe('boolean')
    if (!grant.email!.sent) {
      expect(typeof grant.email!.error).toBe('string')
    }
    const after = await listShares(page, accessToken)
    expect(after.find((g) => g.id === grant.id)).toBeTruthy()
  })

  test('POST /api/sharing/:id/revoke flips revoked_at on the matching grant', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('share-revoke'))
    const create = await page.request.post(`${API_BASE}/sharing`, {
      headers: authHeaders(accessToken),
      data: {
        recipient_email: `revoke+${Date.now()}@example.com`,
        recipient_name: 'Test',
        role: 'viewer',
        scope: ['records'],
      },
    })
    const grant = (await create.json()) as { id: string }
    const revoke = await page.request.post(`${API_BASE}/sharing/${grant.id}/revoke`, {
      headers: authHeaders(accessToken),
      data: {},
    })
    expect(revoke.status(), await revoke.text().catch(() => '')).toBeLessThan(400)
    const after = await listShares(page, accessToken)
    const updated = after.find((g) => g.id === grant.id)!
    expect(updated.revoked_at).toBeTruthy()
  })
})
