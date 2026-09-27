import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, APP_BASE, bookViaApi, captureNetwork, signup } from './_helpers.js'

interface ConversationRow {
  id: string
  title: string
  message_count: number
}
interface MessageRow {
  id: string
  role: string
  content: string
  tool_calls?: Array<{ name: string }>
}
interface ConversationDetailRow extends ConversationRow {
  messages?: MessageRow[]
}

test.describe('/talk (the agent surface)', () => {
  test.setTimeout(150_000)

  test('mounts, fetches /conversations, and offers starting points', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/talk')
      await expect(page.getByRole('heading', { name: /where to\?/i })).toBeVisible({
        timeout: 15_000,
      })
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/conversations(\?|$)/.test(r.url))
    expect(list, 'GET /conversations should fire on first mount').toBeDefined()
    expect(list!.status).toBe(200)
    await expect(page.locator('[data-mol-id="talk-suggestion"]').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('a typed request runs the agent, which uses its tools and answers', async ({ page }) => {
    await signup(page)
    // Give the agent something to find: one booking, made the way the UI does it.
    const booking = await bookViaApi(page, 2)
    await page.goto(APP_BASE + '/talk')
    await expect(page.getByRole('heading', { name: /where to\?/i })).toBeVisible()

    const input = page.locator('[data-mol-id="talk-input"]')
    await input.fill('List my upcoming bookings and read me the confirmation code.')
    const messagesPost = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' && /\/api\/conversations\/[^/]+\/messages/.test(r.url()),
      { timeout: 90_000 },
    )
    await page.locator('[data-mol-id="talk-send"]').click()
    const postResp = await messagesPost
    expect(postResp.status()).toBeLessThan(300)

    // The reply is on screen, and the agent's work is shown as chips.
    await expect(page.locator('[data-mol-id="tool-calls"]').first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('[data-mol-id="tool-call-list_bookings"]').first()).toBeVisible()

    // Read-after-write: the turn is persisted with its tool calls, and the
    // answer refers to the real booking.
    const conversations = await apiGet<ConversationRow[]>(page, '/conversations')
    expect(conversations.length).toBeGreaterThan(0)
    const detail = await apiGet<ConversationDetailRow>(
      page,
      `/conversations/${conversations[0]!.id}`,
    )
    const assistant = (detail.messages ?? []).find((m) => m.role === 'assistant')
    expect(assistant, 'the assistant turn is stored').toBeDefined()
    expect(assistant!.content.length).toBeGreaterThan(0)
    expect(assistant!.content.toUpperCase()).toContain(booking.confirmation_code)
  })

  test('voice playback toggle persists to /preferences and survives reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/talk')
    const toggle = page.getByRole('switch', { name: /voice playback/i })
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(800)
    const before = await toggle.getAttribute('aria-checked')
    const putResp = page.waitForResponse(
      (r) => r.request().method() === 'PUT' && /\/api\/preferences/.test(r.url()),
      { timeout: 10_000 },
    )
    await toggle.click()
    expect((await putResp).status()).toBeLessThan(300)
    const after = await toggle.getAttribute('aria-checked')
    expect(after).not.toBe(before)
    const prefs = await apiGet<{ voicePlaybackEnabled: boolean }>(page, '/preferences')
    expect(String(prefs.voicePlaybackEnabled)).toBe(after)
    await page.reload()
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(800)
    expect(await toggle.getAttribute('aria-checked')).toBe(after)
  })

  test('the mic button handles a browser without a microphone', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/talk')
    const mic = page.getByRole('button', { name: /toggle microphone/i })
    await expect(mic).toBeVisible({ timeout: 15_000 })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await mic.click()
    await page.waitForTimeout(500)
    expect(errors).toEqual([])
  })

  test('"New trip" starts a fresh conversation', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/talk')
    await expect(page.getByRole('heading', { name: /where to\?/i })).toBeVisible()
    const post = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/conversations(\?|$)/.test(r.url()),
      { timeout: 15_000 },
    )
    await page.locator('[data-mol-id="talk-new-trip"]').click()
    expect((await post).status()).toBe(201)
    const conversations = await apiGet<ConversationRow[]>(page, '/conversations')
    expect(conversations.length).toBeGreaterThan(0)
  })
})
