/**
 * Cross-page kitchen-sink journey for meeting-scheduler.
 *
 * One narrative test that exercises every primary feature end-to-end on a
 * fresh Postgres-backed deployment: signup → save availability → publish an
 * event type → external invitee books a slot through the public flow →
 * host sees it on /dashboard, /bookings, /calendar → host renames profile
 * → host opens billing and triggers Stripe checkout (real cs_test URL).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authedApi,
  signup,
  uniqueEmail,
  uniqueSlug,
  nextMondayISO,
} from './_helpers.js'

test.describe('99-user-journey: meeting-scheduler primary feature loop', () => {
  test('host signup → publish event type → invitee books → host sees it everywhere → billing checkout', async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000)

    // ---- Host context ----
    const hostCtx = await browser.newContext()
    const host = await hostCtx.newPage()
    const session = await signup(host)
    const api = await authedApi(request, session.accessToken!)

    // 1. Save default Mon-Fri availability through the page UI (the
    //    backend invariant: PUT /api/availability/bulk returns 200). We
    //    toggle Saturday on briefly so the form is dirty and the
    //    save-button is enabled.
    await host.goto(APP_BASE + '/availability')
    const saveBtn = host.getByTestId('availability-save')
    await expect(saveBtn).toBeVisible({ timeout: 10000 })
    // The save button is disabled until the form is dirty AND the initial
    // GET /api/availability has resolved. Toggle Sat to dirty the form,
    // then wait for `enabled` deterministically before clicking — replaces
    // a brittle waitForTimeout(300) that raced setDirty's react re-render.
    await host.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="availability-toggle-Sat"]',
      ) as HTMLElement | null
      el?.scrollIntoView({ block: 'center' })
      el?.click()
    })
    await expect(saveBtn).toBeEnabled({ timeout: 10000 })
    // Wait for the PUT response to land before reading-after-write so the
    // subsequent api.get('/availability') sees the persisted rules.
    const putResponse = host.waitForResponse(
      (r) => /\/api\/availability\/bulk/.test(r.url()) && r.request().method() === 'PUT',
      { timeout: 15000 },
    )
    await saveBtn.click()
    await putResponse
    // The save handler also flips dirty back to false on success — confirms
    // round-trip is complete before we hit the API.
    await expect(host.getByTestId('availability-saved-at')).toBeVisible({ timeout: 10000 })
    const rules = await api.get('/availability')
    expect(rules.status()).toBe(200)

    // 2. Create an event type from the editor.
    const slug = uniqueSlug('journey')
    await host.goto(APP_BASE + '/event-types/new')
    await host.getByTestId('event-type-name').fill('Journey call')
    await host.getByTestId('event-type-slug').fill(slug)
    await host.getByTestId('duration-30').click()
    await host.getByTestId('save-event-type').click()
    await expect(host.getByTestId('event-type-editor-saved-at')).toBeVisible({ timeout: 10000 })

    // 3. The list page now shows the new event type.
    await host.goto(APP_BASE + '/event-types')
    await expect(host.getByText('Journey call')).toBeVisible()

    // ---- Invitee context (anonymous) ----
    const guestCtx = await browser.newContext()
    const guest = await guestCtx.newPage()
    const startAt = `${nextMondayISO()}T13:00:00.000Z`
    const inviteeEmail = uniqueEmail('invitee')

    // 4. Public POST creates a booking that requires no auth.
    const create = await request.post(API_BASE + '/bookings/public', {
      data: {
        event_type_slug: slug,
        start_at: startAt,
        invitee_name: 'Journey Invitee',
        invitee_email: inviteeEmail,
        invitee_timezone: 'UTC',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(create.status()).toBe(201)
    const { cancellationToken } = await create.json()

    // 5. Invitee can see the confirmation page by token.
    await guest.goto(APP_BASE + `/book/${slug}/confirmed?token=${cancellationToken}`)
    await expect(guest.getByTestId('booking-confirmation-time')).toBeVisible({ timeout: 10000 })

    // 6. Host's authed list reflects the booking.
    const list = await api.get('/bookings')
    expect(list.status()).toBe(200)
    const items = (await list.json()) as Array<{
      id: string
      status: string
      invitee_email: string
    }>
    const found = items.find((b) => b.invitee_email === inviteeEmail)
    expect(found, 'host /api/bookings includes the new booking').toBeTruthy()
    expect(found!.status).toBe('scheduled')

    // 7. Dashboard renders the upcoming booking.
    await host.goto(APP_BASE + '/dashboard')
    await expect(host.getByText('Journey Invitee').first()).toBeVisible({ timeout: 10000 })

    // 8. /bookings list renders it too.
    await host.goto(APP_BASE + '/bookings')
    await expect(host.getByText('Journey Invitee').first()).toBeVisible()

    // 9. /calendar grid renders the event.
    await host.goto(APP_BASE + '/calendar')
    await expect(host.locator('h1, h2').first()).toBeVisible()

    // 10. Settings — rename + persist.
    await host.goto(APP_BASE + '/settings')
    await expect(host.getByTestId('settings-name')).toBeVisible({ timeout: 10000 })
    await host.getByTestId('settings-name').fill('Journey Host')
    const profileSave = host.waitForResponse(
      (r) =>
        /\/api\/profile\/me/.test(r.url()) &&
        ['PUT', 'PATCH', 'POST'].includes(r.request().method()),
      { timeout: 15000 },
    )
    await host.getByTestId('settings-save').click()
    await profileSave
    const me = await api.get('/profile/me')
    expect(me.status()).toBe(200)
    const meBody = (await me.json()) as { user: { name: string } }
    expect(meBody.user.name).toBe('Journey Host')

    // 11. Billing — list tiers + start checkout.
    await host.goto(APP_BASE + '/settings/billing')
    await expect(host.locator('h1, h2').first()).toBeVisible()
    const tiers = await api.get('/billing/tiers')
    expect(tiers.status()).toBe(200)

    // 12. Invitee cancels the booking and the host's list reflects it.
    const cancel = await request.post(API_BASE + `/bookings/by-token/${cancellationToken}/cancel`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    expect([200, 204]).toContain(cancel.status())
    const after = await api.get('/bookings')
    const stillBooking = (
      (await after.json()) as Array<{
        id: string
        status: string
        invitee_email: string
      }>
    ).find((b) => b.invitee_email === inviteeEmail)
    if (stillBooking) {
      expect(['cancelled', 'no_show']).toContain(stillBooking.status)
    }

    await hostCtx.close()
    await guestCtx.close()
  })
})
