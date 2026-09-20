/**
 * The signature flow, end to end: a user submits an idea → others vote →
 * the product team (promoted via the dev-only test endpoint) marks it
 * planned with an official response and a roadmap quarter → moves it to
 * in progress → ships it — and the request appears on the public roadmap,
 * then the changelog, and the voter's own list flips to "shipped".
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, firstBoard, promoteToAdmin, signup } from './_helpers.js'

test.describe('admin status workflow (signature flow)', () => {
  test('submit → vote → planned (roadmap) → in progress → shipped (changelog)', async ({
    page,
  }) => {
    // 1. A customer submits an idea through the real form.
    const customer = await signup(page)
    const board = await firstBoard(page)
    const marker = `workflow-${Date.now()}`
    await page.goto(APP_BASE + '/submit')
    await page.locator('[data-mol-id="submit-title"]').fill(`Dark charts export ${marker}`)
    await page
      .locator('[data-mol-id="submit-body"]')
      .fill('Charts should be exportable as SVG and PNG from the share menu.')
    await page.locator(`[data-mol-id="submit-board-${board.slug}"]`).click()
    await page.locator('[data-mol-id="submit-post"]').click()
    await page.waitForURL(/\/post\//, { timeout: 15000 })
    const postId = page.url().split('/post/')[1]?.split(/[?#]/)[0] ?? ''
    expect(postId).toBeTruthy()

    // 2. A second customer votes it.
    const voter = await signup(page)
    const cast = await page.request.post(`${API_BASE}/votes`, {
      headers: apiHeaders(voter.accessToken),
      data: { post_id: postId },
    })
    expect(cast.status()).toBeLessThan(300)

    // 3. The product team plans it, with an official response + quarter.
    await promoteToAdmin(page, customer.accessToken)
    const planned = await page.request.post(`${API_BASE}/admin/posts/${postId}/status`, {
      headers: apiHeaders(customer.accessToken),
      data: {
        status: 'planned',
        admin_response: 'Slotted for the analytics revamp.',
        roadmap_label: 'Q9 2099',
      },
    })
    expect(planned.status(), await planned.text()).toBeLessThan(300)

    // The public roadmap shows it under Planned with the quarter label.
    await page.goto(APP_BASE + '/roadmap')
    const plannedCard = page
      .locator('[data-mol-id="roadmap-column-planned"] [data-mol-id="roadmap-card"]', {
        hasText: marker,
      })
      .first()
    await expect(plannedCard).toBeVisible({ timeout: 15000 })
    await expect(plannedCard).toContainText('Q9 2099')

    // The post detail shows the official response card + planned badge.
    await page.goto(APP_BASE + `/post/${postId}`)
    await expect(page.locator('[data-mol-id="official-response"]')).toContainText(
      'Slotted for the analytics revamp.',
    )
    await expect(page.locator('[data-mol-id="status-badge-planned"]')).toBeVisible()

    // 4. In progress — the roadmap column follows.
    const inProgress = await page.request.post(`${API_BASE}/admin/posts/${postId}/status`, {
      headers: apiHeaders(customer.accessToken),
      data: { status: 'in_progress' },
    })
    expect(inProgress.status()).toBeLessThan(300)
    await page.goto(APP_BASE + '/roadmap')
    await expect(
      page
        .locator('[data-mol-id="roadmap-column-in_progress"] [data-mol-id="roadmap-card"]', {
          hasText: marker,
        })
        .first(),
    ).toBeVisible({ timeout: 15000 })

    // 5. Ship it — the changelog entry appears, dated today.
    const shipped = await page.request.post(`${API_BASE}/admin/posts/${postId}/status`, {
      headers: apiHeaders(customer.accessToken),
      data: { status: 'shipped', admin_response: 'Shipped: SVG + PNG export in the share menu.' },
    })
    expect(shipped.status()).toBeLessThan(300)

    await page.goto(APP_BASE + `/post/${postId}`)
    await expect(page.locator('[data-mol-id="status-badge-shipped"]')).toBeVisible({
      timeout: 15000,
    })

    await page.goto(APP_BASE + '/changelog')
    const entry = page.locator('[data-mol-id="changelog-entry"]', { hasText: marker }).first()
    await expect(entry).toBeVisible({ timeout: 15000 })
    await expect(entry).toContainText('SVG + PNG export')

    // 6. The voter's own list shows the shipped state.
    await loginFresh(page, voter.email, voter.password)
    await page.goto(APP_BASE + '/my-activity')
    const votedCard = page.locator('[data-mol-id="post-card"]', { hasText: marker }).first()
    await expect(votedCard).toBeVisible({ timeout: 15000 })
    await expect(votedCard.locator('[data-mol-id="status-badge-shipped"]')).toBeVisible()
  })

  test('member cannot drive the admin workflow', async ({ page }) => {
    const member = await signup(page)
    const board = await firstBoard(page)
    const created = await page.request.post(`${API_BASE}/posts`, {
      headers: apiHeaders(member.accessToken),
      data: {
        title: 'Member gate probe',
        body: 'Ordinary members must not be able to set status.',
        board_id: board.id,
      },
    })
    const post = (await created.json()) as { id: string }

    const status = await page.request.post(`${API_BASE}/admin/posts/${post.id}/status`, {
      headers: apiHeaders(member.accessToken),
      data: { status: 'planned' },
      failOnStatusCode: false,
    })
    expect(status.status()).toBe(403)

    const stats = await page.request.get(`${API_BASE}/admin/stats`, {
      headers: apiHeaders(member.accessToken),
      failOnStatusCode: false,
    })
    expect(stats.status()).toBe(403)
  })
})

/** Re-login in the same tab with a fresh cookie jar for the voter session. */
async function loginFresh(page: import('@playwright/test').Page, email: string, password: string) {
  await page.context().clearCookies()
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('form button[type="submit"]').first().click()
  await page.waitForURL(/\/(boards|roadmap|changelog)/, { timeout: 15000 })
}
