import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, createSecret, createVault, signup } from './_helpers'

// /vaults/:id — vault detail with secrets list. Add-secret modal POSTs
// /api/secrets and refreshes the list. Delete vault DELETEs /api/vaults/:id
// and bounces back to /vaults.

test.describe('/vaults/:id', () => {
  test('renders vault name + empty secrets state for a fresh vault', async ({ page }) => {
    await signup(page)
    const vault = await createVault(page, 'acme-prod')
    await page.goto(APP_BASE + '/vaults/' + vault.id)
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-mol-id="vault-detail-name"]')).toContainText('acme-prod')
    await expect(page.locator('[data-mol-id="vault-secrets-empty"]')).toBeVisible()
  })

  test('"Add secret" CTA opens NewSecretModal and POSTs /api/secrets', async ({ page }) => {
    await signup(page)
    const vault = await createVault(page, 'acme-stage', 'staging')
    await page.goto(APP_BASE + '/vaults/' + vault.id)
    await page.waitForTimeout(1000)
    await page.locator('[data-mol-id="vault-add-secret"]').click()
    await expect(page.locator('[data-mol-id="new-secret-modal"]')).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="new-secret-name"]').fill('STRIPE_SECRET_KEY')
      await page.locator('[data-mol-id="new-secret-key"]').fill('STRIPE_SECRET_KEY')
      await page.locator('[data-mol-id="new-secret-value"]').fill('sk_test_smoke_value')
      await page.locator('[data-mol-id="new-secret-kind"]').selectOption('api-key')
      await page.locator('[data-mol-id="new-secret-environment"]').selectOption('staging')
      await page.locator('[data-mol-id="new-secret-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/secrets(\b|\?|$)/.test(r.url))
    expect(post, 'POST /api/secrets should fire on submit').toBeDefined()
    expect(post!.status, 'create should be 201').toBe(201)
    // Confirm via API.
    const list = await apiFetch(page, 'GET', `/secrets?vault_id=${vault.id}`)
    const arr = list.json as Array<{ key: string }>
    expect(arr.some((s) => s.key === 'STRIPE_SECRET_KEY')).toBe(true)
  })

  test('"Delete vault" removes the vault and bounces to /vaults', async ({ page }) => {
    await signup(page)
    const vault = await createVault(page, 'short-lived')
    await page.goto(APP_BASE + '/vaults/' + vault.id)
    await page.waitForTimeout(1000)
    page.once('dialog', (d) => d.accept())
    await page.locator('[data-mol-id="vault-delete"]').click()
    await expect(page).toHaveURL(/\/vaults$/, { timeout: 10_000 })
    // Confirm DB truth.
    const list = await apiFetch(page, 'GET', '/vaults')
    const arr = list.json as Array<{ id: string }>
    expect(arr.find((v) => v.id === vault.id)).toBeUndefined()
  })

  test('clicking a secret row deep-links to /secrets/:id', async ({ page }) => {
    await signup(page)
    const vault = await createVault(page, 'detail-source')
    const secret = await createSecret(page, vault.id, 'API_TOKEN', 'tok-secret')
    await page.goto(APP_BASE + '/vaults/' + vault.id)
    await page.waitForTimeout(1000)
    await page.locator(`[data-mol-id="secret-row-${secret.id}"]`).click()
    await expect(page).toHaveURL(new RegExp(`/secrets/${secret.id}`))
  })
})
