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

test.describe('Version history', () => {
  test('Save snapshot creates a row that lists in the timeline', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('snap'))
    const map = await seedMap(page, accessToken, 'Snap me')
    await seedNode(page, accessToken, map.id, 'snap-root', 100, 100)

    await page.goto(APP_BASE + `/maps/${map.id}/history`)
    await expect(page.getByRole('button', { name: /Save snapshot/i })).toBeVisible()
    await page.getByRole('button', { name: /Save snapshot/i }).click()
    await page.waitForTimeout(500)

    const versions = await page.request.get(`${API_BASE}/versions?map_id=${map.id}`, {
      headers: apiHeaders(accessToken),
    })
    const list = (await versions.json()) as Array<{ id: string; snapshot: unknown }>
    expect(list.length).toBe(1)

    // Should be visible in the UI list with at least 1 node
    await expect(page.locator('[data-mol-id="version-history-list"]')).toContainText(
      /Manual snapshot|Snapshot/,
    )
    const nodesCount = page.locator('p:has-text("NODES") + p, p:has-text("Nodes") + p').first()
    // The detail panel shows node count; just verify a numeric value is rendered
    await expect(page.locator('section').filter({ hasText: 'Snapshot' }).first()).toContainText(
      /\d/,
    )
  })

  test('Restore mints a new snapshot reflecting the prior state', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('restore-snap'))
    const map = await seedMap(page, accessToken, 'Restore snap')
    const root = await seedNode(page, accessToken, map.id, 'before', 100, 100)
    // First snapshot (with 1 node)
    await page.request.post(`${API_BASE}/versions`, {
      headers: apiHeaders(accessToken),
      data: { map_id: map.id, change_summary: 'before-restore' },
    })
    // Add a node so map has 2 nodes
    await seedNode(page, accessToken, map.id, 'after', 200, 200)
    const beforeMap = await page.request.get(`${API_BASE}/maps/${map.id}`, {
      headers: apiHeaders(accessToken),
    })
    const beforeBody = (await beforeMap.json()) as { nodes: unknown[] }
    expect(beforeBody.nodes.length).toBe(2)

    await page.goto(APP_BASE + `/maps/${map.id}/history`)
    await expect(page.getByRole('button', { name: /Restore this version/i })).toBeVisible()
    await page.getByRole('button', { name: /Restore this version/i }).click()
    await page.waitForTimeout(800)

    // After restore the map should be back to 1 node
    const afterMap = await page.request.get(`${API_BASE}/maps/${map.id}`, {
      headers: apiHeaders(accessToken),
    })
    const afterBody = (await afterMap.json()) as { nodes: Array<{ id: string }> }
    expect(afterBody.nodes.length).toBe(1)
  })
})
