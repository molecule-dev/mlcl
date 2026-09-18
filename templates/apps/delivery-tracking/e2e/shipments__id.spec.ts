import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, asList, captureNetwork, signup } from './_helpers.js'

test.describe('/shipments/:id', () => {
  test('renders detail panels populated by GET /api/shipments/:id and /api/events', async ({
    page,
  }) => {
    await signup(page)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/shipments')
    const list = asList(body)
    const target = list[0] as any
    expect(target).toBeTruthy()

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/shipments/${target.id}`)
      await expect(page.getByRole('heading', { name: target.tracking_number })).toBeVisible()
    })
    const detailReq = reqs.find(
      (r) => r.method === 'GET' && r.url.includes(`/api/shipments/${target.id}`),
    )
    expect(detailReq, 'must GET /api/shipments/:id on mount').toBeTruthy()
    expect(detailReq?.status).toBe(200)
    const eventsReq = reqs.find(
      (r) => r.method === 'GET' && /\/api\/events\?.*shipment_id=/.test(r.url),
    )
    expect(eventsReq, 'must GET /api/events?shipment_id= on mount').toBeTruthy()

    await expect(page.getByText(target.carrier).first()).toBeVisible()
    await expect(page.getByText(target.customer).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /Tracking timeline/i })).toBeVisible()
  })

  test('renders the live tracking map placeholder', async ({ page }) => {
    await signup(page)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/shipments')
    const target = asList(body)[0] as any
    await page.goto(APP_BASE + `/shipments/${target.id}`)
    await expect(page.locator('[data-mol-id="shipment-map"]')).toBeVisible()
  })

  test('"All shipments" back link returns to /shipments', async ({ page }) => {
    await signup(page)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/shipments')
    const target = asList(body)[0] as any
    await page.goto(APP_BASE + `/shipments/${target.id}`)
    await page.getByRole('link', { name: /All shipments/i }).click()
    await expect(page).toHaveURL(/\/shipments$/)
  })

  test('events list count matches /api/events?shipment_id=', async ({ page }) => {
    await signup(page)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/shipments')
    const target = asList(body)[0] as any
    await page.goto(APP_BASE + `/shipments/${target.id}`)
    const { body: eventsBody } = await apiRequest<{ data?: any[] }>(
      page,
      'GET',
      `/api/events?shipment_id=${target.id}`,
    )
    const events = asList<any>(eventsBody)
    if (events.length > 0) {
      // Scope to the timeline. A bare 'ol > li' counts EVERY ordered list on the
      // page, so any other <ol> a shipment's status happens to render (steppers,
      // breadcrumbs) is silently added to the total and the count stops matching
      // the API for that shipment only — which is how this failed in the fleet
      // run but passed on every isolated re-run.
      const timeline = page.locator('[data-mol-id="shipment-timeline"]')
      await expect(timeline).toBeVisible()
      const liCount = await timeline.locator('> li').count()
      expect(liCount).toBe(events.length)
    }
  })

  test('public tracking lookup at GET /api/tracking/:trackingNumber returns the shipment status', async ({
    page,
  }) => {
    await signup(page)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/shipments')
    const target = asList(body)[0] as any
    const { status, body: trackBody } = await apiRequest<any>(
      page,
      'GET',
      `/api/tracking/${target.tracking_number}`,
    )
    expect(status).toBe(200)
    expect(trackBody.tracking_number).toBe(target.tracking_number)
    expect(typeof trackBody.status).toBe('string')
  })
})
