/**
 * /doc/:id/comments — comments page (mirrors comments.spec.ts to satisfy
 * gate 6's per-page spec naming).
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

test.describe('/doc/:id/comments page', () => {
  test('post a root comment via UI; row appears in GET', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docid-com-post'))
    const doc = await seedDocument(page, accessToken, { title: 'Comment Test' })
    await page.goto(APP_BASE + `/doc/${doc.id}/comments`)
    await page.waitForSelector('[data-testid="comments-new-form"]')
    const sentinel = `Walker comment ${Date.now()}`
    await page.getByTestId('comments-new-body').fill(sentinel)
    await page.getByTestId('comments-new-submit').click()
    await page.waitForTimeout(700)
    const list = await page.request.get(`${API_BASE}/comments/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ body: string }>
    expect(items.find((c) => c.body === sentinel)).toBeDefined()
  })

  test('comments-list renders the seeded thread', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docid-com-render'))
    const doc = await seedDocument(page, accessToken, { title: 'Render Test' })
    await page.request.post(`${API_BASE}/comments/${doc.id}`, {
      headers: authHeaders(accessToken),
      data: { body: 'Pre-seeded thread' },
    })
    await page.goto(APP_BASE + `/doc/${doc.id}/comments`)
    await page.waitForSelector('[data-testid="comments-list"]')
    await expect(page.getByTestId('comments-list')).toContainText('Pre-seeded thread')
  })

  test('empty state for a doc with zero comments', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docid-com-empty'))
    const doc = await seedDocument(page, accessToken, { title: 'Empty Test' })
    await page.goto(APP_BASE + `/doc/${doc.id}/comments`)
    await page.waitForSelector('[data-testid="comments-root"]')
    await expect(page.getByTestId('comments-empty')).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('doc__id_comments — network', () => {
  test('comments page triggers GET /api/comments/:documentId', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('cmt-net'))
    const doc = await seedDocument(page, accessToken, { title: 'Net' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/doc/' + doc.id + '/comments')
      await page.waitForSelector('[data-testid="comments-root"]')
    })
    expect(reqs.some((r) => r.url.includes('/api/comments/' + doc.id))).toBe(true)
  })
})
