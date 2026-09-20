/**
 * Submit + view a feedback request: the UI form posts to /api/posts, the
 * detail page renders it publicly, and search finds it afterwards.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, firstBoard, signup } from './_helpers.js'

test.describe('submit + view posts', () => {
  test('submitting via the form lands on the new post detail', async ({ page }) => {
    const { accessToken } = await signup(page)
    const board = await firstBoard(page)

    await page.goto(APP_BASE + '/submit')
    await page.locator('[data-mol-id="submit-title"]').fill('A very specific e2e request')
    await page
      .locator('[data-mol-id="submit-body"]')
      .fill('Submitted by the e2e suite to prove the composer wires through to the API.')
    await page.locator(`[data-mol-id="submit-board-${board.slug}"]`).click()
    await page.locator('[data-mol-id="submit-post"]').click()

    await page.waitForURL(/\/post\//, { timeout: 15000 })
    // Detail page shows the title and the author's automatic first vote.
    await expect(page.getByRole('heading', { name: 'A very specific e2e request' })).toBeVisible()
    const voteButton = page.locator('[data-mol-id="vote-button"]')
    await expect(voteButton).toBeVisible()
    await expect(voteButton).toContainText('1')

    // The API agrees the post exists on the right board.
    const res = await page.request.get(`${API_BASE}/posts?board=${board.id}&sort=latest`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBeLessThan(300)
    const { data } = (await res.json()) as { data: Array<{ title: string }> }
    expect(data.some((p) => p.title === 'A very specific e2e request')).toBe(true)
  })

  test('post detail is publicly readable when signed out', async ({ page }) => {
    const { accessToken } = await signup(page)
    const created = await page.request.post(`${API_BASE}/posts`, {
      headers: apiHeaders(accessToken),
      data: {
        title: 'Public readability probe',
        body: 'Anyone should be able to read this without an account.',
        board_id: (await firstBoard(page)).id,
      },
    })
    expect(created.status()).toBeLessThan(300)
    const post = (await created.json()) as { id: string }

    // Fresh context: signed-out visitor.
    await page.context().clearCookies()
    await page.goto(APP_BASE + `/post/${post.id}`)
    await expect(page.getByRole('heading', { name: 'Public readability probe' })).toBeVisible({
      timeout: 15000,
    })
    // Signed-out vote pill routes to /login instead of dead-clicking.
    await expect(page.locator('[data-mol-id="vote-button-login"]')).toBeVisible()
  })

  test('search finds the request just created', async ({ page }) => {
    const { accessToken } = await signup(page)
    const marker = `searchable-${Date.now()}`
    await page.request.post(`${API_BASE}/posts`, {
      headers: apiHeaders(accessToken),
      data: {
        title: `Marker request ${marker}`,
        body: 'Exists so the search spec has something unique to find.',
        board_id: (await firstBoard(page)).id,
      },
    })

    await page.goto(APP_BASE + '/search')
    await page.locator('[data-mol-id="search-input"]').fill(marker)
    await page.locator('[data-mol-id="search-submit"]').click()
    await expect(page.locator('[data-mol-id="post-card"]').first()).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('[data-mol-id="post-card"]')).toHaveCount(1)
  })

  test('commenting on a post appends to the thread', async ({ page }) => {
    const { accessToken } = await signup(page)
    const created = await page.request.post(`${API_BASE}/posts`, {
      headers: apiHeaders(accessToken),
      data: {
        title: 'Comment thread host',
        body: 'A post that will receive a comment from the e2e suite.',
        board_id: (await firstBoard(page)).id,
      },
    })
    const post = (await created.json()) as { id: string }

    await page.goto(APP_BASE + `/post/${post.id}`)
    await page.locator('[data-mol-id="comment-input"]').fill('Adding useful context here.')
    await page.locator('[data-mol-id="comment-submit"]').click()
    await expect(page.locator('[data-mol-id="comment"]').first()).toContainText(
      'Adding useful context here.',
      { timeout: 15000 },
    )
  })
})
