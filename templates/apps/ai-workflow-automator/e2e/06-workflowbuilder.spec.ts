import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  createWorkflow,
  signup,
  toggleWorkflow,
  triggerWorkflow,
} from './_helpers.js'

test.describe('/workflows/:id (Workflow Builder)', () => {
  test('renders the builder page for an existing workflow', async ({ page }) => {
    await signup(page)
    const wf = await createWorkflow(page, { name: 'builder-test' })
    await page.goto(APP_BASE + '/workflows/' + (wf.id as string))
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('GET /api/workflows/:id returns the workflow with steps array', async ({ page }) => {
    await signup(page)
    const wf = await createWorkflow(page, {
      name: 'with-steps',
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
    const res = await page.request.get(`${API_BASE}/workflows/${wf.id as string}`, {
      headers: authHeaders(page),
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.steps)).toBe(true)
    expect(data.steps.length).toBe(1)
    expect(data.steps[0].type).toBe('http')
  })

  test('PUT /api/workflows/:id replaces steps and the next GET reflects them', async ({ page }) => {
    await signup(page)
    const wf = await createWorkflow(page, {
      name: 'put-test',
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
    const newSteps = [
      { type: 'email', config: { to: 'a@example.com', subject: 'hi', body: 'hello' } },
      {
        type: 'http',
        config: { url: `http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`, method: 'GET' },
      },
    ]
    const putRes = await page.request.put(`${API_BASE}/workflows/${wf.id as string}`, {
      headers: authHeaders(page),
      data: { name: 'put-test-v2', steps: newSteps },
    })
    expect(putRes.status()).toBe(200)
    const reload = await page.request.get(`${API_BASE}/workflows/${wf.id as string}`, {
      headers: authHeaders(page),
    })
    const reloaded = await reload.json()
    expect(reloaded.name).toBe('put-test-v2')
    expect(reloaded.steps.length).toBe(2)
    expect(reloaded.steps.map((s: { type: string }) => s.type).sort()).toEqual(['email', 'http'])
  })

  test('POST /workflows/:id/trigger runs the http step against the real upstream', async ({
    page,
  }) => {
    await signup(page)
    const wf = await createWorkflow(page, {
      name: 'http-trigger',
      steps: [
        {
          type: 'http',
          config: {
            url: `http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`,
            method: 'GET',
            body: { hello: 'world' },
          },
        },
      ],
    })
    const run = await triggerWorkflow(page, wf.id as string)
    expect(run).toBeDefined()
    expect((run as Record<string, unknown>).status).toMatch(/success|completed/)
    const stepResults =
      (run as { step_results?: Array<{ status: string; output: string }> }).step_results ?? []
    expect(stepResults.length).toBeGreaterThan(0)
    expect(stepResults[0].status).toBe('success')
    // The step captures the upstream's real response body — /health answers
    // JSON with a status field. (This asserted httpbin's {"hello":"world"} echo
    // before the target moved off the public internet; the point is unchanged:
    // the output is the real body, not a stub.)
    expect(stepResults[0].output).toContain('status')
  })

  test('toggle then trigger increments run_count + success_count', async ({ page }) => {
    await signup(page)
    const wf = await createWorkflow(page, {
      name: 'count-test',
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
    await toggleWorkflow(page, wf.id as string)
    await triggerWorkflow(page, wf.id as string)
    const updated = await page.request
      .get(`${API_BASE}/workflows/${wf.id as string}`, { headers: authHeaders(page) })
      .then((r) => r.json())
    expect(updated.run_count).toBeGreaterThanOrEqual(1)
    expect(updated.success_count).toBeGreaterThanOrEqual(1)
  })

  test('captureNetwork: builder page calls GET /api/workflows/:id', async ({ page }) => {
    await signup(page)
    const wf = await createWorkflow(page, { name: 'cap-test' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/workflows/' + (wf.id as string))
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/workflows/${wf.id}`).test(r.url),
    )
    expect(call, '/workflows/:id page must call GET /api/workflows/:id').toBeTruthy()
    expect(call!.status).toBe(200)
  })
})
