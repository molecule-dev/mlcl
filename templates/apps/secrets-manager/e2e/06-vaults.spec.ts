import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, signup } from './_helpers'

// /vaults — list of vaults for the signed-in user. Empty by default; the
// "New vault" CTA opens a modal that POSTs /api/vaults and reloads the
// list to render a VaultCard for the new row.

test.describe('/vaults', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/vaults')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, GET /api/vaults fires and renders the empty state', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/vaults')
      await page.waitForTimeout(1500)
    })
    const vaultsGet = reqs.find((r) => r.method === 'GET' && /\/api\/vaults(\?|$)/.test(r.url))
    expect(vaultsGet, 'GET /api/vaults should fire on /vaults').toBeDefined()
    expect(vaultsGet!.status).toBe(200)
    await expect(page.locator('[data-mol-id="vaults-empty"]')).toBeVisible()
  })

  test('"New vault" CTA opens the modal and POSTs /api/vaults', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vaults')
    await page.locator('[data-mol-id="vaults-new-button"]').click()
    await expect(page.locator('[data-mol-id="new-vault-modal"]')).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="new-vault-name"]').fill('acme-prod')
      await page.locator('[data-mol-id="new-vault-environment"]').selectOption('production')
      await page.locator('[data-mol-id="new-vault-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/vaults(\b|\?|$)/.test(r.url))
    expect(post, 'POST /api/vaults should fire on submit').toBeDefined()
    expect(post!.status, 'create should be 201').toBe(201)
    // Confirm DB truth via the API.
    const list = await apiFetch(page, 'GET', '/vaults')
    const arr = list.json as Array<{ name: string }>
    expect(arr.some((v) => v.name === 'acme-prod')).toBe(true)
  })

  test('clicking a vault card deep-links to /vaults/:id', async ({ page }) => {
    await signup(page)
    const created = await apiFetch(page, 'POST', '/vaults', {
      name: 'acme-staging',
      environment: 'staging',
    })
    expect(created.status).toBe(201)
    await page.goto(APP_BASE + '/vaults')
    await page.waitForTimeout(1000)
    const vaultId = (created.json as { id: string }).id
    await page.locator(`a[href="/vaults/${vaultId}"]`).first().click()
    await expect(page).toHaveURL(new RegExp(`/vaults/${vaultId}`))
  })
})
