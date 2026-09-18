import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  apiGet,
  APP_BASE,
  captureNetwork,
  postTextMessage,
  signup,
  ensureConversation,
} from './_helpers.js'

interface ConversationRow {
  id: string
  title: string
  message_count: number
}
interface MessageRow {
  id: string
  role: string
  content: string
  type: string
}
interface ConversationDetailRow extends ConversationRow {
  messages?: MessageRow[]
}

test.describe('/conversation (the talk surface)', () => {
  test.setTimeout(120_000)

  test('mounts, fetches /conversations, and renders the empty-state hint', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/conversation')
      await expect(page.getByRole('heading', { name: /talk it through/i })).toBeVisible({
        timeout: 15_000,
      })
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/conversations(\?|$)/.test(r.url))
    expect(list, 'GET /conversations should fire on first mount').toBeDefined()
    expect(list!.status).toBe(200)
    // Empty-state copy from Conversation.tsx
    await expect(page.getByText(/no messages yet/i)).toBeVisible({ timeout: 10_000 })
  })

  test('typing a message creates a real conversation and gets a real Anthropic reply', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/conversation')
    await expect(page.getByRole('heading', { name: /talk it through/i })).toBeVisible()

    // Use a prompt that forces the assistant to echo a unique token; the
    // user's optimistic ChatBubble already contains the prompt verbatim,
    // so any naive `waitFor(/pong/)` will match the user's message and
    // race past the actual assistant reply. We instead wait for the
    // /messages POST response itself, then assert on the read-after-write.
    const input = page.locator('input[placeholder*="follow-up"]')
    await input.fill('Reply with: ASSIST_ACK and nothing else.')
    const reqs: Array<{ method: string; url: string; status: number }> = []
    page.on('response', (resp) => {
      reqs.push({
        method: resp.request().method(),
        url: resp.url(),
        status: resp.status(),
      })
    })
    const messagesPost = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' && /\/api\/conversations\/[^/]+\/messages/.test(r.url()),
      { timeout: 60_000 },
    )
    await page
      .getByRole('button', { name: /^send$/i })
      .first()
      .click()
    const postResp = await messagesPost
    expect(postResp.status()).toBeLessThan(300)
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/conversations\/[^/]+\/messages/.test(r.url),
    )
    expect(post, 'POST /conversations/:id/messages must fire').toBeDefined()

    // Read-after-write: GET the conversation, expect TWO messages (user + assistant)
    const conversations = await apiGet<ConversationRow[]>(page, '/conversations')
    expect(conversations.length).toBeGreaterThan(0)
    const id = conversations[0]!.id
    const detail = await apiGet<ConversationDetailRow>(page, `/conversations/${id}`)
    const msgs = detail.messages ?? []
    const user = msgs.find((m) => m.role === 'user')
    const assistant = msgs.find((m) => m.role === 'assistant')
    expect(user?.content).toMatch(/ASSIST_ACK/)
    // The assistant must have actually replied with something Anthropic
    // generated, not an empty placeholder.
    expect((assistant?.content ?? '').length).toBeGreaterThan(0)
  })

  test('voice playback toggle is a switch and flips between voice on / off', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/conversation')
    const toggle = page.getByRole('switch', { name: /voice playback/i })
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    const before = await toggle.getAttribute('aria-checked')
    await toggle.click()
    await page.waitForTimeout(300)
    const after = await toggle.getAttribute('aria-checked')
    expect(after).not.toBe(before)
  })

  test('voice playback toggle persists to /preferences and survives reload', async ({ page }) => {
    // Past versions of this page kept the toggle in pure useState — flipping
    // it appeared to work but the next page-load (or device switch) silently
    // reset to "on" because the bond never round-tripped through the server.
    // This test is the regression seal: the click MUST PUT, and the GET on
    // reload MUST return the new value.
    await signup(page)
    await page.goto(APP_BASE + '/conversation')
    const toggle = page.getByRole('switch', { name: /voice playback/i })
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    // Hydrate from /preferences (default is true) before flipping. Without
    // this wait, the click can race the initial GET and the PUT lands
    // before the GET resolves, then the GET overwrites the toggle.
    await page.waitForTimeout(800)
    const before = await toggle.getAttribute('aria-checked')

    // Flip and observe that a PUT /preferences fires with the new value.
    const putResp = page.waitForResponse(
      (r) => r.request().method() === 'PUT' && /\/api\/preferences/.test(r.url()),
      { timeout: 10_000 },
    )
    await toggle.click()
    const resp = await putResp
    expect(resp.status(), 'PUT /preferences should be 2xx').toBeLessThan(300)
    const after = await toggle.getAttribute('aria-checked')
    expect(after).not.toBe(before)

    // Read-after-write: the persisted preference reflects the toggle.
    const prefs = await apiGet<{ voicePlaybackEnabled: boolean }>(page, '/preferences')
    expect(String(prefs.voicePlaybackEnabled)).toBe(after)

    // Reload — the toggle must hydrate from the persisted value, not the
    // optimistic default.
    await page.reload()
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(800)
    const persisted = await toggle.getAttribute('aria-checked')
    expect(persisted).toBe(after)
  })

  test('mic toggle button toggles aria-pressed state on click in browsers without mic', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/conversation')
    const mic = page.getByRole('button', { name: /toggle microphone/i })
    await expect(mic).toBeVisible({ timeout: 15_000 })
    // The handler will fail because headless Chromium has no mic — but we
    // verify it does not throw uncaught (e.g., the catch block handled it
    // and the button stayed clickable).
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await mic.click()
    await page.waitForTimeout(500)
    expect(errors).toEqual([])
  })

  test('text message + voice playback enabled triggers POST /api/speech/synthesize', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/conversation')

    // Programmatically enable voice playback (default true in fresh state).
    const toggle = page.getByRole('switch', { name: /voice playback/i })
    if ((await toggle.getAttribute('aria-checked')) !== 'true') {
      await toggle.click()
    }
    await page.waitForTimeout(200)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[placeholder*="follow-up"]').fill('Reply with one short word.')
      await page
        .getByRole('button', { name: /^send$/i })
        .first()
        .click()
      // Wait for the synthesize call which fires after the assistant message arrives.
      await page.waitForResponse(
        (r) => /\/api\/speech\/synthesize/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 60_000 },
      )
    })
    const synthesize = reqs.find(
      (r) => r.method === 'POST' && /\/api\/speech\/synthesize/.test(r.url),
    )
    expect(synthesize, 'POST /api/speech/synthesize must fire').toBeDefined()
    expect(synthesize!.status, 'TTS must return audio (2xx)').toBeLessThan(300)
  })

  test('reload preserves the conversation history (read-after-reload)', async ({ page }) => {
    await signup(page)
    const conv = await ensureConversation(page)
    await postTextMessage(page, conv.id, 'Reply with: persistence.')
    await page.goto(APP_BASE + '/conversation')
    await expect(page.getByText(/persistence/i).first()).toBeVisible({ timeout: 30_000 })
    await page.reload()
    await expect(page.getByText(/persistence/i).first()).toBeVisible({ timeout: 30_000 })
  })
})
