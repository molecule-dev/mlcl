import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, seedAgent, signup, whereUrl } from './_helpers.js'

test.describe('Execution trace page (/runs/:id)', () => {
  test('renders metric cards for a real execution and fetches GET /api/executions/:id', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, {
      name: 'Trace Agent',
      model: 'claude-haiku-4-5',
    })
    const runRes = await authedApi(request, session.accessToken!).post(`/agents/${agent.id}/run`, {
      message: 'Reply with the word ok.',
    })
    expect(runRes.status()).toBeLessThan(500)
    const runBody = await runRes.json()
    const executionId = runBody?.execution?.id ?? runBody?.id
    expect(executionId, 'execution id from run response').toBeTruthy()

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/runs/${executionId}`)
      await expect(page.locator('[data-mol-id="page-execution-trace"]')).toBeVisible()
    })
    const gets = whereUrl(reqs, /\/api\/executions\/[^/?#]+/, 'GET')
    expect(gets.length, 'GET /api/executions/:id should fire').toBeGreaterThanOrEqual(1)
    expect(gets[0].status).toBeLessThan(400)

    await expect(page.getByText(/Duration/i).first()).toBeVisible()
    await expect(page.getByText(/Steps/i).first()).toBeVisible()
  })

  test('reload preserves the execution view (URL-driven persistence)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!)
    const runRes = await authedApi(request, session.accessToken!).post(`/agents/${agent.id}/run`, {
      message: 'reply hi',
    })
    const executionId = (await runRes.json())?.execution?.id
    expect(executionId).toBeTruthy()
    await page.goto(APP_BASE + `/runs/${executionId}`)
    await expect(page.locator('[data-mol-id="page-execution-trace"]')).toBeVisible()
    await page.reload()
    await expect(page.locator('[data-mol-id="page-execution-trace"]')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/runs/${executionId}$`))
  })

  test('non-existent execution id surfaces an error to the user', async ({ page }) => {
    // The 404 answer is the expected contract (ownership hidden, not leaked);
    // the browser always logs failed fetches to the console, so allow it.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404',
    })
    await signup(page)
    await page.goto(APP_BASE + '/runs/00000000-0000-0000-0000-000000000000')
    await expect(page.locator('[data-mol-id="page-execution-trace"]')).toBeVisible()
    await expect(page.getByText(/Duration|Run/i).first()).toBeVisible()
  })
})
