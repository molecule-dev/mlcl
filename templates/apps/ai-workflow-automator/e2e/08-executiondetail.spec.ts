import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  createWorkflow,
  readRun,
  signup,
  triggerWorkflow,
} from './_helpers.js'

test.describe('/executions/:id', () => {
  test('renders run-detail page for a real run', async ({ page }) => {
    await signup(page)
    const wf = await createWorkflow(page, {
      name: 'detail-test',
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
    const run = await triggerWorkflow(page, wf.id as string)
    await page.goto(APP_BASE + '/executions/' + (run.id as string))
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('GET /api/runs/:id returns run with step_results', async ({ page }) => {
    await signup(page)
    const wf = await createWorkflow(page, {
      name: 'detail-fetch',
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
    const run = await triggerWorkflow(page, wf.id as string)
    const data = (await readRun(page, run.id as string)) as Record<string, unknown>
    expect(data.id).toBe(run.id)
    expect(data.workflow_id).toBe(wf.id)
    expect(data.status).toMatch(/success|completed/)
  })

  test('captureNetwork: /executions/:id calls GET /api/runs/:id', async ({ page }) => {
    await signup(page)
    const wf = await createWorkflow(page, {
      name: 'cap-runs-id',
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
    const run = await triggerWorkflow(page, wf.id as string)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/executions/' + (run.id as string))
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/runs/${run.id}`).test(r.url),
    )
    expect(call, '/executions/:id must call /api/runs/:id').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('shows a back link to /executions', async ({ page }) => {
    await signup(page)
    const wf = await createWorkflow(page, {
      name: 'back-link',
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
    const run = await triggerWorkflow(page, wf.id as string)
    await page.goto(APP_BASE + '/executions/' + (run.id as string))
    await page.waitForLoadState('networkidle')
    const back = page.getByRole('link', { name: /executions|back/i }).first()
    await expect(back).toBeVisible()
  })
})
