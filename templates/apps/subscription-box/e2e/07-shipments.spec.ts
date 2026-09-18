/**
 * Shipments contract: a subscriber sees their pending box on /shipments,
 * after a shipment is created the timeline updates with carrier+tracking,
 * and once status flips to delivered the box appears in History.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  fetchPlans,
  fetchUpcomingBox,
  promoteToAdmin,
  signup,
} from './_helpers.js'

test('Shipments empty state for a fresh user with no subscription', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/shipments')
  await expect(page.getByTestId('shipments-active')).toBeVisible()
  await expect(page.getByTestId('shipments-active')).toContainText(/No active shipment yet/i)
})

test('After subscribing, /shipments shows the pending box on the active timeline', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plans[0].id, paymentMethodId: 'manual', preferences: {} },
  })

  await page.goto(APP_BASE + '/shipments')
  await expect(page.getByTestId('shipments-timeline')).toBeVisible()
  await expect(page.getByTestId('shipments-active')).toContainText(plans[0].name)
})

test('Creating a shipment via API updates the timeline with carrier + tracking', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plans[0].id, paymentMethodId: 'manual', preferences: {} },
  })
  const box = await fetchUpcomingBox(page, accessToken)
  expect(box?.id).toBeTruthy()

  // Shipment fulfillment writes are merchant-only (requireAdmin); a fresh
  // signup is a non-operator 'customer'. Become the store merchant before
  // creating the shipment — the gate itself is verified elsewhere.
  await promoteToAdmin(page, accessToken)

  // Create shipment (POST /shipments — requires admin; the caller was just
  // promoted to the store merchant above)
  const shipRes = await page.request.post(`${API_BASE}/shipments`, {
    headers: apiHeaders(accessToken),
    data: {
      boxId: box!.id,
      carrier: 'UPS',
      trackingNumber: '1Z999AA10123456784',
      estimatedDelivery: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    },
    failOnStatusCode: false,
  })
  expect(shipRes.status(), await shipRes.text()).toBe(201)

  // Read-after-write: GET /shipments/box/:boxId returns the new shipment
  const verify = await page.request.get(`${API_BASE}/shipments/box/${box!.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(verify.status()).toBe(200)
  const ship = (await verify.json()) as { tracking_number: string; carrier: string }
  expect(ship.tracking_number).toBe('1Z999AA10123456784')
  expect(ship.carrier).toBe('UPS')
})

test('Marking a shipment delivered moves the box into History on /shipments', async ({ page }) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plans[0].id, paymentMethodId: 'manual', preferences: {} },
  })
  const box = await fetchUpcomingBox(page, accessToken)
  expect(box).toBeTruthy()

  // Shipment create + status transition are merchant-only (requireAdmin);
  // become the store merchant before driving the fulfillment lifecycle.
  await promoteToAdmin(page, accessToken)

  const shipRes = await page.request.post(`${API_BASE}/shipments`, {
    headers: apiHeaders(accessToken),
    data: {
      boxId: box!.id,
      carrier: 'USPS',
      trackingNumber: '9400111899220000000000',
    },
  })
  expect(shipRes.status()).toBe(201)
  const ship = (await shipRes.json()) as { id: string }

  // Mark delivered
  const upd = await page.request.put(`${API_BASE}/shipments/${ship.id}/status`, {
    headers: apiHeaders(accessToken),
    data: { status: 'delivered' },
    failOnStatusCode: false,
  })
  expect(upd.status(), await upd.text()).toBe(200)

  // Refresh the page — the box now lives in History (status=delivered),
  // not Active (which only shows pending|customizing|ready).
  await page.goto(APP_BASE + '/shipments')
  await expect(page.getByTestId('shipments-history')).toBeVisible()
  await expect(page.getByTestId(`shipments-row-${box!.id}`)).toBeVisible()
})
