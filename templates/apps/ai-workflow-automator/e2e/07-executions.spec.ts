import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  createWorkflow,
  listRuns,
  signup,
  triggerWorkflow,
} from './_helpers.js'

test.describe('/executions (run history)', () => {
  test('renders the executions page for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/executions')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('GET /api/runs returns [] for fresh user', async ({ page }) => {
    await signup(page)
    const runs = await listRuns(page)
    expect(Array.isArray(runs)).toBe(true)
    expect(runs.length).toBe(0)
  })

  test('after triggering, GET /api/runs reflects the new run row', async ({ page }) => {
    await signup(page)
    const wf = await createWorkflow(page, {
      name: 'exec-row',
      steps: [
        {
          type: 'http',
          config: {
            url: `http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`,
            method: 'GET',
          },
        },
      ],
    })
    await triggerWorkflow(page, wf.id as string)
    const runs = await listRuns(page)
    expect(runs.length).toBeGreaterThan(0)
    const lastRun = runs[0] as Record<string, unknown>
    expect(lastRun.workflow_id).toBe(wf.id)
    expect(lastRun.status).toMatch(/success|completed/)
  })

  test('GET /api/runs/stats/:workflowId returns aggregate counters', async ({ page }) => {
    await signup(page)
    const wf = await createWorkflow(page, {
      name: 'stats-row',
      steps: [
        {
          type: 'http',
          config: {
            url: `http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`,
            method: 'GET',
          },
        },
      ],
    })
    await triggerWorkflow(page, wf.id as string)
    const res = await page.request.get(`${API_BASE}/runs/stats/${wf.id as string}`, {
      headers: authHeaders(page),
    })
    expect(res.status()).toBe(200)
    const stats = (await res.json()) as Record<string, number>
    expect(typeof stats.total).toBe('number')
    expect(stats.total).toBeGreaterThan(0)
  })

  test('captureNetwork: /executions page loads /api/runs', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/executions')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.method === 'GET' && /\/api\/runs(\?|$)/.test(r.url))
    expect(call, '/executions must call /api/runs').toBeTruthy()
    expect(call!.status).toBe(200)
  })
})
