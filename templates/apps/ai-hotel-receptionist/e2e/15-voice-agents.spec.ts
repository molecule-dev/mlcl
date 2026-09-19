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
    const agent = await page.evaluate(async () => {
      const resp = await fetch('/api/voice-agents', { credentials: 'include' })
      const body = (await resp.json()) as {
        data: Array<{ id: string; languages: string[] | string }>
      }
      return body.data[0]!
    })
    const langs = Array.isArray(agent.languages) ? agent.languages : JSON.parse(agent.languages)
    // Pick a language the agent speaks but is not its last one (cannot drop
    // the final language), plus one it does not, and toggle the OFF one ON.
    const off = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'it', 'pt'].find((l) => !langs.includes(l))!
    await page.goto(APP_BASE + '/voice-agents')
    const chip = page.locator('[data-mol-id="voice-agent-lang-' + agent.id + '-' + off + '"]')
    await expect(chip).toBeVisible({ timeout: 15_000 })
    const patch = page.waitForResponse(
      (r) =>
        r.request().method() === 'PATCH' &&
        new RegExp('/api/voice-agents/' + agent.id + '$').test(r.url()),
      { timeout: 15_000 },
    )
    await chip.click()
    const resp = await patch
    expect(resp.status(), 'PATCH /api/voice-agents/:id should be 2xx').toBeLessThan(300)
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
  })
})
