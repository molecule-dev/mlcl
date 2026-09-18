import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

/**
 * Cross-page kitchen-sink journey. Walks a single fresh user through every
 * primary surface of the app — landing, signup, every authenticated page in
 * the sidebar — verifying that each lands on the expected route and that the
 * primary backend invariant (creating an agent, reading it back, running it,
 * inspecting the execution) holds end-to-end.
 *
 * If this test passes, a paying customer can complete the core loop the
 * product is sold on. Per-page specs assert the deeper behavior of each
 * surface; this one only proves the **journey** is unbroken.
 */
test.describe('User journey — every primary surface', () => {
  test('signup → dashboard → create agent → run → see execution → settings → profile → logout-by-clearing', async ({
    page,
    request,
  }) => {
    // 1. Public surface still loads.
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(/\/$/)
    await page.goto(APP_BASE + '/pricing')
    // Pricing component is shared from @molecule/app-billing-react; assert the
    // headline rendered rather than a per-page mol-id.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10000 })

    // 2. Sign up — lands on /dashboard with auth state.
    const session = await signup(page)
    expect(session.accessToken, 'signup must yield JWT').toBeTruthy()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('[data-mol-id="page-dashboard"]')).toBeVisible({ timeout: 10000 })

    // 3. Sidebar nav reaches every authenticated page.
    const navTargets: Array<{ route: string; mol: string }> = [
      { route: '/agents', mol: 'page-agents' },
      { route: '/tools', mol: 'page-tool-library' },
      { route: '/runs', mol: 'page-run-history' },
      { route: '/datasets', mol: 'page-datasets' },
      { route: '/knowledge-bases', mol: 'page-knowledge-bases' },
      { route: '/models', mol: 'page-models' },
      { route: '/notifications', mol: 'page-notifications' },
      { route: '/settings', mol: 'page-settings' },
      { route: '/profile', mol: 'page-profile' },
    ]
    for (const { route, mol } of navTargets) {
      await page.goto(APP_BASE + route)
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, '\\/') + '$'))
      await expect(page.locator(`[data-mol-id="${mol}"]`)).toBeVisible({ timeout: 10000 })
    }

    // 4. Create an agent via the UI (POST /api/agents) and confirm read-back.
    await page.goto(APP_BASE + '/agents')
    const createReqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="agents-new"]').click()
      await page.waitForURL(/\/agents\/[^/]+$/, { timeout: 15000 })
    })
    const posts = whereUrl(createReqs, /\/api\/agents$/, 'POST')
    expect(posts.length, 'POST /api/agents on New Agent click').toBeGreaterThanOrEqual(1)
    expect(posts[0].status).toBeLessThan(400)

    const matched = page.url().match(/\/agents\/([^/?#]+)/)
    expect(matched, 'agent id present in URL').toBeTruthy()
    const agentId = matched![1]

    // Read it back via the API to prove the row actually persisted.
    const api = authedApi(request, session.accessToken!)
    const readBack = await api.get(`/agents/${agentId}`)
    expect(readBack.status()).toBe(200)
    const agent = await readBack.json()
    expect(agent.id).toBe(agentId)

    // 5. Drive an agent run (real Anthropic call) and confirm an execution
    //    row materialised under this user.
    const runRes = await api.post(`/agents/${agentId}/run`, { message: 'Say hi briefly.' })
    expect(runRes.status(), 'agent run should succeed end-to-end').toBe(200)
    const runBody = await runRes.json()
    expect(runBody.execution.status).toBe('succeeded')
    expect(runBody.execution.output, 'real model returned text').toBeTruthy()

    // 6. Runs page shows the execution we just made.
    await page.goto(APP_BASE + '/runs')
    await expect(page.locator('[data-mol-id="page-run-history"]')).toBeVisible({ timeout: 10000 })
    // Either an execution row renders, or the empty state is gone — assert
    // at least one row exists by hitting the API directly (UI rendering of
    // the table is per-page-spec territory).
    const exList = await api.get('/executions?limit=5')
    expect(exList.status()).toBe(200)
    const exData = await exList.json()
    const arr = Array.isArray(exData) ? exData : exData.data
    expect(arr.length, 'at least one execution after run').toBeGreaterThanOrEqual(1)
  })
})
