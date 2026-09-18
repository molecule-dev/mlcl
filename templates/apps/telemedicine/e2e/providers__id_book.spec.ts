import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  firstAvailableSlot,
  firstProviderId,
  signup,
} from './_helpers.js'

test.describe('/providers/:id/book — Booking flow', () => {
  test('Renders provider header + appointment-type select + slots + reason textarea + Confirm button', async ({
    page,
  }) => {
    await signup(page)
    const providerId = await firstProviderId(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/providers/${providerId}/book`)
      await expect(page.getByRole('heading', { name: /book appointment/i })).toBeVisible()
      await expect(page.locator('select.form-select')).toBeVisible({ timeout: 15000 })
    })
    const provGet = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/providers/${providerId}(\\?|$)`).test(r.url),
    )
    expect(provGet, 'booking page must GET /api/providers/:id').toBeTruthy()
    expect(provGet!.status).toBeLessThan(400)
    await expect(page.locator('button.slot-button').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('textarea')).toBeVisible()
    await expect(page.getByRole('button', { name: /confirm booking/i })).toBeVisible()
  })

  test('Confirm button is disabled until a slot is selected, then enabled after click', async ({
    page,
  }) => {
    await signup(page)
    const providerId = await firstProviderId(page)
    await page.goto(APP_BASE + `/providers/${providerId}/book`)
    const submit = page.getByRole('button', { name: /confirm booking/i })
    await expect(submit).toBeDisabled()
    await page.locator('button.slot-button').first().click()
    await expect(submit).toBeEnabled()
  })

  test('Booking creates an appointment row with the selected provider/time, navigates to /appointments, and the next list shows the visit', async ({
    page,
  }) => {
    const { accessToken, userId } = await signup(page)
    const providerId = await firstProviderId(page)
    const slot = await firstAvailableSlot(page, providerId)

    await page.goto(APP_BASE + `/providers/${providerId}/book`)
    await page.locator(`button[data-slot-starts-at="${slot.starts_at}"]`).click()
    await page.locator('textarea').fill('Annual physical')

    const bookPromise = page.waitForResponse(
      (r) => r.url().includes('/api/appointments') && r.request().method() === 'POST',
      { timeout: 10000 },
    )
    await page.getByRole('button', { name: /confirm booking/i }).click()
    const bookResp = await bookPromise
    expect(bookResp.status(), 'POST /api/appointments must succeed').toBe(201)
    const created = (await bookResp.json()) as {
      id?: string
      provider_id?: string
      scheduled_at?: string
      reason?: string
    }
    expect(created.id).toBeTruthy()
    expect(created.provider_id).toBe(providerId)
    expect(created.reason).toBe('Annual physical')
    // scheduled_at must be the slot's starts_at
    const expectedISO = new Date(slot.starts_at).toISOString()
    const gotISO = created.scheduled_at ? new Date(created.scheduled_at).toISOString() : ''
    expect(gotISO).toBe(expectedISO)

    // Frontend navigates back to the list
    await page.waitForURL(/\/appointments$/, { timeout: 10000 })

    // Read-after-write: appointment is in the list as a real DB row
    const listRes = await page.request.get(API_BASE + '/appointments', {
      headers: apiHeaders(accessToken),
    })
    expect(listRes.status()).toBe(200)
    const list = (await listRes.json()) as Array<{
      id: string
      provider_id: string
      reason: string | null
      patient_user_id?: string
    }>
    const found = list.find((a) => a.id === created.id)
    expect(found, 'newly-booked appointment must appear in GET /api/appointments').toBeTruthy()
    expect(found!.reason).toBe('Annual physical')
    if (userId) expect(found!.patient_user_id).toBe(userId)
  })

  test('Switching the appointment type to "Phone Call" persists into the POST body', async ({
    page,
  }) => {
    await signup(page)
    const providerId = await firstProviderId(page)
    await page.goto(APP_BASE + `/providers/${providerId}/book`)
    await page.locator('button.slot-button').first().click()
    await page.locator('select.form-select').selectOption('phone')

    const bookPromise = page.waitForResponse(
      (r) => r.url().includes('/api/appointments') && r.request().method() === 'POST',
      { timeout: 10000 },
    )
    await page.getByRole('button', { name: /confirm booking/i }).click()
    const bookResp = await bookPromise
    expect(bookResp.status()).toBe(201)
    const created = (await bookResp.json()) as { type?: string }
    expect(created.type).toBe('phone')
  })

  test('Switching to "Chat" maps the wire type to "messaging" before posting', async ({ page }) => {
    await signup(page)
    const providerId = await firstProviderId(page)
    await page.goto(APP_BASE + `/providers/${providerId}/book`)
    await page.locator('button.slot-button').first().click()
    await page.locator('select.form-select').selectOption('chat')

    let postedType: unknown = null
    page.on('request', (req) => {
      if (req.url().includes('/api/appointments') && req.method() === 'POST') {
        try {
          const body = JSON.parse(req.postData() ?? '{}') as { type?: string }
          postedType = body.type
        } catch {
          /* ignore */
        }
      }
    })
    await page.getByRole('button', { name: /confirm booking/i }).click()
    await page.waitForURL(/\/appointments$/, { timeout: 10000 })
    expect(postedType).toBe('messaging')
  })

  test('Booking page without a providerId in the URL shows a "select provider first" empty state', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/appointments/new')
    await expect(page.getByText(/please select a provider first/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /find a provider/i })).toBeVisible()
  })
})
