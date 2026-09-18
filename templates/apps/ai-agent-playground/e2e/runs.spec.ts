import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, seedAgent, signup, whereUrl } from './_helpers.js'

test.describe('Run history page (/runs)', () => {
  test('redirects unauthenticated visitors', async ({ page }) => {
    await page.goto(APP_BASE + '/runs')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders header + 4 metric cards + empty state on a fresh account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/runs')
    await expect(page.locator('[data-mol-id="page-run-history"]')).toBeVisible()
    await expect(page.getByText(/Runs \(24h\)/i)).toBeVisible()
    await expect(page.getByText(/Success Rate/i)).toBeVisible()
    await expect(page.getByText(/Avg Duration/i)).toBeVisible()
    await expect(page.getByText(/Tokens \(24h\)/i)).toBeVisible()
    await expect(page.locator('[data-mol-id="run-history-empty"]')).toBeVisible()
  })

  test('table renders one row per execution after a real run', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, {
      name: 'History Agent',
      model: 'claude-haiku-4-5',
    })
    const run = await authedApi(request, session.accessToken!).post(`/agents/${agent.id}/run`, {
      message: 'Say "ok".',
    })
    expect(run.status(), 'run endpoint should not 5xx').toBeLessThan(500)

    await page.goto(APP_BASE + '/runs')
    await expect(page.locator('[data-mol-id="run-history-row"]').first()).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText('History Agent').first()).toBeVisible()
  })

  test('"Live Tail" toggle flips aria-pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/runs')
    const btn = page.locator('[data-mol-id="run-history-live-tail"]')
    await expect(btn).toHaveAttribute('aria-pressed', 'false')
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('GET /api/executions + /api/agents fire on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/runs')
      await expect(page.locator('[data-mol-id="page-run-history"]')).toBeVisible()
      await page.waitForTimeout(800)
    })
    expect(whereUrl(reqs, /\/api\/executions(?:\?|$)/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/agents(?:\?|$)/, 'GET').length).toBeGreaterThan(0)
  })
})
