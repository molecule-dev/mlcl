import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, createSecret, createVault, signup } from './_helpers'

// /rotations — KPI strip + list of rotation rows. Backed by GET /api/rotations.
// Rotating a secret via POST /api/secrets/:id/rotate writes a 'completed'
// rotation row that surfaces here.

test.describe('/rotations', () => {
  test('renders empty state for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rotations')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-mol-id="rotations-empty"]')).toBeVisible()
  })

  test('after rotating a secret, GET /api/rotations returns the row and the list renders', async ({
    page,
  }) => {
    await signup(page)
    const vault = await createVault(page, 'rot-vault')
    const secret = await createSecret(page, vault.id, 'ROTATING', 'v1')
    const rot = await apiFetch(page, 'POST', `/secrets/${secret.id}/rotate`, {
      value: 'v2',
      comment: 'smoke rotation',
    })
    expect(rot.status).toBe(200)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/rotations')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/rotations(\?|$)/.test(r.url))
    expect(get).toBeDefined()
    expect(get!.status).toBe(200)
    await expect(page.locator('[data-mol-id="rotations-list"]')).toBeVisible()
  })

  test('loading state replaces with list/empty within ~1s', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rotations')
    // After settle, either rotations-empty or rotations-list must be
    // visible — never rotations-loading.
    await page.waitForTimeout(2000)
    const loading = page.locator('[data-mol-id="rotations-loading"]')
    const empty = page.locator('[data-mol-id="rotations-empty"]')
    const list = page.locator('[data-mol-id="rotations-list"]')
    expect(await loading.count(), 'loading should not be stuck').toBe(0)
    const settled = (await empty.count()) > 0 || (await list.count()) > 0
    expect(settled, 'rotations page should settle to empty or list').toBe(true)
  })
})
