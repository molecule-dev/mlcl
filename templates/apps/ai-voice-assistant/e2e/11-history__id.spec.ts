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
}

test.describe('/history/:id (transcript playback)', () => {
  test.setTimeout(120_000)

  test('shows the title, the messages, and a play button', async ({ page }) => {
    await signup(page)
    const conv = await ensureConversation(page)
    await postTextMessage(page, conv.id, 'Reply with: detail-page-test.')

    await page.goto(APP_BASE + '/history/' + conv.id)
    await expect(page.getByRole('heading', { name: /test conversation/i })).toBeVisible({
      timeout: 15_000,
    })
    // Both bubbles render
    await expect(page.locator('[data-mol-id="conversation-detail-message-0"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /play playback/i })).toBeVisible()
  })

  test('"Back to history" link goes to /history', async ({ page }) => {
    await signup(page)
    const conv = await ensureConversation(page)
    await page.goto(APP_BASE + '/history/' + conv.id)
    await page
      .getByRole('link', { name: /back to history|all/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/history$/, { timeout: 10_000 })
  })

  test('clicking Play fires POST /api/speech/synthesize and marks an active message', async ({
    page,
  }) => {
    await signup(page)
    const conv = await ensureConversation(page)
    await postTextMessage(page, conv.id, 'Say only the word ok.')
    await page.goto(APP_BASE + '/history/' + conv.id)

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /play playback/i }).click()
      // Either the synthesize request fires OR the active marker shows up.
      await page.waitForResponse(
        (r) => /\/api\/speech\/synthesize/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 60_000 },
      )
    })
    const synthesize = reqs.find(
      (r) => r.method === 'POST' && /\/api\/speech\/synthesize/.test(r.url),
    )
    expect(synthesize, 'POST /api/speech/synthesize must fire').toBeDefined()
    expect(synthesize!.status).toBeLessThan(300)
    // The active-marker DOM appears once the loop selects index 0.
    await expect(page.locator('[data-mol-id="conversation-detail-active"]')).toBeAttached({
      timeout: 5_000,
    })
  })

  test('the speed pills toggle aria-pressed state', async ({ page }) => {
    await signup(page)
    const conv = await ensureConversation(page)
    await postTextMessage(page, conv.id, 'Pong.')
    await page.goto(APP_BASE + '/history/' + conv.id)
    const fast = page.getByRole('button', { name: /set playback speed to 2/i })
    await fast.click()
    await expect(fast).toHaveAttribute('aria-pressed', 'true')
    const normal = page.getByRole('button', { name: /set playback speed to 1×/i })
    await normal.click()
    await expect(normal).toHaveAttribute('aria-pressed', 'true')
    await expect(fast).toHaveAttribute('aria-pressed', 'false')
  })

  test('timecodes for messages render based on message timestamps', async ({ page }) => {
    await signup(page)
    const conv = await ensureConversation(page)
    await postTextMessage(page, conv.id, 'First.')
    await page.goto(APP_BASE + '/history/' + conv.id)
    // Each per-message header lives inside the message <article>; scope
    // the selector so we don't hit the page-level "00:00 · 2 turns" tab.
    const codes = page.locator('article header span.tabular-nums')
    await codes.first().waitFor({ timeout: 10_000 })
    await expect(codes.first()).toBeAttached()
    const text = (await codes.first().textContent()) ?? ''
    expect(text.trim()).toMatch(/^\d{1,2}:\d{2}$/)
  })

  test('GET /api/conversations/:id of another user 404s (IDOR guard)', async ({
    page,
    browser,
  }) => {
    // User A creates a conversation
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    await signup(p)
    const aConv = await ensureConversation(p)
    await ctx.close()

    // User B tries to read it
    await signup(page)
    const resp = await page.request.get(
      (process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4200') + '/api') +
        '/conversations/' +
        aConv.id,
      {
        headers: {
          Authorization:
            'Bearer ' +
            (await page.evaluate(() => {
              for (const k of Object.keys(window.localStorage)) {
                const raw = window.localStorage.getItem(k) ?? ''
                if (/^eyJ[A-Za-z0-9._-]+$/.test(raw)) return raw
                try {
                  const parsed = JSON.parse(raw)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const t = (parsed as any)?.accessToken ?? ''
                  if (typeof t === 'string' && /^eyJ/.test(t)) return t
                } catch {
                  /* ignore */
                }
              }
              return ''
            })),
        },
      },
    )
    expect(resp.status(), 'cross-user read must NOT succeed (G6 IDOR)').toBe(404)
  })
})

// Helper: import here to use the same import path as the helpers.
async function _placeholder(): Promise<ConversationRow | null> {
  return null
}
void _placeholder
void apiGet
