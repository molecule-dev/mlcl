/**
 * /graph — Engram knowledge graph.
 *
 * The page hits /api/graph/nodes + /api/graph/edges on mount. With
 * zero documents the empty placeholder is shown; after a real document
 * is created the SVG renders one node.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, createDocument, signup } from './_helpers.js'

test.describe('graph', () => {
  test('h1 renders "Knowledge graph"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/graph')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/knowledge|graph/i)
  })

  test('empty knowledge base shows the graph-empty placeholder', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/graph')
    await expect(page.locator('[data-testid="graph-empty"]')).toBeVisible()
  })

  test('GET /api/graph/nodes + /api/graph/edges fire on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/graph')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
    const nodes = reqs.find((r) => r.method === 'GET' && /\/api\/graph\/nodes/.test(r.url))
    const edges = reqs.find((r) => r.method === 'GET' && /\/api\/graph\/edges/.test(r.url))
    expect(nodes?.status).toBe(200)
    expect(edges?.status).toBe(200)
  })

  test('with one document, the SVG wrapper + a graph-node render', async ({ page }) => {
    const { accessToken } = await signup(page)
    const doc = await createDocument(page, accessToken, { title: 'Graph Doc' })
    await page.goto(APP_BASE + '/graph')
    await expect(page.locator('[data-testid="graph-svg-wrapper"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(`[data-testid="graph-node-${doc.id}"]`)).toBeVisible()
  })

  test('cluster-all filter is rendered and toggleable', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createDocument(page, accessToken, { title: 'Filter Doc' })
    await page.goto(APP_BASE + '/graph')
    await page.locator('[data-testid="graph-cluster-all"]').click()
    await expect(page.locator('[data-testid="graph-cluster-all"]')).toBeVisible()
  })
})
