import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

/** ISO date `days` from today, as YYYY-MM-DD. */
function isoPlus(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Create a confirmed reservation owned by the current session (the canonical
 * front-desk state: POST /api/reservations starts at 'confirmed'). Returns
 * id + confirmation_code for UI assertions. Every spec in this file builds
 * its own fixture — never depend on seed rows other tests may have consumed
 * or mutated.
 */
async function createConfirmedReservation(
  page: import('@playwright/test').Page,
): Promise<{ id: string; confirmation_code: string }> {
  const created = (await page.evaluate(async () => {
    const types = await fetch('/api/room-types', { credentials: 'include' }).then((r) => r.json())
    const roomTypeId = (types as { data: Array<{ id: string }> }).data[0]!.id
    const checkIn = new Date()
    checkIn.setUTCDate(checkIn.getUTCDate() + 30)
    const checkOut = new Date(checkIn)
    checkOut.setUTCDate(checkOut.getUTCDate() + 2)
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    const resp = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        room_type_id: roomTypeId,
        guest_name: 'Lifecycle Fixture',
        check_in: iso(checkIn),
        check_out: iso(checkOut),
        guests: 1,
      }),
    })
    return resp.json()
  })) as { id: string; confirmation_code: string; status: string }
  expect(created.status).toBe('confirmed')
  return { id: created.id, confirmation_code: created.confirmation_code }
}

test.describe('/reservations/:id', () => {
  test('renders the detail fields and legal lifecycle buttons for a confirmed reservation', async ({
    page,
  }) => {
    await signup(page)
    const target = await createConfirmedReservation(page)
    await page.goto(APP_BASE + '/reservations/' + target.id)
    await expect(page.locator('[data-mol-id="reservation-detail-heading"]')).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.locator('[data-mol-id="reservation-detail-field-confirmation-code"]'),
    ).toContainText(target!.confirmation_code)
    await expect(page.locator('[data-mol-id="reservation-transition-checked_in"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="reservation-transition-cancelled"]')).toBeVisible()
  })

  test('checking a confirmed reservation in walks it to checked_out via the API', async ({
    page,
  }) => {
    await signup(page)
    const target = await createConfirmedReservation(page)
    await page.goto(APP_BASE + '/reservations/' + target.id)
    // Hydration signal before any click — clicking a pre-hydration button
    // was the flake (DOM renders before React wires the handlers).
    await expect(page.locator('[data-mol-id="reservation-detail-heading"]')).toBeVisible({
      timeout: 15_000,
    })
    const patch1 = page.waitForResponse(
      (r) => r.request().method() === 'PUT' && /\/api\/reservations\/[^/]+\/status/.test(r.url()),
      { timeout: 15_000 },
    )
    await page.locator('[data-mol-id="reservation-transition-checked_in"]').click()
    expect((await patch1).status()).toBeLessThan(300)
    await expect(page.locator('[data-mol-id="reservation-transition-checked_out"]')).toBeVisible({
      timeout: 15_000,
    })
    const patch2 = page.waitForResponse(
      (r) => r.request().method() === 'PUT' && /\/api\/reservations\/[^/]+\/status/.test(r.url()),
      { timeout: 15_000 },
    )
    await page.locator('[data-mol-id="reservation-transition-checked_out"]').click()
    expect((await patch2).status()).toBeLessThan(300)
    await expect(page.locator('[data-mol-id="reservation-detail-terminal"]')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('a final-state reservation shows the terminal notice', async ({ page }) => {
    await signup(page)
    // Own fixture again: create confirmed, cancel it (a legal transition),
    // then assert the terminal notice renders.
    const created = await createConfirmedReservation(page)
    const cancelled = await page.evaluate(async (id: string) => {
      const resp = await fetch('/api/reservations/' + id + '/status', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' }),
      })
      return resp.status
    }, created.id)
    expect(cancelled).toBeLessThan(300)
    await page.goto(APP_BASE + '/reservations/' + created.id)
    await expect(page.locator('[data-mol-id="reservation-detail-terminal"]')).toBeVisible({
      timeout: 15_000,
    })
  })
})
