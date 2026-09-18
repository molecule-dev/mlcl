import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, asList, captureNetwork, signup } from './_helpers.js'

test.describe('/alerts', () => {
  test('renders the alerts list seeded for the new user', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/alerts')
      await expect(page.getByRole('heading', { name: /^Alerts$/i })).toBeVisible()
    })
    const alertsReq = reqs.find((r) => r.method === 'GET' && /\/api\/alerts(\?|$)/.test(r.url))
    expect(alertsReq, 'mount must fetch /api/alerts').toBeTruthy()
    expect(alertsReq?.status).toBe(200)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/alerts')
    const list = asList(body)
    expect(list.length).toBeGreaterThan(0)
  })

  test('Acknowledge marks alert as resolved (read-after-write)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts')
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/alerts')
    const unresolved = asList(body).find((a: any) => !a.resolved)
    if (!unresolved) test.skip(true, 'No unresolved alerts to acknowledge')
    const button = page.locator(`[data-mol-id="button-acknowledge-${unresolved.id}"]`)
    await expect(button).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      await button.click()
      await page.waitForTimeout(800)
    })
    const ackReq = reqs.find(
      (r) => r.method === 'PATCH' && r.url.includes(`/api/alerts/${unresolved.id}`),
    )
    expect(ackReq, 'PATCH /api/alerts/:id/read should fire on acknowledge').toBeTruthy()
    expect(ackReq?.status).toBeLessThan(400)

    const after = asList<any>((await apiRequest<unknown>(page, 'GET', '/api/alerts')).body)
    const updated = after.find((a: any) => a.id === unresolved.id)
    expect(updated, 'alert should still be in the list after acknowledge').toBeTruthy()
    expect(updated!.resolved).toBe(true)
  })

  test('filter chips switch the visible list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts')
    await page.getByRole('button', { name: /^All$/i, pressed: false }).click()
    await page.waitForTimeout(300)
    await expect(page.getByRole('button', { name: /^All$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('clicking the tracking-number link routes to /shipments/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts')
    // Some seeded alerts (e.g. webhook_failure) have no shipment_id;
    // find any alert with a shipment id so the link is rendered.
    const alerts = asList<any>((await apiRequest<unknown>(page, 'GET', '/api/alerts')).body)
    const withShipment = alerts.find((a) => !!a.shipment_id)
    if (!withShipment) test.skip(true, 'No alerts with a shipment_id are seeded')
    const link = page.locator(`a[href="/shipments/${withShipment.shipment_id}"]`).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/shipments\/[a-f0-9-]+/i)
  })
})
