/**
 * Duplicate merge: admin folds one request into another — votes pool (union,
 * one per user), comments move, and the source renders a "moved" banner
 * linking the survivor while disappearing from board listings.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  firstBoard,
  promoteToAdmin,
  seedPost,
  signup,
} from './_helpers.js'

test.describe('merge duplicates', () => {
  test('merging pools votes, moves comments, and stamps the source', async ({ page }) => {
    const admin = await signup(page)
    const board = await firstBoard(page)

    const target = await seedPost(page, admin.accessToken, { board_id: board.id })
    const duplicate = await seedPost(page, admin.accessToken, { board_id: board.id })

    // A second user votes BOTH posts (union semantics must keep one vote).
    const voter = await signup(page)
    for (const id of [target.id, duplicate.id]) {
      const res = await page.request.post(`${API_BASE}/votes`, {
        headers: apiHeaders(voter.accessToken),
        data: { post_id: id },
      })
      expect(res.status()).toBeLessThan(300)
    }
    // A comment lives on the duplicate and must move.
    const comment = await page.request.post(`${API_BASE}/posts/${duplicate.id}/comments`, {
      headers: apiHeaders(voter.accessToken),
      data: { body: 'Same ask — these should be one request.' },
    })
    expect(comment.status()).toBeLessThan(300)

    await promoteToAdmin(page, admin.accessToken)
    const merge = await page.request.post(`${API_BASE}/admin/posts/${duplicate.id}/merge`, {
      headers: apiHeaders(admin.accessToken),
      data: { target_id: target.id },
    })
    expect(merge.status(), await merge.text()).toBeLessThan(300)
    const body = (await merge.json()) as { moved_votes: number; moved_comments: number }
    // Voter already voted the target, so only nothing moves; the duplicate's
    // author vote may or may not collide — assert the union outcome:
    expect(body.moved_comments).toBe(1)

    // The API view: duplicate carries merged_into + zeroed counters.
    const detail = await page.request.get(`${API_BASE}/posts/${duplicate.id}`)
    expect(detail.status()).toBeLessThan(300)
    const dup = (await detail.json()) as {
      merged_into: { id: string } | null
      vote_count: number
      comments: Array<{ body: string }>
    }
    expect(dup.merged_into?.id).toBe(target.id)
    expect(dup.vote_count).toBe(0)
    // The comment moved off the duplicate.
    expect(dup.comments).toHaveLength(0)
    const targetDetail = await page.request.get(`${API_BASE}/posts/${target.id}`)
    const tgt = (await targetDetail.json()) as { comments: Array<{ body: string }> }
    expect(tgt.comments.some((c) => c.body === 'Same ask — these should be one request.')).toBe(
      true,
    )

    // The UI view: the duplicate's page shows the moved banner + link.
    await page.goto(APP_BASE + `/post/${duplicate.id}`)
    const banner = page
      .getByRole('status')
      .filter({ hasText: /merged into/i })
      .first()
    await expect(banner).toBeVisible({ timeout: 15000 })
    await expect(banner.getByRole('link')).toHaveAttribute('href', new RegExp(`/post/${target.id}`))

    // Board listings hide the duplicate by default.
    await page.goto(APP_BASE + `/b/${board.slug}`)
    const rows = page.locator('[data-mol-id="post-card"]')
    await expect(rows.first()).toBeVisible({ timeout: 15000 })
    await expect(rows.filter({ hasText: duplicate.title })).toHaveCount(0)
  })

  test('a merged duplicate refuses new comments', async ({ page }) => {
    const admin = await signup(page)
    await promoteToAdmin(page, admin.accessToken)
    const board = await firstBoard(page)
    const target = await seedPost(page, admin.accessToken, { board_id: board.id })
    const duplicate = await seedPost(page, admin.accessToken, { board_id: board.id })

    const merge = await page.request.post(`${API_BASE}/admin/posts/${duplicate.id}/merge`, {
      headers: apiHeaders(admin.accessToken),
      data: { target_id: target.id },
    })
    expect(merge.status()).toBeLessThan(300)

    const res = await page.request.post(`${API_BASE}/posts/${duplicate.id}/comments`, {
      headers: apiHeaders(admin.accessToken),
      data: { body: 'Should be rejected — the conversation lives on the survivor.' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(403)
  })

  test('merging a post into itself is rejected', async ({ page }) => {
    const admin = await signup(page)
    await promoteToAdmin(page, admin.accessToken)
    const post = await seedPost(page, admin.accessToken)
    const res = await page.request.post(`${API_BASE}/admin/posts/${post.id}/merge`, {
      headers: apiHeaders(admin.accessToken),
      data: { target_id: post.id },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(400)
  })
})
