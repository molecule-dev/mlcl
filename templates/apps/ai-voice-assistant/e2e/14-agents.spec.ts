import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, APP_BASE, captureNetwork, signup } from './_helpers.js'

interface AgentRow {
  id: string
  name: string
  voice_id: string | null
  system_prompt: string
  tools?: { tempo?: number; warmth?: number; capabilities?: Record<string, boolean> }
}

test.describe('/agents (list + CRUD)', () => {
  test.setTimeout(60_000)

  test('renders the empty-state for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/agents')
    await expect(page.getByRole('heading', { name: /choose a voice to think with/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/no personas yet/i)).toBeVisible({ timeout: 10_000 })
  })

  test('clicking "New persona" creates a row visible in the grid (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/agents')
    await page
      .getByRole('button', { name: /new persona|create/i })
      .first()
      .click()
    // Default name from i18n key: 'Untitled persona'
    await expect(page.getByText(/untitled persona/i).first()).toBeVisible({ timeout: 10_000 })
    // Backend invariant: GET /agents now returns at least one row owned by the user.
    const list = await apiGet<AgentRow[]>(page, '/agents')
    expect(list.length).toBeGreaterThan(0)
    expect(list[0]!.name.length).toBeGreaterThan(0)
  })

  test('clicking a persona card navigates to /agents/:id', async ({ page }) => {
    await signup(page)
    const agent = await apiPost<AgentRow>(page, '/agents', { name: 'Click Target' })
    await page.goto(APP_BASE + '/agents')
    await page
      .getByRole('link', { name: /click target/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp('/agents/' + agent.id), { timeout: 10_000 })
  })

  test('agents created by other users are not visible (G6 IDOR list scope)', async ({
    page,
    browser,
  }) => {
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    await signup(p)
    await apiPost<AgentRow>(p, '/agents', { name: 'Foreign Agent' })
    await ctx.close()

    await signup(page)
    const list = await apiGet<AgentRow[]>(page, '/agents')
    expect(list.find((a) => a.name === 'Foreign Agent')).toBeUndefined()
  })

  test('mounting /agents fires GET /api/agents (captureNetwork)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/agents')
      await expect(page.getByRole('heading', { name: /choose a voice/i })).toBeVisible({
        timeout: 15_000,
      })
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/agents(\?|$)/.test(r.url))
    expect(list, 'GET /agents must fire on /agents mount').toBeDefined()
    expect(list!.status).toBe(200)
  })
})
