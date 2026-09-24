import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  apiFetch,
  captureNetwork,
  listEnvironments,
  signup,
  waitForSeed,
} from './_helpers'

// /environments — env CRUD. Each card displays SDK keys, flag counts, and
// Rotate / Delete actions. The environments under test are read from
// GET /api/environments rather than named, so the suite holds once the
// starter workspace's envs are replaced.

test.describe('/environments', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/environments')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('GET /api/environments fires and every environment renders a card', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const envs = await listEnvironments(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/environments')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/environments(\?|$)/.test(r.url))
    expect(get, 'GET /api/environments should fire').toBeDefined()
    expect(get!.status).toBe(200)
    await expect(page.locator('[data-mol-id^="env-card-"]')).toHaveCount(envs.length)
    for (const env of envs) {
      await expect(page.locator(`[data-mol-id="env-card-${env.key}"]`)).toBeVisible()
    }
  })

  test('"New environment" toggle opens the create form', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/environments')
    await page.locator('[data-mol-id="environments-new-btn"]').click()
    await expect(page.locator('[data-mol-id="environments-new-form"]')).toBeVisible()
  })

  test('Create env POSTs /api/environments and the new card renders with sdk_key', async ({
    page,
  }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/environments')
    await page.locator('[data-mol-id="environments-new-btn"]').click()
    const key = `qa${Date.now()}`
    await page.locator('[data-mol-id="environments-new-key"]').fill(key)
    await page.locator('[data-mol-id="environments-new-name"]').fill('QA')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="environments-new-submit"]').click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/environments(\?|$)/.test(r.url))
    expect(post, 'POST /api/environments should fire').toBeDefined()
    expect(post!.status).toBe(201)
    // Read-after-write
    const list = await apiFetch(page, 'GET', '/environments')
    const arr = list.json as Array<{ key: string; sdk_key: string; client_key: string }>
    const created = arr.find((e) => e.key === key)
    expect(created).toBeDefined()
    expect(created!.sdk_key).toMatch(/^sdk_/)
    expect(created!.client_key).toMatch(/^clt_/)
    // Card is rendered.
    await expect(page.locator(`[data-mol-id="env-card-${key}"]`)).toBeVisible()
  })

  test('Rotate keys PUT /api/environments/:id mints new sdk_key + client_key', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    // Rotate whichever environment the workspace holds — not a seeded key.
    const target = (await listEnvironments(page))[0]
    const oldSdk = target.sdk_key
    const oldClient = target.client_key
    await page.goto(APP_BASE + '/environments')
    // ConfirmButton two-step: first click arms (confirm label appears),
    // second click commits the rotation.
    const rotateBtn = page.locator(`[data-mol-id="env-rotate-${target.key}"]`)
    await rotateBtn.click()
    await expect(rotateBtn).toContainText(/Existing integrations/)
    const reqs = await captureNetwork(page, async () => {
      await rotateBtn.click()
      await page.waitForTimeout(2000)
    })
    const put = reqs.find(
      (r) => r.method === 'PUT' && /\/api\/environments\/[0-9a-f-]+/.test(r.url),
    )
    expect(put, 'PUT /api/environments/:id should fire').toBeDefined()
    expect(put!.status).toBe(200)
    // Read-after-write
    const after = await apiFetch(page, 'GET', '/environments')
    const rotated = (
      after.json as Array<{ key: string; sdk_key: string; client_key: string }>
    ).find((e) => e.key === target.key)!
    expect(rotated.sdk_key).not.toBe(oldSdk)
    expect(rotated.client_key).not.toBe(oldClient)
  })

  test('Delete env DELETEs /api/environments/:id and removes the card', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    // Pre-create a throwaway env to delete.
    const list = await apiFetch(page, 'POST', '/environments', {
      key: `tmp${Date.now()}`.toLowerCase(),
      name: 'tmp',
    })
    expect(list.status).toBe(201)
    const created = list.json as { id: string; key: string }
    await page.goto(APP_BASE + '/environments')
    await expect(page.locator(`[data-mol-id="env-card-${created.key}"]`)).toBeVisible()
    // ConfirmButton two-step: first click arms (confirm label appears),
    // second click commits the deletion.
    const deleteBtn = page.locator(`[data-mol-id="env-delete-${created.key}"]`)
    await deleteBtn.click()
    await expect(deleteBtn).toContainText(/Delete environment .+\?/)
    const reqs = await captureNetwork(page, async () => {
      await deleteBtn.click()
      await page.waitForTimeout(2000)
    })
    const del = reqs.find(
      (r) => r.method === 'DELETE' && /\/api\/environments\/[0-9a-f-]+/.test(r.url),
    )
    expect(del, 'DELETE /api/environments/:id should fire').toBeDefined()
    expect(del!.status).toBe(204)
    // Read-after-write
    const fresh = await apiFetch(page, 'GET', '/environments')
    const arr = fresh.json as Array<{ key: string }>
    expect(arr.find((e) => e.key === created.key)).toBeUndefined()
    await expect(page.locator(`[data-mol-id="env-card-${created.key}"]`)).toHaveCount(0)
  })
})
