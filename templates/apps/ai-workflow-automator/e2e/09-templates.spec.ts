import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  installTemplate,
  listTemplates,
  listWorkflows,
  readTemplate,
  signup,
} from './_helpers.js'

test.describe('/templates', () => {
  test('renders the templates catalog', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('GET /api/templates returns the catalog', async ({ page }) => {
    await signup(page)
    const data = await listTemplates(page)
    expect(data.total).toBeGreaterThan(0)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBe(data.total)
    // Each row has id, name, category, thumb.
    const sample = data.data[0] as Record<string, unknown>
    expect(sample.id).toBeTruthy()
    expect(sample.name).toBeTruthy()
    expect(sample.category).toBeTruthy()
  })

  test('GET /api/templates/:id returns the full blueprint', async ({ page }) => {
    await signup(page)
    const data = await listTemplates(page)
    const first = data.data[0] as { id: string }
    const detail = (await readTemplate(page, first.id)) as Record<string, unknown>
    expect(detail.id).toBe(first.id)
    expect(Array.isArray(detail.steps)).toBe(true)
    expect(Array.isArray(detail.nodes)).toBe(true)
    expect(detail.triggerType).toBeTruthy()
  })

  test('POST /api/templates/:id/install creates a workflow with the template steps', async ({
    page,
  }) => {
    await signup(page)
    const before = await listWorkflows(page)
    const result = await installTemplate(page, 'lead-routing')
    expect(result.workflow_id).toBeTruthy()
    expect(result.template_id).toBe('lead-routing')
    const after = await listWorkflows(page)
    expect(after.length).toBe(before.length + 1)
    const installed = after.find((w) => w.id === result.workflow_id) as Record<string, unknown>
    expect(installed.name).toMatch(/lead/i)
    expect(installed.trigger_type).toBe('webhook')
  })

  test('captureNetwork: /templates calls /api/templates on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/templates')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.method === 'GET' && /\/api\/templates(\?|$)/.test(r.url))
    expect(call, '/templates must call /api/templates').toBeTruthy()
    expect(call!.status).toBe(200)
  })
})
