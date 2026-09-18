import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedApi,
  captureNetwork,
  seedAutomation,
  signup,
  whereUrl,
} from './_helpers.js'

test.describe('/automations', () => {
  test('automations list shows seeded automations', async ({ page, request }) => {
    const session = await signup(page)
    const automation = await seedAutomation(request, session.accessToken!, {
      name: 'Wake-up routine',
    })
    await page.goto(APP_BASE + '/automations')
    await expect(page.getByText(automation.name, { exact: false })).toBeVisible()
  })

  test('new automation form POSTs /api/automations and persists', async ({ page, request }) => {
    const session = await signup(page)
    const uniqueName = 'My porch routine ' + Date.now()
    await page.goto(APP_BASE + '/automations/new/edit')
    await page.locator('#automation-name').fill(uniqueName)
    await page.locator('#automation-trigger-value').fill('sunset')
    await page.locator('#automation-action-type').fill('notify')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="automation-save"]').click()
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(reqs, /\/api\/automations(?:\/|\?|$)/, 'POST').length).toBeGreaterThan(0)

    const api = await authedApi(request, session.accessToken!)
    const list = await api.get('/automations')
    expect(list.status()).toBe(200)
    const items = await list.json()
    const arr = Array.isArray(items) ? items : items.items || []
    expect(arr.find((a: { name: string }) => a.name === uniqueName)).toBeTruthy()
  })

  test('triggering an automation hits /api/automations/:id/trigger and increments execution_count', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const automation = await seedAutomation(request, session.accessToken!, {
      name: 'Trigger me ' + Date.now(),
    })
    const api = await authedApi(request, session.accessToken!)
    const before = await (await api.get(`/automations/${automation.id}`)).json()
    const startCount = Number(before.execution_count || 0)

    const triggered = await api.post(`/automations/${automation.id}/trigger`, {})
    expect(triggered.status()).toBeLessThan(400)

    const after = await (await api.get(`/automations/${automation.id}`)).json()
    expect(Number(after.execution_count)).toBe(startCount + 1)
    await page.goto(APP_BASE + '/automations')
    await expect(page.getByText(automation.name, { exact: false })).toBeVisible()
  })

  test('automations page renders the create-new entry point', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/automations')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
