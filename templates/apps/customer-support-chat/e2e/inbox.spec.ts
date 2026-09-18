import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, getAccessToken, signup } from './_helpers.js'

interface ConversationRow {
  id: string
  subject: string
  status: string
  priority: string
  visitor_name: string | null
  visitor_email: string | null
  user_id: string
}

test.describe('/inbox', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('renders the inbox shell with empty conversation list', async ({ page }) => {
    await page.goto(APP_BASE + '/inbox')
    await expect(page.getByRole('heading', { name: /inbox/i }).first()).toBeVisible()
    // Empty-state message visible (no convos yet for fresh user).
    await expect(page.getByText(/no conversations yet/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('+ New opens the new-conversation modal and creates a conversation that persists across reload', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/inbox')
    await page
      .getByRole('button', { name: /\+\s*new|new conversation/i })
      .first()
      .click()
    const dialog = page.getByRole('dialog', { name: /new conversation/i })
    await expect(dialog).toBeVisible()
    await dialog.locator('input[name="subject"]').fill('Refund question for order ABC-123')
    await dialog.locator('input[name="visitor_name"]').fill('Alice Customer')
    await dialog.locator('input[name="visitor_email"]').fill('alice@example.com')
    await dialog.locator('select[name="priority"]').selectOption('high')
    await dialog.getByRole('button', { name: /^create$/i }).click()
    // After create the modal closes and the URL shows the new conversation.
    await page.waitForURL(/\/conversation\//, { timeout: 20_000 })
    const id = page.url().split('/conversation/')[1]
    expect(id).toBeTruthy()
    // Backend invariant: GET shows the row with the right shape.
    const fetched = await apiGet<ConversationRow>(page, `/conversations/${id}`)
    expect(fetched.subject).toBe('Refund question for order ABC-123')
    expect(fetched.priority).toBe('high')
    expect(fetched.status).toBe('open')
    expect(fetched.visitor_email).toBe('alice@example.com')
    // Reload-persistence: still in the conversation.
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/conversation/${id}`))
  })

  test('inbox list shows the conversation after creation (reads its own write)', async ({
    page,
  }) => {
    const created = await apiPost<ConversationRow>(page, '/conversations', {
      subject: 'List visibility test',
      visitor_name: 'Bob',
      visitor_email: 'bob@example.com',
      priority: 'normal',
    })
    expect(created.id).toBeTruthy()
    await page.goto(APP_BASE + '/inbox')
    // The conversation row appears in the list (search by visitor or subject).
    await expect(page.getByText(/Bob|bob@example|List visibility test/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('inbox search filters via /api/conversations?search=', async ({ page }) => {
    await apiPost(page, '/conversations', {
      subject: 'UNIQUEPATTERNXYZ search target',
      visitor_email: 'searchable@example.com',
    })
    await apiPost(page, '/conversations', {
      subject: 'Other subject',
      visitor_email: 'other@example.com',
    })
    // This test validates that the inbox UI wires the search input to
    // GET /api/conversations?search=<query>. We do NOT assert the result
    // list contains the new row because that depends on the search
    // provider (Meilisearch) having indexed the row — index propagation
    // is asynchronous, often slow with hosted providers, and the
    // user_id filter excludes stale-index hits from prior test runs.
    // Result correctness is covered by the API-level handler test;
    // here we only verify the UI→API contract.
    await page.goto(APP_BASE + '/inbox')
    const searchInput = page.getByPlaceholder(/search conversations/i).first()
    const searchResponse = page.waitForResponse(
      (r) => /\/api\/conversations\?search=UNIQUEPATTERNXYZ/.test(r.url()) && r.status() < 400,
      { timeout: 15_000 },
    )
    await searchInput.fill('UNIQUEPATTERNXYZ')
    const response = await searchResponse
    expect(response.status()).toBeLessThan(400)
  })

  test('inbox enforces the maxConversations free-tier limit (read returns the same count)', async ({
    page,
  }) => {
    // Free tier maxConversations is 5 (see api/src/tiers.ts).
    for (let i = 0; i < 5; i += 1) {
      await apiPost(page, '/conversations', {
        subject: `Tier limit conv ${i}`,
        visitor_email: `tier+${i}@example.com`,
      })
    }
    // 6th must fail with 4xx (limit exceeded).
    const res = await page.request.post(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/conversations',
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAccessToken(page)}`,
        },
        data: { subject: 'Should fail', visitor_email: 'overflow@example.com' },
      },
    )
    expect(
      res.status(),
      'free-tier 6th conversation should be blocked by enforceLimit',
    ).toBeGreaterThanOrEqual(400)
    const list = await apiGet<ConversationRow[]>(page, '/conversations')
    expect(list.length, 'list count should still be exactly 5 after rejected create').toBe(5)
  })
})
