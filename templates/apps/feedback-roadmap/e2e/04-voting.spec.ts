/**
 * Voting: the demand signal. One vote per user, toggled on repeat — from
 * the post detail pill and the board list rows.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, firstBoard, seedPost, signup } from './_helpers.js'

test.describe('voting', () => {
  test('vote pill toggles one vote on and off from the detail page', async ({ page }) => {
    const { accessToken } = await signup(page)
    const post = await seedPost(page, accessToken)

    await page.goto(APP_BASE + `/post/${post.id}`)
    const voteButton = page.locator('[data-mol-id="vote-button"]')
    await expect(voteButton).toBeVisible({ timeout: 15000 })

    // Toggle ON (the submit helper's author vote was cast via API only when
    // using seedPost — it was not — so we start from the raw count).
    const before = Number((await voteButton.innerText()).replace(/[^0-9]/g, ''))
    await voteButton.click()
    await expect(voteButton).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 })

    // The API confirms exactly one vote row for this user.
    const mine = await page.request.get(`${API_BASE}/votes/mine`, {
      headers: apiHeaders(accessToken),
    })
    expect(mine.status()).toBeLessThan(300)
    const { data } = (await mine.json()) as { data: Array<{ post_id: string }> }
    expect(data.filter((v) => v.post_id === post.id)).toHaveLength(1)

    // Toggle OFF — repeat POST removes the vote.
    await voteButton.click()
    await expect(voteButton).toHaveAttribute('aria-pressed', 'false', { timeout: 10000 })
    const mineAfter = await page.request.get(`${API_BASE}/votes/mine`, {
      headers: apiHeaders(accessToken),
    })
    const { data: after } = (await mineAfter.json()) as { data: Array<{ post_id: string }> }
    expect(after.filter((v) => v.post_id === post.id)).toHaveLength(0)
    expect(before).toBeGreaterThanOrEqual(0)
  })

  test('second user can vote the same post — votes accumulate', async ({ page }) => {
    const author = await signup(page)
    const post = await seedPost(page, author.accessToken)

    // A second, independent session votes once.
    const voter = await signup(page)
    const cast = await page.request.post(`${API_BASE}/votes`, {
      headers: apiHeaders(voter.accessToken),
      data: { post_id: post.id },
    })
    expect(cast.status()).toBeLessThan(300)
    const castBody = (await cast.json()) as { voted: boolean; vote_count: number }
    expect(castBody.voted).toBe(true)

    // The board list reflects the accumulated count on that row.
    const board = await firstBoard(page)
    await page.goto(APP_BASE + `/b/${board.slug}`)
    const row = page.locator('[data-mol-id="post-card"]', { hasText: post.title }).first()
    await expect(row).toBeVisible({ timeout: 15000 })
    await expect(row.locator('[data-mol-id="vote-button"]')).toContainText(
      String(castBody.vote_count),
    )
  })

  test('my votes tab lists voted requests with live status', async ({ page }) => {
    const { accessToken } = await signup(page)
    const post = await seedPost(page, accessToken)
    await page.request.post(`${API_BASE}/votes`, {
      headers: apiHeaders(accessToken),
      data: { post_id: post.id },
    })

    await page.goto(APP_BASE + '/my-activity')
    await expect(page.getByRole('heading', { name: /voted for/i })).toBeVisible({
      timeout: 15000,
    })
    const card = page.locator('[data-mol-id="post-card"]', { hasText: post.title }).first()
    await expect(card).toBeVisible()
    // An open request shows its badge on the voted list.
    await expect(card.locator('[data-mol-id="status-badge-open"]')).toBeVisible()
  })

  test('anonymous vote is rejected by the API', async ({ page }) => {
    const { accessToken } = await signup(page)
    const post = await seedPost(page, accessToken)
    const res = await page.request.post(`${API_BASE}/votes`, {
      data: { post_id: post.id },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(401)
  })
})
