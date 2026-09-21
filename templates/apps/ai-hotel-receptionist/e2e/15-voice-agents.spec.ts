import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/voice-agents', () => {
  test('renders one config card per agent with its language chips on', async ({ page }) => {
    await signup(page)
    const agents = await page.evaluate(async () => {
      const resp = await fetch('/api/voice-agents', { credentials: 'include' })
      const body = (await resp.json()) as {
        data: Array<{ id: string; languages: string[] | string }>
      }
      return body.data
    })
    expect(agents.length, 'voice agents must be seeded').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/voice-agents')
    await expect(page.getByRole('heading', { name: 'Voice agents' })).toBeVisible({
      timeout: 15_000,
    })
    for (const agent of agents) {
      const langs = Array.isArray(agent.languages) ? agent.languages : JSON.parse(agent.languages)
      const chip = page.locator(
        '[data-mol-id="voice-agent-lang-' + agent.id + '-' + langs[0] + '"]',
      )
      await expect(chip).toBeVisible({ timeout: 15_000 })
      await expect(chip).toHaveAttribute('aria-pressed', 'true')
    }
  })

  test('toggling a language persists via PATCH /api/voice-agents/:id', async ({ page }) => {
    await signup(page)
    // Pick an agent with more than one language and toggle one OFF — the
    // seeded primary agent speaks all 8 languages, so "find one it does not
    // speak" is undefined. Toggling OFF exercises the same PATCH path (the
    // API forbids dropping an agent's final language, so >1 is required).
    const agent = await page.evaluate(async () => {
      const resp = await fetch('/api/voice-agents', { credentials: 'include' })
      const body = (await resp.json()) as {
        data: Array<{ id: string; languages: string[] | string }>
      }
      return body.data.find((a) => {
        const langs = Array.isArray(a.languages) ? a.languages : JSON.parse(a.languages)
        return langs.length > 1
      })!
    })
    const langs = Array.isArray(agent.languages) ? agent.languages : JSON.parse(agent.languages)
    const on = langs[0]!
    await page.goto(APP_BASE + '/voice-agents')
    const chip = page.locator('[data-mol-id="voice-agent-lang-' + agent.id + '-' + on + '"]')
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    const patch = page.waitForResponse(
      (r) =>
        r.request().method() === 'PATCH' &&
        new RegExp('/api/voice-agents/' + agent.id + '$').test(r.url()),
      { timeout: 15_000 },
    )
    await chip.click()
    const resp = await patch
    expect(resp.status(), 'PATCH /api/voice-agents/:id should be 2xx').toBeLessThan(300)
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    // RESTORE the EXACT original array: voice agents are GLOBAL seed rows
    // shared by every test in the suite. Toggling off langs[0] and clicking
    // it back would append it last, changing which language is the agent's
    // FIRST (the scripted fallback when a caller speaks an unspoken
    // language) — and later specs (the Spanish simulator call) depend on it.
    // A single API PATCH restores the persisted state byte-for-byte.
    const restored = await page.evaluate(
      async ([agentId, original]) => {
        const resp = await fetch('/api/voice-agents/' + agentId, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ languages: original }),
        })
        return resp.status
      },
      [agent.id, langs] as [string, string[]],
    )
    expect(restored, 'languages restored to the seeded set').toBeLessThan(300)
    const after = await page.evaluate(async (agentId: string) => {
      const resp = await fetch('/api/voice-agents', { credentials: 'include' })
      const body = (await resp.json()) as { data: Array<{ id: string; languages: string[] }> }
      return body.data.find((a) => a.id === agentId)!.languages
    }, agent.id)
    expect(after).toEqual(langs)
  })
})
