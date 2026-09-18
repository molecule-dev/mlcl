import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, APP_BASE, captureNetwork, signup } from './_helpers.js'

interface AgentRow {
  id: string
  name: string
  voice_id: string | null
  system_prompt: string
  tools?: { tempo?: number; warmth?: number; capabilities?: Record<string, boolean> }
}

test.describe('/agents/:id (persona editor)', () => {
  test.setTimeout(60_000)

  test('hydrates name, voice, and prompt fields from the API row', async ({ page }) => {
    await signup(page)
    const agent = await apiPost<AgentRow>(page, '/agents', { name: 'Hydration Test' })
    await page.goto(APP_BASE + '/agents/' + agent.id)
    await expect(page.getByRole('heading', { name: /hydration test/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: /system prompt/i })).toBeVisible()
    // The voice tile picker is rendered with all six OpenAI voices (or the
    // dynamic /speech/voices result, which also returns six in this app).
    await expect(page.locator('[data-mol-id^="agent-voice-"]')).toHaveCount(6, { timeout: 15_000 })
  })

  test('clicking a voice tile updates the active state', async ({ page }) => {
    await signup(page)
    const agent = await apiPost<AgentRow>(page, '/agents', { name: 'Voice Picker Test' })
    await page.goto(APP_BASE + '/agents/' + agent.id)
    const echo = page.locator('[data-mol-id="agent-voice-echo"]')
    await echo.click()
    await expect(echo).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-mol-id="voice-picked-at"]')).toBeAttached({ timeout: 5_000 })
  })

  test('Save persists voice + tools to the row (read-after-write + reload survives)', async ({
    page,
  }) => {
    await signup(page)
    const agent = await apiPost<AgentRow>(page, '/agents', { name: 'Save Roundtrip' })
    await page.goto(APP_BASE + '/agents/' + agent.id)

    await page.locator('[data-mol-id="agent-voice-onyx"]').click()
    // Toggle the calendar capability (default false in the page state).
    await page.getByRole('button', { name: /calendar access/i }).click()
    await page.getByRole('button', { name: /save persona/i }).click()
    await expect(page.getByText(/saved at/i)).toBeVisible({ timeout: 10_000 })

    // Read-after-write: GET the row directly.
    const fresh = await apiGet<AgentRow>(page, '/agents/' + agent.id)
    expect(fresh.voice_id).toBe('onyx')
    expect(fresh.tools?.capabilities?.calendar).toBe(true)

    // Reload survives.
    await page.reload()
    await expect(page.getByRole('heading', { name: /save roundtrip/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('[data-mol-id="agent-voice-onyx"]')).toHaveAttribute(
      'aria-pressed',
      'true',
      { timeout: 10_000 },
    )
  })

  test('"All agents" back link returns to /agents', async ({ page }) => {
    await signup(page)
    const agent = await apiPost<AgentRow>(page, '/agents', { name: 'Back Link Test' })
    await page.goto(APP_BASE + '/agents/' + agent.id)
    await page
      .getByRole('link', { name: /all agents|back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/agents$/, { timeout: 10_000 })
  })

  test('Tempo and warmth sliders persist updated values across reload', async ({ page }) => {
    await signup(page)
    const agent = await apiPost<AgentRow>(page, '/agents', { name: 'Slider Test' })
    await page.goto(APP_BASE + '/agents/' + agent.id)
    // Set tempo and warmth via input range elements
    const sliders = page.locator('input[type="range"]')
    await expect(sliders).toHaveCount(2, { timeout: 15_000 })
    await sliders.nth(0).fill('30')
    await sliders.nth(1).fill('90')
    await page.getByRole('button', { name: /save persona/i }).click()
    await expect(page.getByText(/saved at/i)).toBeVisible({ timeout: 10_000 })

    const fresh = await apiGet<AgentRow>(page, '/agents/' + agent.id)
    expect(fresh.tools?.tempo).toBe(30)
    expect(fresh.tools?.warmth).toBe(90)
  })

  test('mounting /agents/:id fetches /api/agents/:id and /api/speech/voices (captureNetwork)', async ({
    page,
  }) => {
    await signup(page)
    const agent = await apiPost<AgentRow>(page, '/agents', { name: 'Network Watcher' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/agents/' + agent.id)
      await expect(page.getByRole('heading', { name: /network watcher/i })).toBeVisible({
        timeout: 15_000,
      })
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    const detail = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/agents/${agent.id}(\\?|$)`).test(r.url),
    )
    const voices = reqs.find((r) => r.method === 'GET' && /\/api\/speech\/voices/.test(r.url))
    expect(detail, 'GET /api/agents/:id must fire').toBeDefined()
    expect(voices, 'GET /api/speech/voices must fire').toBeDefined()
  })

  test('reading another user’s agent 404s (G6 IDOR)', async ({ page, browser }) => {
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    await signup(p)
    const aAgent = await apiPost<AgentRow>(p, '/agents', { name: 'Foreign Agent' })
    await ctx.close()

    await signup(page)
    const resp = await page.request.get(
      (process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4200') + '/api') +
        '/agents/' +
        aAgent.id,
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
    expect(resp.status()).toBe(404)
  })
})
