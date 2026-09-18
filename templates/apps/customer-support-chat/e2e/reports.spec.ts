import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiPost, captureNetwork, signup } from './_helpers.js'

test.describe('/reports', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('reports page renders KPI cards backed by /api/conversations + /api/agents (not hardcoded)', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    expect(
      reqs.find(
        (r) => /\/api\/conversations(?:\?|$)/.test(r.url) && r.method === 'GET' && r.status < 400,
      ),
      'must call GET /api/conversations',
    ).toBeTruthy()
    expect(
      reqs.find((r) => /\/api\/agents(?:\?|$)/.test(r.url) && r.method === 'GET' && r.status < 400),
      'must call GET /api/agents',
    ).toBeTruthy()
    await expect(page.getByRole('heading', { name: /reports/i }).first()).toBeVisible()
    await expect(page.getByText(/^Conversations$/i).first()).toBeVisible()
  })

  test('KPI counts reflect real data — create 3 conversations, KPI shows 3', async ({ page }) => {
    for (let i = 0; i < 3; i += 1) {
      await apiPost(page, '/conversations', {
        subject: `Reports KPI conv ${i}`,
        visitor_email: `kpi+${i}@example.com`,
      })
    }
    await page.goto(APP_BASE + '/reports')
    // The "3 currently open" caption is unique enough to be a stable assertion.
    await expect(page.getByText(/^3 currently open$/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^Awaiting reply$/i).first()).toBeVisible()
  })

  test('Reports loads with empty state when no conversations exist', async ({ page }) => {
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByText(/^No agents yet\.$/i).first()).toBeVisible({ timeout: 15_000 })
  })
})
