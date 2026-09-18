import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  createSecret,
  createVault,
  getAccessToken,
  signup,
} from './_helpers'

// /audit — chronological feed of every action against secrets and vaults
// for the signed-in user. Backed by GET /api/audit-log.

test.describe('/audit', () => {
  test('renders empty state for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/audit')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-mol-id="audit-empty"]')).toBeVisible()
  })

  test('shows a row for every secret create + read', async ({ page }) => {
    await signup(page)
    const vault = await createVault(page, 'audit-vault')
    const secret = await createSecret(page, vault.id, 'AUDITED_KEY', 'audited-value')
    // Issue a reveal-equivalent fetch to write a secret.read entry.
    await page.request.get(
      'http://localhost:' + (process.env.API_PORT || '4270') + '/api/secrets/' + secret.id,
      {
        headers: {
          authorization: `Bearer ${await getAccessToken(page)}`,
        },
      },
    )

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/audit')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/audit-log(\?|$)/.test(r.url))
    expect(get, 'GET /api/audit-log should fire').toBeDefined()
    expect(get!.status).toBe(200)
    const body = await page.locator('[data-mol-id="audit-list"]').innerText()
    expect(body).toMatch(/secret\.created|created/i)
    expect(body).toMatch(/secret\.read|read/i)
  })

  test('search filter narrows the list', async ({ page }) => {
    await signup(page)
    const vault = await createVault(page, 'search-vault')
    await createSecret(page, vault.id, 'SEARCHABLE_KEY', 'val')
    await page.goto(APP_BASE + '/audit')
    await page.waitForTimeout(1500)
    await page.locator('[data-mol-id="audit-search"]').fill('SEARCHABLE_KEY')
    await page.waitForTimeout(500)
    const visible = await page.locator('[data-mol-id="audit-list"]').innerText()
    expect(visible).toContain('SEARCHABLE_KEY')
  })
})
