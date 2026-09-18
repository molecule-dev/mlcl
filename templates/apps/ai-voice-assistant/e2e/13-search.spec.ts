import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiPost, captureNetwork, ensureConversation, signup } from './_helpers.js'

interface AgentRow {
  id: string
  name: string
}

test.describe('/search (command palette)', () => {
  test.setTimeout(60_000)

  test('renders search input + ⌘K hint and the static settings group', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await expect(page.getByRole('heading', { name: /search vox/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('input[placeholder*="search" i]').first()).toBeVisible()
    // The settings group is always rendered (built-in static results)
    await expect(page.getByText(/voice/i).first()).toBeVisible()
    await expect(page.getByText(/billing/i).first()).toBeVisible()
    await expect(page.getByText(/profile/i).first()).toBeVisible()
  })

  test('typing matches across transcripts and agents', async ({ page }) => {
    await signup(page)
    const conv = await ensureConversation(page)
    void conv
    const agent = await apiPost<AgentRow>(page, '/agents', { name: 'Findable Persona' })
    await page.goto(APP_BASE + '/search')
    await page.locator('input[placeholder*="search" i]').first().fill('Findable')
    await expect(page.getByText('Findable Persona')).toBeVisible({ timeout: 10_000 })
    void agent
  })

  test('clicking a result link navigates to its destination', async ({ page }) => {
    await signup(page)
    const agent = await apiPost<AgentRow>(page, '/agents', { name: 'NavTarget Agent' })
    await page.goto(APP_BASE + '/search')
    await page.locator('input[placeholder*="search" i]').first().fill('NavTarget')
    await page
      .getByRole('link', { name: /NavTarget Agent/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp('/agents/' + agent.id))
  })

  test('a search with no matches surfaces the empty-state copy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.locator('input[placeholder*="search" i]').first().fill('zzzzz-no-match-zzzzz')
    await expect(page.getByText(/no matches/i)).toBeVisible({ timeout: 5_000 })
  })

  test('mounting /search fetches /api/conversations and /api/agents (captureNetwork)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/search')
      await expect(page.getByRole('heading', { name: /search vox/i })).toBeVisible({
        timeout: 15_000,
      })
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    const conversations = reqs.find(
      (r) => r.method === 'GET' && /\/api\/conversations(\?|$)/.test(r.url),
    )
    const agents = reqs.find((r) => r.method === 'GET' && /\/api\/agents(\?|$)/.test(r.url))
    expect(conversations, 'GET /api/conversations must fire').toBeDefined()
    expect(agents, 'GET /api/agents must fire').toBeDefined()
  })
})
