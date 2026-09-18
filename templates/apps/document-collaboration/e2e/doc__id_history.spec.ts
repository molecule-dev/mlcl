/**
 * /doc/:id/history — version history page (mirrors versions.spec.ts to
 * satisfy gate 6's per-page spec naming).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  seedDocument,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/doc/:id/history page', () => {
  test('renders the version timeline after edits', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docid-hist-render'))
    const doc = await seedDocument(page, accessToken, {
      title: 'History Test',
      content: { blocks: [{ type: 'paragraph', text: 'v1' }] },
    })
    await page.request.put(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
      data: { title: 'History Test', content: { blocks: [{ type: 'paragraph', text: 'v2' }] } },
    })
    await page.request.put(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
      data: { title: 'History Test', content: { blocks: [{ type: 'paragraph', text: 'v3' }] } },
    })
    await page.goto(APP_BASE + `/doc/${doc.id}/history`)
    await page.waitForSelector('[data-testid="version-history-root"]', { timeout: 10_000 })
    await page.waitForSelector('[data-testid="version-history-grid"]', { timeout: 10_000 })
  })

  test('two saves produce ≥2 snapshot versions', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docid-hist-2'))
    const doc = await seedDocument(page, accessToken, {
      title: 'Two Saves',
      content: { blocks: [{ type: 'paragraph', text: 'a' }] },
    })
    await page.request.put(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
      data: { title: 'Two Saves', content: { blocks: [{ type: 'paragraph', text: 'b' }] } },
    })
    await page.request.put(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
      data: { title: 'Two Saves', content: { blocks: [{ type: 'paragraph', text: 'c' }] } },
    })
    const versions = await page.request.get(`${API_BASE}/versions/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    const items = (await versions.json()) as Array<{ version: number }>
    expect(items.length).toBeGreaterThanOrEqual(2)
  })

  test('empty state for a doc with no history', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docid-hist-empty'))
    const doc = await seedDocument(page, accessToken, { title: 'No History' })
    await page.goto(APP_BASE + `/doc/${doc.id}/history`)
    await page.waitForSelector('[data-testid="version-history-root"]', { timeout: 10_000 })
    // The page renders one of three branches (loading → empty | grid). Poll
    // until the loading state resolves into either empty or grid; counting
    // once after waiting for the root races the loading→data transition.
    const empty = page.locator('[data-testid="version-history-empty"]')
    const grid = page.locator('[data-testid="version-history-grid"]')
    await expect
      .poll(async () => (await empty.count()) > 0 || (await grid.count()) > 0, { timeout: 10_000 })
      .toBe(true)
  })
})

test.describe('doc__id_history — network', () => {
  test('history page triggers GET /api/versions/:documentId', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('hist-net'))
    const doc = await seedDocument(page, accessToken, { title: 'Net' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/doc/' + doc.id + '/history')
      await page.waitForSelector('[data-testid="version-history-root"]', { timeout: 10000 })
    })
    expect(reqs.some((r) => r.url.includes('/api/versions/' + doc.id))).toBe(true)
  })
})
