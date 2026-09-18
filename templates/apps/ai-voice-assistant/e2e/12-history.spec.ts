import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  apiGet,
  APP_BASE,
  captureNetwork,
  ensureConversation,
  postTextMessage,
  signup,
} from './_helpers.js'

interface ConversationRow {
  id: string
  title: string
  total_seconds_spoken?: number
  message_count?: number
}

test.describe('/history (transcripts archive)', () => {
  test.setTimeout(120_000)

  test('renders an empty-state for a fresh user with no conversations', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await expect(page.getByRole('heading', { name: /history/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/nothing matches that yet/i)).toBeVisible({ timeout: 10_000 })
  })

  test('after one conversation, the entry shows up in the list', async ({ page }) => {
    await signup(page)
    const conv = await ensureConversation(page)
    await postTextMessage(page, conv.id, 'Reply with one word.')
    await page.goto(APP_BASE + '/history')
    await expect(page.getByRole('heading', { name: /history/i })).toBeVisible()
    await expect(page.getByText(conv.title).first()).toBeVisible({ timeout: 15_000 })
  })

  test('clicking a conversation row routes to /history/:id', async ({ page }) => {
    await signup(page)
    const conv = await ensureConversation(page)
    await postTextMessage(page, conv.id, 'Hi.')
    await page.goto(APP_BASE + '/history')
    await page
      .getByRole('link', { name: new RegExp(conv.title, 'i') })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp('/history/' + conv.id))
  })

  test('the search input filters the visible list', async ({ page }) => {
    await signup(page)
    const conv = await ensureConversation(page)
    await postTextMessage(page, conv.id, 'Hi.')
    await page.goto(APP_BASE + '/history')
    await expect(page.getByText(conv.title).first()).toBeVisible({ timeout: 15_000 })
    const search = page.locator('input[placeholder*="search" i]').first()
    await search.fill('zzz-no-match-' + Date.now())
    await expect(page.getByText(/nothing matches that yet/i)).toBeVisible()
  })

  test('the "Voice only" filter button toggles aria-pressed', async ({ page }) => {
    await signup(page)
    const conv = await ensureConversation(page)
    await postTextMessage(page, conv.id, 'Hi.')
    await page.goto(APP_BASE + '/history')
    const voiceOnly = page.getByRole('button', { name: /voice only/i })
    await voiceOnly.click()
    await expect(voiceOnly).toHaveAttribute('aria-pressed', 'true')
    await voiceOnly.click()
    await expect(voiceOnly).toHaveAttribute('aria-pressed', 'false')
  })

  test('GET /api/conversations only returns rows owned by the requester', async ({
    page,
    browser,
  }) => {
    // User A
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    await signup(p)
    await ensureConversation(p)
    await ctx.close()

    // User B
    await signup(page)
    const list = await apiGet<ConversationRow[]>(page, '/conversations')
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBe(0)
  })

  test('mounting /history fires GET /api/conversations (captureNetwork)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/history')
      await expect(page.getByRole('heading', { name: /^history$/i })).toBeVisible({
        timeout: 15_000,
      })
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/conversations(\?|$)/.test(r.url))
    expect(list, 'GET /api/conversations must fire on /history mount').toBeDefined()
    expect(list!.status).toBe(200)
  })
})
