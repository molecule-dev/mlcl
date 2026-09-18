/**
 * Comments — post, reply, resolve, reopen, delete.
 *
 * Outcome assertions:
 * - POST /api/comments/:docId returns 201 and the new row appears in
 *   GET /api/comments/:docId.
 * - Resolve flips is_resolved=true; reopen flips back to false.
 * - Delete removes the row from GET, and replies disappear with their parent.
 * - Comments persist across page.reload().
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  seedComment,
  seedDocument,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('comments', () => {
  test('post a root comment via UI; row appears in GET and survives reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('com-post'))
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
    const items = (await list.json()) as Array<{ body: string; is_resolved: boolean }>
    expect(items.find((c) => c.body === sentinel)).toBeDefined()

    await page.reload()
    await page.waitForSelector('[data-testid="comments-list"]')
    await expect(page.getByTestId('comments-list')).toContainText(sentinel)
  })

  test('reply to a comment creates a parent_id-linked row', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('com-reply'))
    const doc = await seedDocument(page, accessToken, { title: 'Reply Test' })
    const root = await seedComment(page, accessToken, doc.id, 'root thread body')

    await page.goto(APP_BASE + `/doc/${doc.id}/comments`)
    await page.waitForSelector(`[data-testid="comments-thread-${root.id}"]`)
    await page.getByTestId(`comments-reply-input-${root.id}`).fill('a reply')
    await page.getByTestId(`comments-reply-submit-${root.id}`).click()
    await page.waitForTimeout(500)

    const list = await page.request.get(`${API_BASE}/comments/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ parent_id: string | null; body: string }>
    const reply = items.find((c) => c.body === 'a reply')
    expect(reply, 'reply row should exist').toBeDefined()
    expect(reply!.parent_id).toBe(root.id)
  })

  test('resolve flips is_resolved=true; reopen flips back to false', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('com-resolve'))
    const doc = await seedDocument(page, accessToken, {})
    const c = await seedComment(page, accessToken, doc.id, 'resolve me')

    await page.goto(APP_BASE + `/doc/${doc.id}/comments`)
    // The default filter is "open" so the unresolved thread shows.
    await page.waitForSelector(`[data-testid="comments-thread-${c.id}"]`)
    await page.getByTestId(`comments-resolve-${c.id}`).click()
    await page.waitForTimeout(500)

    let list = await page.request.get(`${API_BASE}/comments/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    let items = (await list.json()) as Array<{ id: string; is_resolved: boolean }>
    expect(items.find((x) => x.id === c.id)!.is_resolved).toBe(true)

    // Switch to resolved filter, then reopen.
    await page.getByTestId('comments-filter-resolved').click()
    await page.waitForSelector(`[data-testid="comments-thread-${c.id}"]`)
    await page.getByTestId(`comments-reopen-${c.id}`).click()
    await page.waitForTimeout(500)

    list = await page.request.get(`${API_BASE}/comments/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    items = (await list.json()) as Array<{ id: string; is_resolved: boolean }>
    expect(items.find((x) => x.id === c.id)!.is_resolved).toBe(false)
  })

  test('delete a thread removes it from GET and the cascade drops replies', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('com-del'))
    const doc = await seedDocument(page, accessToken, {})
    const root = await seedComment(page, accessToken, doc.id, 'root')
    const reply = await page.request.post(`${API_BASE}/comments/${doc.id}`, {
      headers: authHeaders(accessToken),
      data: { body: 'reply body', parent_id: root.id },
    })
    expect(reply.status()).toBe(201)

    await page.goto(APP_BASE + `/doc/${doc.id}/comments`)
    await page.waitForSelector(`[data-testid="comments-thread-${root.id}"]`)
    await page.getByTestId(`comments-delete-${root.id}`).click()
    await page.waitForTimeout(700)

    const list = await page.request.get(`${API_BASE}/comments/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ id: string; parent_id: string | null }>
    expect(
      items.find((c) => c.id === root.id),
      'root should be deleted',
    ).toBeUndefined()
    expect(
      items.find((c) => c.parent_id === root.id),
      'replies of deleted root should be cascaded',
    ).toBeUndefined()
  })

  test('filter pills (open/resolved/all) narrow the visible threads', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('com-filter'))
    const doc = await seedDocument(page, accessToken, {})
    const a = await seedComment(page, accessToken, doc.id, 'thread A (open)')
    const b = await seedComment(page, accessToken, doc.id, 'thread B (will resolve)')
    // Resolve thread B via API.
    const resv = await page.request.put(`${API_BASE}/comments/${doc.id}/${b.id}/resolve`, {
      headers: authHeaders(accessToken),
      data: {},
    })
    expect(resv.status()).toBe(200)

    await page.goto(APP_BASE + `/doc/${doc.id}/comments`)
    await page.waitForSelector('[data-testid="comments-list"]')

    // open filter (default) shows thread A only.
    await page.getByTestId('comments-filter-open').click()
    await page.waitForTimeout(200)
    await expect(page.locator(`[data-testid="comments-thread-${a.id}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="comments-thread-${b.id}"]`)).toHaveCount(0)

    await page.getByTestId('comments-filter-resolved').click()
    await page.waitForTimeout(200)
    await expect(page.locator(`[data-testid="comments-thread-${b.id}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="comments-thread-${a.id}"]`)).toHaveCount(0)

    await page.getByTestId('comments-filter-all').click()
    await page.waitForTimeout(200)
    await expect(page.locator(`[data-testid="comments-thread-${a.id}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="comments-thread-${b.id}"]`)).toBeVisible()
  })
})
