import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiGet,
  apiPost,
  ensureConversation,
  getUserId,
  postTextMessage,
  signup,
} from './_helpers.js'

interface AgentRow {
  id: string
  name: string
}
interface ConversationRow {
  id: string
  title: string
}
interface MessageRow {
  role: string
  content: string
}
interface ConversationDetailRow extends ConversationRow {
  messages?: MessageRow[]
}

/**
 * Cross-page kitchen-sink journey for ai-voice-assistant (Vox):
 * sign up → talk surface → backend conversation row + assistant reply →
 * persona create + clickable card → history archive shows the new
 * conversation → playback timecodes render → settings PUT persists.
 *
 * Asserts persistence via the backend after each phase so this spec
 * also acts as a smoke test for every wired-up feature.
 */
test.describe('user journey — ai-voice-assistant end-to-end', () => {
  test('owner can sign up, converse, manage personas, and review history', async ({ page }) => {
    test.setTimeout(180_000)

    // Phase 1 — signup → land on the conversation surface.
    await signup(page)
    await expect(page).toHaveURL(/\/conversation/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /talk it through/i })).toBeVisible({
      timeout: 15_000,
    })

    // Phase 2 — send a text message; backend creates conversation row + reply.
    const conv = await ensureConversation(page)
    const reply = await postTextMessage(page, conv.id, 'Reply with: JOURNEY_ACK')
    expect(reply.assistantMessage.content.length).toBeGreaterThan(0)

    // Read-after-write through the API.
    const detail = await apiGet<ConversationDetailRow>(page, `/conversations/${conv.id}`)
    const messages = detail.messages ?? []
    expect(messages.find((m) => m.role === 'user')?.content).toMatch(/JOURNEY_ACK/)
    expect((messages.find((m) => m.role === 'assistant')?.content ?? '').length).toBeGreaterThan(0)

    // Phase 3 — agents page; create a persona; verify it lands in /agents.
    await page.goto(APP_BASE + '/agents')
    await page
      .getByRole('button', { name: /new persona|create/i })
      .first()
      .click()
    await expect(page.getByText(/untitled persona/i).first()).toBeVisible({ timeout: 10_000 })

    const agents = await apiGet<AgentRow[]>(page, '/agents')
    expect(agents.length).toBeGreaterThan(0)
    const agent = agents[0]!

    // Persona detail loads with the system-prompt heading.
    await page.goto(APP_BASE + '/agents/' + agent.id)
    await expect(page.getByRole('heading', { name: /system prompt/i })).toBeVisible({
      timeout: 15_000,
    })

    // Phase 4 — history archive shows the conversation; click into detail.
    await page.goto(APP_BASE + '/history')
    await expect(page.getByRole('heading', { name: /^history$/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(conv.title).first()).toBeVisible({ timeout: 10_000 })

    await page.goto(APP_BASE + '/history/' + conv.id)
    await expect(page.locator('[data-mol-id="conversation-detail-message-0"]')).toBeVisible({
      timeout: 15_000,
    })
    const codes = page.locator('article header span.tabular-nums')
    await expect(codes.first()).toBeAttached()

    // Phase 5 — settings page; toggling a switch persists.
    await page.goto(APP_BASE + '/settings')
    const reminders = page.getByRole('switch', { name: /daily check/i })
    await reminders.click()
    await expect(reminders).toHaveAttribute('aria-checked', 'false', { timeout: 10_000 })
    await page.waitForTimeout(500)
    const prefs = await apiGet<{ notifications?: { reminders?: boolean } }>(page, '/preferences')
    expect(prefs.notifications?.reminders).toBe(false)

    // Phase 6 — billing surface renders with the Free plan readout.
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.getByText(/free plan/i)).toBeVisible({ timeout: 10_000 })

    // Phase 7 — clean up: deleting the agent removes it from the list.
    await page.request.delete(
      (process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4200') + '/api') +
        '/agents/' +
        agent.id,
      {
        headers: {
          Authorization:
            'Bearer ' +
            (await page.evaluate(() => {
              for (const k of Object.keys(window.localStorage)) {
                const raw = window.localStorage.getItem(k) ?? ''
                if (/^eyJ/.test(raw)) return raw
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
    const after = await apiGet<AgentRow[]>(page, '/agents')
    expect(after.find((a) => a.id === agent.id)).toBeFalsy()
  })

  test('public pricing tiers endpoint returns three plans with Stripe price IDs', async ({
    page,
  }) => {
    interface Tier {
      key: string
      prices: Array<{ stripePriceId?: string | null }>
    }
    const resp = await page.request.get(
      (process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4200') + '/api') +
        '/billing/tiers',
    )
    expect(resp.status()).toBe(200)
    const body = (await resp.json()) as { data: Tier[] }
    expect(body.data.length).toBe(3)
    const pro = body.data.find((t) => t.key === 'pro')
    const team = body.data.find((t) => t.key === 'team')
    expect(pro!.prices.some((p) => /^price_/.test(p.stripePriceId ?? ''))).toBe(true)
    expect(team!.prices.some((p) => /^price_/.test(p.stripePriceId ?? ''))).toBe(true)
  })

  test('post-signup user can read its own /users/:id row', async ({ page }) => {
    interface UserRow {
      props: { id: string; email: string }
    }
    const { email } = await signup(page)
    // Use the JWT-decoding helper rather than scanning localStorage by hand;
    // the auth bond stores the user separately from the userId-bearing token.
    const id = await getUserId(page)
    expect(id, 'getUserId() must return the freshly-signed-up user uuid').toMatch(/^[0-9a-f-]{36}$/)
    const me = await apiGet<UserRow>(page, '/users/' + id)
    expect(me.props.email).toBe(email)
  })

  // Touch the apiPost helper at top so the imports are not dead.
  test('apiPost helper round-trips a new conversation row', async ({ page }) => {
    await signup(page)
    const conv = await apiPost<{ id: string; title: string }>(page, '/conversations', {
      title: 'Helper round-trip',
    })
    expect(conv.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(conv.title).toBe('Helper round-trip')
  })
})
