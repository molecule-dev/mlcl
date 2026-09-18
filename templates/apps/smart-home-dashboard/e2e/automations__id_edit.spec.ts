import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedApi,
  captureNetwork,
  seedAutomation,
  signup,
  whereUrl,
} from './_helpers.js'

test.describe('/automations/:id/edit', () => {
  test('opening an existing automation prefills the editor with backend values', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const automation = await seedAutomation(request, session.accessToken!, {
      name: 'Editable routine',
      description: 'Pre-existing automation',
      trigger: { type: 'time', value: 'sunset' },
      actions: [{ type: 'set_state', target: 'lamp-1' }],
    })
    await page.goto(APP_BASE + `/automations/${automation.id}/edit`)
    await expect(page.locator('#automation-name')).toHaveValue('Editable routine')
    await expect(page.locator('#automation-action-type')).toHaveValue('set_state')
  })

  test('renaming an automation in the editor PUTs /api/automations/:id and persists', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const automation = await seedAutomation(request, session.accessToken!, {
      name: 'Original name',
    })
    const renamed = 'Renamed routine ' + Date.now()
    await page.goto(APP_BASE + `/automations/${automation.id}/edit`)
    await page.locator('#automation-name').fill(renamed)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="automation-save"]').click()
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    expect(whereUrl(reqs, /\/api\/automations\/[^/]+/, 'PUT').length).toBeGreaterThan(0)
    const api = await authedApi(request, session.accessToken!)
    const fresh = await (await api.get(`/automations/${automation.id}`)).json()
    expect(fresh.name).toBe(renamed)
  })

  test('the editor save button is reachable and enabled', async ({ page, request }) => {
    const session = await signup(page)
    const automation = await seedAutomation(request, session.accessToken!, {
      name: 'Reachable routine',
    })
    await page.goto(APP_BASE + `/automations/${automation.id}/edit`)
    await expect(page.locator('[data-testid="automation-save"]')).toBeEnabled()
  })
})
