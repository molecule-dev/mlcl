import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, createSecret, createVault, signup } from './_helpers'

// /secrets/:id — secret detail with reveal/copy controls and a rotation
// form. Reveal triggers a GET /api/secrets/:id which returns the
// decrypted value and writes a secret.read entry to the audit log.
// Rotate POSTs /api/secrets/:id/rotate, increments version, and creates
// a rotations row.

test.describe('/secrets/:id', () => {
  test('renders the secret key in the heading', async ({ page }) => {
    await signup(page)
    const vault = await createVault(page, 'detail-vault')
    const secret = await createSecret(page, vault.id, 'GITHUB_TOKEN', 'ghp_smoke')
    await page.goto(APP_BASE + '/secrets/' + secret.id)
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-mol-id="secret-detail-key"]')).toContainText('GITHUB_TOKEN')
  })

  test('Reveal toggle exposes the plaintext value previously fetched on load', async ({ page }) => {
    await signup(page)
    const vault = await createVault(page, 'reveal-vault')
    const secret = await createSecret(page, vault.id, 'JWT_PRIVATE', 'plaintext-jwt-value')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/secrets/' + secret.id)
      await page.waitForTimeout(1500)
    })
    const get = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/secrets/${secret.id}\\b`).test(r.url),
    )
    expect(
      get,
      'GET /api/secrets/:id should fire on page load to fetch decrypted value',
    ).toBeDefined()
    expect(get!.status).toBe(200)
    await page.locator('[data-mol-id="secret-value-toggle"]').click()
    await expect(page.locator('[data-mol-id="secret-value"]')).toContainText('plaintext-jwt-value')
  })

  test('Rotate POST /api/secrets/:id/rotate bumps version and writes a rotation row', async ({
    page,
  }) => {
    await signup(page)
    const vault = await createVault(page, 'rotate-vault')
    const secret = await createSecret(page, vault.id, 'ROTATABLE', 'old-value')
    await page.goto(APP_BASE + '/secrets/' + secret.id)
    await page.waitForTimeout(1000)
    await page.locator('[data-mol-id="secret-rotate-toggle"]').click()
    await page.locator('[data-mol-id="secret-rotate-value"]').fill('rotated-value-v2')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="secret-rotate-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && new RegExp(`/api/secrets/${secret.id}/rotate`).test(r.url),
    )
    expect(post, 'POST /api/secrets/:id/rotate should fire').toBeDefined()
    expect(post!.status).toBe(200)

    // Confirm DB truth.
    const after = await apiFetch(page, 'GET', `/secrets/${secret.id}`)
    const data = after.json as { version: number; value: string }
    expect(data.version).toBe(2)
    expect(data.value).toBe('rotated-value-v2')
    const rotations = await apiFetch(page, 'GET', '/rotations')
    const rArr = rotations.json as Array<{ secret_id: string; status: string }>
    expect(
      rArr.some((r) => r.secret_id === secret.id && r.status === 'completed'),
      'a completed rotation row should exist',
    ).toBe(true)
  })

  test('Delete secret DELETEs /api/secrets/:id and bounces back to the vault', async ({ page }) => {
    await signup(page)
    const vault = await createVault(page, 'delete-vault')
    const secret = await createSecret(page, vault.id, 'DOOMED', 'rip')
    await page.goto(APP_BASE + '/secrets/' + secret.id)
    await page.waitForTimeout(1000)
    page.once('dialog', (d) => d.accept())
    await page.locator('[data-mol-id="secret-delete"]').click()
    await page.waitForTimeout(2000)
    // Confirm DB truth.
    const after = await apiFetch(page, 'GET', `/secrets/${secret.id}`)
    expect(after.status).toBe(404)
  })
})
