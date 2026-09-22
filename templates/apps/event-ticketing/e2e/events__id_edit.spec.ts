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

  test('cancel event arms first, then sends PUT /api/events/:id/cancel', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken, { title: 'Cancel Me' })
    await page.goto(APP_BASE + '/events/' + ev.id + '/edit')
    const cancel = page.locator('[data-mol-id="event-cancel"]')
    // First click arms (no request), second click confirms.
    await cancel.click()
    await expect(cancel).toHaveText(/tap again/i)
    const reqs = await captureNetwork(page, async () => {
      await cancel.click()
      await page.waitForLoadState('networkidle')
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/cancel/.test(r.url))
    expect(put, 'PUT /api/events/:id/cancel').toBeTruthy()
  })

  test('delete event arms first, then sends DELETE /api/events/:id', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken, { title: 'Delete Me' })
    await page.goto(APP_BASE + '/events/' + ev.id + '/edit')
    const del = page.locator('[data-mol-id="event-delete"]')
    await del.click()
    await expect(del).toHaveText(/tap again/i)
    const reqs = await captureNetwork(page, async () => {
      await del.click()
      await page.waitForLoadState('networkidle')
    })
    const request = reqs.find((r) => r.method === 'DELETE' && /\/api\/events\/[\w-]+$/.test(r.url))
    expect(request, 'DELETE /api/events/:id').toBeTruthy()
  })
})
