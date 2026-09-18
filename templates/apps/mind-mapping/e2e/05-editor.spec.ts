import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  seedMap,
  seedNode,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('Map editor', () => {
  test('Add child persists a new node with parent_id linkage', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('editor'))
    const map = await seedMap(page, accessToken, 'Editor seed')
    const root = await seedNode(page, accessToken, map.id, 'root', 200, 200)
    await page.goto(APP_BASE + `/maps/${map.id}`)
    // wait for editor to render the seeded node
    await expect(page.locator('[data-mol-id="map-editor-canvas"]')).toBeVisible()
    await expect(page.locator(`[data-node-id="${root.id}"]`)).toBeVisible()
    // select the root and click "Add child"
    await page.locator(`[data-node-id="${root.id}"]`).click()
    await page.getByRole('button', { name: /Add child/i }).click()

    // Read-after-write: the map's nodes list grew by one, and the new node has parent_id = root.id
    await page.waitForTimeout(400)
    const res = await page.request.get(`${API_BASE}/maps/${map.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { nodes: Array<{ id: string; parent_id: string | null }> }
    expect(body.nodes.length).toBe(2)
    const child = body.nodes.find((n) => n.id !== root.id)
    expect(child?.parent_id).toBe(root.id)
  })

  test('Color change persists across reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('color'))
    const map = await seedMap(page, accessToken, 'Color seed')
    const node = await seedNode(page, accessToken, map.id, 'recolor me', 100, 100)
    await page.goto(APP_BASE + `/maps/${map.id}`)
    await page.locator(`[data-node-id="${node.id}"]`).click()
    // pick a non-default color via the color swatches
    await page.getByRole('button', { name: '#10b981' }).click()
    await page.waitForTimeout(300)
    await page.reload()
    await page.locator(`[data-node-id="${node.id}"]`).click()
    const res = await page.request.get(`${API_BASE}/maps/${map.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as { nodes: Array<{ id: string; color: string }> }
    const reloaded = body.nodes.find((n) => n.id === node.id)
    expect(reloaded?.color).toBe('#10b981')
  })

  test('Delete removes the node and its children', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('delete'))
    const map = await seedMap(page, accessToken, 'Delete seed')
    const root = await seedNode(page, accessToken, map.id, 'root', 100, 100)
    // Create a child via the API so deletion has something to chain off.
    const child = await page.request.post(`${API_BASE}/nodes`, {
      headers: apiHeaders(accessToken),
      data: { map_id: map.id, parent_id: root.id, text: 'child', x: 200, y: 200, color: '#10b981' },
    })
    expect(child.status()).toBe(201)
    await page.goto(APP_BASE + `/maps/${map.id}`)
    await page.locator(`[data-node-id="${root.id}"]`).click()
    await page.getByRole('button', { name: /^delete Delete$/ }).click()
    await page.waitForTimeout(500)
    const res = await page.request.get(`${API_BASE}/maps/${map.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as { nodes: Array<{ id: string }> }
    expect(body.nodes.find((n) => n.id === root.id)).toBeUndefined()
  })

  test('Move to trash navigates back to /maps and the map is hidden from the default list', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('trasheditor'))
    const map = await seedMap(page, accessToken, 'Trash from editor')
    await page.goto(APP_BASE + `/maps/${map.id}`)
    await expect(page.getByRole('button', { name: /Move to trash/i })).toBeVisible()
    await page.getByRole('button', { name: /Move to trash/i }).click()
    await page.waitForURL('**/maps', { timeout: 10000 })
    const list = await page.request.get(`${API_BASE}/maps`, { headers: apiHeaders(accessToken) })
    const body = (await list.json()) as Array<{ id: string }>
    expect(body.find((m) => m.id === map.id)).toBeUndefined()
    const trashed = await page.request.get(`${API_BASE}/maps?include_trashed=true&scope=mine`, {
      headers: apiHeaders(accessToken),
    })
    const trashedBody = (await trashed.json()) as Array<{ id: string; trashed_at: string | null }>
    expect(trashedBody.find((m) => m.id === map.id)?.trashed_at).toBeTruthy()
  })
})
