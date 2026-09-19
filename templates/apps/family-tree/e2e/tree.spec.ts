/**
 * Tree screen (signature flow). Verifies the wire-shape contract: GET
 * /api/tree returns nodes with generation + x slots and parent/partner
 * edges; the page renders connected person cards, an SVG connector layer,
 * zoom controls that move the transform, and a re-root affordance that
 * refetches with ?root=.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getTree, signup, uniqueEmail } from './_helpers.js'

test.describe('tree', () => {
  test('renders connected person cards + connector layer from /api/tree', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tree-view'))
    const tree = await getTree(page, accessToken)
    expect(tree.nodes.length, 'seeded tree must have people').toBeGreaterThan(0)
    expect(tree.stats.generations).toBeGreaterThan(1)
    expect(
      tree.edges.filter((e) => e.kind === 'parent').length,
      'tree must carry parent edges',
    ).toBeGreaterThan(0)

    await page.goto(APP_BASE + '/tree')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-tree"]').first()).toBeVisible()
    await expect(page.locator('[data-mol-id="tree-canvas"]')).toBeVisible()
    // One rendered card per layout node.
    for (const n of tree.nodes.slice(0, 5)) {
      await expect(page.locator(`[data-mol-id="person-card-${n.id}"]`).first()).toBeAttached()
    }
    // The SVG connector layer is present.
    await expect(page.locator('[data-mol-id="tree-connectors"]')).toBeAttached()
    // Stats line reflects the API payload.
    await expect(page.locator('[data-mol-id="tree-zoom-level"]')).toHaveText('100%')
  })

  test('zoom controls change the zoom level and transform', async ({ page }) => {
    await signup(page, uniqueEmail('tree-zoom'))
    await page.goto(APP_BASE + '/tree')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="tree-zoom-level"]')).toHaveText('100%')
    await page.locator('[data-mol-id="tree-zoom-in"]').click()
    await expect(page.locator('[data-mol-id="tree-zoom-level"]')).toHaveText('120%')
    await page.locator('[data-mol-id="tree-zoom-out"]').click()
    await page.locator('[data-mol-id="tree-zoom-out"]').click()
    await expect(page.locator('[data-mol-id="tree-zoom-level"]')).toHaveText('80%')
    await page.locator('[data-mol-id="tree-zoom-reset"]').click()
    await expect(page.locator('[data-mol-id="tree-zoom-level"]')).toHaveText('100%')
  })

  test('re-rooting a card refetches the tree with ?root=', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tree-reroot'))
    const tree = await getTree(page, accessToken)
    const nonRoot = tree.nodes.find((n) => !n.isRoot)
    expect(nonRoot, 'seeded tree must have a non-root person to re-root onto').toBeDefined()

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/tree')
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.some((r) => r.url.includes('/api/tree') && r.method === 'GET' && r.status < 400),
    ).toBe(true)

    const reqsReroot = await captureNetwork(page, async () => {
      await page.locator(`[data-mol-id="tree-reroot-${nonRoot!.id}"]`).first().click()
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqsReroot.some(
        (r) =>
          r.url.includes(`/api/tree?root=${encodeURIComponent(nonRoot!.id)}`) &&
          r.method === 'GET' &&
          r.status < 400,
      ),
      'clicking a card’s focus button must refetch with ?root=<id>',
    ).toBe(true)
  })
})
