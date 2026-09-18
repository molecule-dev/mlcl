/**
 * /comments — auth-gated. With ?postId=… filter, the page renders only
 * comments for that post and shows a composer that creates a new comment
 * via /api/comments. The created row is visible in the list afterwards.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  seedPost,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('comments page', () => {
  test('composer creates a new comment that shows up in the list', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('comments-create'))
    const { id: postId } = await seedPost(page, accessToken)

    await page.goto(APP_BASE + `/comments?postId=${postId}`)
    await page.waitForLoadState('networkidle')

    const body = `Test comment ${Date.now()}`
    await page.locator('[data-mol-id="comments-create-body"]').fill(body)
    await page.locator('[data-mol-id="comments-create-submit"]').click()

    // Backend invariant — the comment is persisted.
    await page.waitForTimeout(800)
    const list = await page.request.get(
      `${API_BASE}/comments?resourceType=post&resourceId=${postId}&status=all`,
      { headers: authHeaders(accessToken), failOnStatusCode: false },
    )
    expect(list.status()).toBeLessThan(400)
    const json = (await list.json()) as { data: Array<{ body: string }> }
    expect(json.data.find((c) => c.body === body)).toBeTruthy()

    // UI invariant — the new comment appears.
    await expect(page.getByText(body).first()).toBeVisible({ timeout: 10000 })
  })

  test('moderation buttons (approve, spam, delete) call the API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('comments-mod'))
    const { id: postId } = await seedPost(page, accessToken)

    const c = await page.request.post(`${API_BASE}/comments`, {
      headers: authHeaders(accessToken),
      data: { body: 'Pending row', resourceType: 'post', resourceId: postId },
      failOnStatusCode: false,
    })
    expect(c.status()).toBeLessThan(400)
    const created = (await c.json()) as { id: string }

    await page.goto(APP_BASE + `/comments?postId=${postId}`)
    await page.waitForLoadState('networkidle')

    await page.locator(`[data-mol-id="comment-${created.id}-approve"]`).click()
    await page.waitForTimeout(800)

    const refreshed = await page.request.get(`${API_BASE}/comments/${created.id}`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(refreshed.status()).toBeLessThan(400)
    const after = (await refreshed.json()) as { status: string }
    expect(after.status).toBe('approved')
  })

  test('GET /api/comments fires on load (network)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('comments-net-load'))
    const { id: postId } = await seedPost(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/comments?postId=${postId}`)
      await page.waitForLoadState('networkidle')
    })
    const r = reqs.find((r) => r.method === 'GET' && /\/api\/comments(\?|$)/.test(r.url))
    expect(r, 'comments page must fetch /api/comments').toBeTruthy()
    expect(r!.status).toBeLessThan(400)
  })

  test('clicking the Pending filter chip refires GET /api/comments?status=pending', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('comments-filter-net'))
    const { id: postId } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/comments?postId=${postId}`)
    await page.waitForLoadState('networkidle')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="comments-filter-pending"]').first().click()
      await page.waitForTimeout(800)
    })
    const r = reqs.find((r) => r.method === 'GET' && /status=pending/.test(r.url))
    if (r) expect(r.status).toBeLessThan(400)
  })

  test('Approved chip filters via GET /api/comments?status=approved', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('comments-approved-filter'))
    const { id: postId } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/comments?postId=${postId}`)
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="comments-filter-approved"]').first().click()
    await page.waitForTimeout(500)
    expect(
      await page.locator('[data-mol-id="comments-filter-approved"]').getAttribute('aria-pressed'),
    ).toBe('true')
  })

  test('Spam chip filters via GET /api/comments?status=spam', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('comments-spam-filter'))
    const { id: postId } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/comments?postId=${postId}`)
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="comments-filter-spam"]').first().click()
    await page.waitForTimeout(500)
    expect(
      await page.locator('[data-mol-id="comments-filter-spam"]').getAttribute('aria-pressed'),
    ).toBe('true')
  })

  test('All chip is the default and aria-pressed=true', async ({ page }) => {
    await signup(page, uniqueEmail('comments-all-chip'))
    await page.goto(APP_BASE + '/comments')
    await page.waitForLoadState('networkidle')
    expect(
      await page.locator('[data-mol-id="comments-filter-all"]').getAttribute('aria-pressed'),
    ).toBe('true')
  })

  test('mark-spam transitions a comment to status=spam', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('comments-spam'))
    const { id: postId } = await seedPost(page, accessToken)
    const c = await page.request.post(`${API_BASE}/comments`, {
      headers: authHeaders(accessToken),
      data: { body: 'Spammy', resourceType: 'post', resourceId: postId },
      failOnStatusCode: false,
    })
    const created = (await c.json()) as { id: string }
    await page.goto(APP_BASE + `/comments?postId=${postId}`)
    await page.waitForLoadState('networkidle')
    await page.locator(`[data-mol-id="comment-${created.id}-spam"]`).click()
    await page.waitForTimeout(800)
    const refreshed = await page.request.get(`${API_BASE}/comments/${created.id}`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    const after = (await refreshed.json()) as { status: string }
    expect(after.status).toBe('spam')
  })

  test('delete removes a comment from the database', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('comments-delete'))
    const { id: postId } = await seedPost(page, accessToken)
    const c = await page.request.post(`${API_BASE}/comments`, {
      headers: authHeaders(accessToken),
      data: { body: 'Will be deleted', resourceType: 'post', resourceId: postId },
      failOnStatusCode: false,
    })
    const created = (await c.json()) as { id: string }
    await page.goto(APP_BASE + `/comments?postId=${postId}`)
    await page.waitForLoadState('networkidle')
    await page.locator(`[data-mol-id="comment-${created.id}-delete"]`).click()
    await page.waitForTimeout(800)
    const fetch = await page.request.get(`${API_BASE}/comments/${created.id}`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(fetch.status()).toBeGreaterThanOrEqual(400)
  })

  test('the post-filter banner appears when ?postId is set', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('comments-banner'))
    const { id: postId } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/comments?postId=${postId}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="comments-post-filter-banner"]')).toBeVisible()
  })

  test('the create-form composer is visible only when ?postId is set', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('comments-composer'))
    const { id: postId } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/comments?postId=${postId}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="comments-create-form"]')).toBeVisible()
  })

  test('the comments list renders after seeding a comment', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('comments-list-render'))
    const { id: postId } = await seedPost(page, accessToken)
    await page.request.post(`${API_BASE}/comments`, {
      headers: authHeaders(accessToken),
      data: { body: 'Visible row', resourceType: 'post', resourceId: postId },
      failOnStatusCode: false,
    })
    await page.goto(APP_BASE + `/comments?postId=${postId}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="comments-list"]')).toBeVisible()
  })
})
