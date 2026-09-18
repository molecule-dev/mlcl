/**
 * Thread CRUD + replies + voting via API + UI.
 * Verifies read-after-write at every stage and exercises the Compose
 * page's UI for an end-to-end form submission.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, firstCategory, seedThread, signup } from './_helpers.js'

test.describe('forum threads + replies + votes', () => {
  test('Compose UI publishes a thread and redirects to /thread/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const cat = await firstCategory(page)

    await page.goto(APP_BASE + '/compose')
    await page.locator('input[placeholder]').first().fill(`E2E thread ${Date.now()}`)
    await page
      .locator('textarea')
      .first()
      .fill('Body content long enough to satisfy the API validator.')
    // Pick a category by clicking the matching pill — buttons are
    // labelled "c/<Name>", not "c/<slug>", so match the human name.
    const escaped = cat.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const catBtn = page.getByRole('button', { name: new RegExp(escaped, 'i') }).first()
    await catBtn.click()
    await page.getByRole('button', { name: /Post to community|Publishing/i }).click()
    await page.waitForURL(/\/thread\/[\w-]+/, { timeout: 10000 })

    const id = page.url().split('/thread/')[1]
    const res = await page.request.get(`${API_BASE}/threads/${id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBeLessThan(400)
    const thread = (await res.json()) as { title?: string }
    expect(thread.title).toMatch(/^E2E thread/)
  })

  test('GET /threads lists newly created threads', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedThread(page, accessToken)
    const list = await page.request.get(`${API_BASE}/threads?sort=latest&limit=50`)
    expect(list.status()).toBeLessThan(400)
    const body = (await list.json()) as { data?: Array<{ id: string }> }
    expect(body.data?.some((th) => th.id === seeded.id)).toBe(true)
  })

  test('replies persist and increment reply_count', async ({ page }) => {
    const { accessToken } = await signup(page)
    const thread = await seedThread(page, accessToken)
    const before = await page.request.get(`${API_BASE}/threads/${thread.id}`)
    const beforeBody = (await before.json()) as { reply_count?: number }
    const before_count = beforeBody.reply_count ?? 0

    const reply = await page.request.post(`${API_BASE}/threads/${thread.id}/replies`, {
      headers: apiHeaders(accessToken),
      data: { body: 'A thoughtful reply.', parent_reply_id: null },
      failOnStatusCode: false,
    })
    expect(reply.status()).toBeLessThan(400)

    const after = await page.request.get(`${API_BASE}/threads/${thread.id}`)
    const afterBody = (await after.json()) as {
      reply_count?: number
      replies?: Array<{ body?: string }>
    }
    expect(afterBody.reply_count).toBe(before_count + 1)
    expect(afterBody.replies?.some((r) => r.body === 'A thoughtful reply.')).toBe(true)
  })

  test('votes adjust vote_score and persist', async ({ page }) => {
    const { accessToken } = await signup(page)
    const thread = await seedThread(page, accessToken)

    const upvote = await page.request.post(`${API_BASE}/votes`, {
      headers: apiHeaders(accessToken),
      data: { target_type: 'thread', target_id: thread.id, direction: 'up' },
      failOnStatusCode: false,
    })
    expect(upvote.status()).toBeLessThan(400)

    const after = await page.request.get(`${API_BASE}/threads/${thread.id}`)
    const body = (await after.json()) as { vote_score?: number }
    expect(body.vote_score ?? 0).toBeGreaterThanOrEqual(1)
  })

  test('search returns threads in {hits: ApiThread[]} shape', async ({ page }) => {
    const { accessToken } = await signup(page)
    const unique = `searchneedle${Date.now()}`
    await seedThread(page, accessToken, { title: `Find me: ${unique}` })

    // Search may use Meili async indexing — give it a moment, then poll.
    let found = false
    for (let i = 0; i < 6; i++) {
      const res = await page.request.get(
        `${API_BASE}/threads/search?q=${encodeURIComponent(unique)}`,
      )
      if (res.status() < 400) {
        const body = (await res.json()) as { hits?: Array<{ title?: string }> }
        if (body.hits?.some((h) => (h.title ?? '').includes(unique))) {
          found = true
          break
        }
      }
      await page.waitForTimeout(500)
    }
    expect(found, 'search did not return seeded thread').toBe(true)
  })
})
