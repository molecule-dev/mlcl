import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, signup } from './_helpers'

// /tokens — personal API tokens. POST /api/api-tokens returns the
// plaintext once; subsequent GETs only expose the metadata. Revoke
// stamps revoked_at without deleting the row.

test.describe('/tokens', () => {
  test('renders empty state for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/tokens')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-mol-id="api-tokens-empty"]')).toBeVisible()
  })

  test('create-token form POSTs /api/api-tokens and shows the plaintext panel once', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/tokens')
    await page.locator('[data-mol-id="api-tokens-new-toggle"]').click()
    await page.locator('[data-mol-id="api-token-name"]').fill('ci-runner')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="api-token-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/api-tokens(\b|\?|$)/.test(r.url))
    expect(post, 'POST /api/api-tokens should fire').toBeDefined()
    expect(post!.status).toBe(201)
    const plaintext = page.locator('[data-mol-id="api-tokens-plaintext"]')
    await expect(plaintext).toBeVisible()
    await expect(plaintext).toContainText(/smt_[0-9a-f]+/)
    // Confirm DB truth.
    const list = await apiFetch(page, 'GET', '/api-tokens')
    const arr = list.json as Array<{ name: string }>
    expect(arr.some((t) => t.name === 'ci-runner')).toBe(true)
  })

  test('Revoke stamps revoked_at; row remains', async ({ page }) => {
    await signup(page)
    const created = await apiFetch(page, 'POST', '/api-tokens', {
      name: 'soon-revoked',
      scopes: { vault_ids: [], permissions: ['read'] },
    })
    expect(created.status).toBe(201)
    const id = (created.json as { id: string }).id
    await page.goto(APP_BASE + '/tokens')
    await page.waitForTimeout(1000)
    // Two-step ConfirmButton: first click arms ("Revoke this token?"),
    // second commits. No native dialog exists any more.
    const revoke = page.locator(`[data-mol-id="api-token-revoke-${id}"]`)
    await revoke.click()
    await expect(revoke).toContainText('Revoke this token?')
    await revoke.click()
    await page.waitForTimeout(1500)
    const list = await apiFetch(page, 'GET', '/api-tokens')
    const arr = list.json as Array<{ id: string; revoked_at: string | null }>
    const target = arr.find((t) => t.id === id)
    expect(target, 'token row must still exist after revoke').toBeTruthy()
    expect(target!.revoked_at, 'revoke should stamp revoked_at').not.toBeNull()
  })
})
