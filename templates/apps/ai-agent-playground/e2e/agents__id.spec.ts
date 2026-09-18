import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, seedAgent, signup, whereUrl } from './_helpers.js'

test.describe('AgentBuilder page (/agents/:id)', () => {
  test('renders prompt editor + provider/model controls for a freshly seeded agent', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, { name: 'Workbench Agent' })
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    await expect(page.locator('[data-mol-id="agent-builder-prompt"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-mol-id="agent-builder-name"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="agent-builder-provider-anthropic"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="agent-builder-save"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="agent-builder-run"]')).toBeVisible()
  })

  test('PUT /api/agents/:id persists prompt changes (read-after-write)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, {
      name: 'Persisted Agent',
      system_prompt: 'old prompt',
    })
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    const promptBox = page.locator('[data-mol-id="agent-builder-prompt"]')
    await promptBox.waitFor({ timeout: 10000 })
    await promptBox.fill('You are a friendly assistant. Respond in one sentence.')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="agent-builder-save"]').click()
      await expect(page.locator('[data-mol-id="agent-builder-info"]')).toBeVisible({
        timeout: 5000,
      })
    })
    const put = whereUrl(reqs, /\/api\/agents\/[\w-]+/, 'PUT')
    expect(put.length, 'PUT /api/agents/:id should fire on save').toBeGreaterThan(0)
    expect(put[0].status).toBeLessThan(300)

    const after = await authedApi(request, session.accessToken!).get(`/agents/${agent.id}`)
    expect(after.status()).toBe(200)
    const body = await after.json()
    expect(body.system_prompt).toContain('You are a friendly assistant')
  })

  test('Run button POSTs /api/agents/:id/run and records an execution', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, {
      name: 'Runnable Agent',
      model: 'claude-haiku-4-5',
      system_prompt: 'Reply with the single word: pong.',
    })
    await page.goto(APP_BASE + `/agents/${agent.id}`)

    const input = page.locator('[data-mol-id="agent-builder-test-input"]')
    await input.waitFor({ timeout: 10000 })
    await input.fill('Say pong.')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="agent-builder-run"]').click()
      // Wait for either info toast or error to settle
      await page.waitForTimeout(8000)
    })
    const run = whereUrl(reqs, /\/api\/agents\/[\w-]+\/run/, 'POST')
    expect(run.length, 'POST /run should fire').toBeGreaterThan(0)
    expect(run[0].status, 'run endpoint should not 5xx').toBeLessThan(500)

    const list = await authedApi(request, session.accessToken!).get('/executions')
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as Array<{ id: string; agent_id: string }>
    expect(rows.some((row) => row.agent_id === agent.id)).toBeTruthy()
  })

  test('foreign agent ids return 404 to other users', async ({ page, request }) => {
    const sessionA = await signup(page)
    const agent = await seedAgent(request, sessionA.accessToken!, { name: 'Owned by A' })

    const browser = page.context().browser()!
    const ctx = await browser.newContext()
    const otherPage = await ctx.newPage()
    const sessionB = await signup(otherPage)
    const sneak = await authedApi(request, sessionB.accessToken!).get(`/agents/${agent.id}`)
    expect(sneak.status()).toBe(404)
    await ctx.close()
  })

  test('switching provider to openai persists on save', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!)
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    await page.locator('[data-mol-id="agent-builder-provider-openai"]').click()
    await page.locator('[data-mol-id="agent-builder-save"]').click()
    await expect(page.locator('[data-mol-id="agent-builder-info"]')).toBeVisible({ timeout: 8000 })
    const after = await authedApi(request, session.accessToken!).get(`/agents/${agent.id}`)
    const body = await after.json()
    expect(body.provider).toBe('openai')
  })

  test('switching provider to google persists on save', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!)
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    await page.locator('[data-mol-id="agent-builder-provider-google"]').click()
    await page.locator('[data-mol-id="agent-builder-save"]').click()
    await expect(page.locator('[data-mol-id="agent-builder-info"]')).toBeVisible({ timeout: 8000 })
    const after = await authedApi(request, session.accessToken!).get(`/agents/${agent.id}`)
    expect((await after.json()).provider).toBe('google')
  })

  test('renaming the agent persists across reload', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, { name: 'Old Name' })
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    await page.locator('[data-mol-id="agent-builder-name"]').fill('Renamed Agent')
    await page.locator('[data-mol-id="agent-builder-save"]').click()
    await expect(page.locator('[data-mol-id="agent-builder-info"]')).toBeVisible({ timeout: 8000 })
    await page.reload()
    await expect(page.locator('[data-mol-id="agent-builder-name"]')).toHaveValue('Renamed Agent')
  })

  test('"Open prompt editor →" link navigates to /agents/:id/prompt', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!)
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    await page.locator('[data-mol-id="agent-builder-open-prompt-editor"]').click()
    await expect(page).toHaveURL(new RegExp(`/agents/${agent.id}/prompt$`), { timeout: 10000 })
  })

  test('back link returns to /agents listing', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!)
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    await page.locator('[data-mol-id="agent-builder-back"]').click()
    await expect(page).toHaveURL(/\/agents$/, { timeout: 10000 })
  })

  test('toggling tool_palette buttons reflects in tools_config on save', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, { tools_config: [] })
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    const toolBtn = page
      .getByRole('button', { name: /web_search|code_executor|file_reader/i })
      .first()
    await toolBtn.click()
    await page.locator('[data-mol-id="agent-builder-save"]').click()
    await expect(page.locator('[data-mol-id="agent-builder-info"]')).toBeVisible({ timeout: 8000 })
    const after = await authedApi(request, session.accessToken!).get(`/agents/${agent.id}`)
    const body = await after.json()
    expect(Array.isArray(body.tools_config) ? body.tools_config.length : 0).toBeGreaterThanOrEqual(
      1,
    )
  })

  test('Run shows the model output via the info banner', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, {
      model: 'claude-haiku-4-5',
      system_prompt: 'Reply with exactly the word: pong.',
    })
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    await page.locator('[data-mol-id="agent-builder-test-input"]').fill('Say pong.')
    await page.locator('[data-mol-id="agent-builder-run"]').click()
    // The page surfaces the AI output as the info-toast message after the
    // POST /run resolves. Wait long enough for a real Anthropic round-trip.
    await expect(page.locator('[data-mol-id="agent-builder-info"]')).toBeVisible({
      timeout: 30000,
    })
    const text = await page.locator('[data-mol-id="agent-builder-info"]').textContent()
    expect(
      (text || '').trim().length,
      'info banner should contain non-empty AI response',
    ).toBeGreaterThan(0)
  })

  test('test-input textarea is editable and round-trips its content', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!)
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    const input = page.locator('[data-mol-id="agent-builder-test-input"]')
    await input.fill('hello world')
    await expect(input).toHaveValue('hello world')
  })

  test('system-prompt textarea preserves user edits unless saved', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, { system_prompt: 'Original.' })
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    const promptBox = page.locator('[data-mol-id="agent-builder-prompt"]')
    await promptBox.fill('Edited locally.')
    await expect(promptBox).toHaveValue('Edited locally.')
  })

  test('reload without save reverts unsaved system-prompt edits', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, { system_prompt: 'Persistent.' })
    await page.goto(APP_BASE + `/agents/${agent.id}`)
    await page.locator('[data-mol-id="agent-builder-prompt"]').fill('Throwaway draft.')
    await page.reload()
    await expect(page.locator('[data-mol-id="agent-builder-prompt"]')).toHaveValue('Persistent.', {
      timeout: 10000,
    })
  })

  test('GET /api/agents/:id is invoked on page load', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/agents/${agent.id}`)
      await expect(page.locator('[data-mol-id="agent-builder-prompt"]')).toBeVisible({
        timeout: 10000,
      })
    })
    const gets = whereUrl(reqs, new RegExp(`/api/agents/${agent.id}$`), 'GET')
    expect(gets.length).toBeGreaterThanOrEqual(1)
    expect(gets[0].status).toBe(200)
  })

  test('a known agent id outside the user surface returns 404 from the page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/agents/00000000-0000-0000-0000-000000000000')
    // The page renders the shell + an error banner; it must not blank-screen.
    await expect(page.locator('[data-mol-id="page-agent-builder"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-mol-id="agent-builder-error"]')).toBeVisible({
      timeout: 10000,
    })
  })
})
