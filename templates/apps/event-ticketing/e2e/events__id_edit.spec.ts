import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/events/:id/edit page', () => {
  test('pre-fills the title input from the API', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken, { title: 'Editable Event' })
    await page.goto(APP_BASE + '/events/' + ev.id + '/edit')
    await expect(page.locator('[data-mol-id="field-title"]')).toHaveValue('Editable Event')
  })

  test('save draft sends PUT /api/events/:id', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken, { title: 'To Update' })
    await page.goto(APP_BASE + '/events/' + ev.id + '/edit')
    await page.locator('[data-mol-id="field-title"]').fill('Renamed Event')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="event-save-draft"]').click()
      await page.waitForLoadState('networkidle')
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/api\/events\/[\w-]+$/.test(r.url))
    expect(put, 'PUT /api/events/:id').toBeTruthy()
  })

  test('cancel event sends PUT /api/events/:id/cancel', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken, { title: 'Cancel Me' })
    await page.goto(APP_BASE + '/events/' + ev.id + '/edit')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="event-cancel"]').click()
      await page.waitForLoadState('networkidle')
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/cancel/.test(r.url))
    expect(put, 'PUT /api/events/:id/cancel').toBeTruthy()
  })

  test('delete event sends DELETE /api/events/:id', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken, { title: 'Delete Me' })
    await page.goto(APP_BASE + '/events/' + ev.id + '/edit')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="event-delete"]').click()
      await page.waitForLoadState('networkidle')
    })
    const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/events\/[\w-]+$/.test(r.url))
    expect(del, 'DELETE /api/events/:id').toBeTruthy()
  })
})
