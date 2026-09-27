/**
 * Signed-out visitor + owner-page contract for the public business booking
 * surface (fleet audit 2026-09-27).
 *
 * These specs run as a VISITOR (no auth, no seeded host) against the seeded
 * business catalog from migration 0011. They exist to catch the benchmark
 * failure class where a builder's public pages called auth-only routes:
 *   - m018: home called GET /api/event-types (authed) → 401 for everyone
 *   - m014: availability never loaded for the public flow
 *   - m010: services existed only in a dev database
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, signup, uniqueEmail } from './_helpers.js'

const SERVICE_SLUG = 'standard-meeting'

// Bookings this spec creates are CANCELLED after each test: the empty-state
// specs (bookings/dashboard/notifications) assert a fresh signup sees an
// empty schedule, and a lingering scheduled system booking would break them.
const createdTokens: string[] = []

test.afterEach(async ({ request }) => {
  for (const token of createdTokens.splice(0)) {
    await request
      .post(API_BASE + `/bookings/by-token/${token}/cancel`, {
        data: { cancellation_reason: 'public-business spec cleanup' },
        headers: { 'Content-Type': 'application/json' },
      })
      .catch(() => {})
  }
})

/** Next date (≥ tomorrow) that falls on a business day (Tue–Sat). */
function nextBusinessDayISO(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  while (d.getUTCDay() < 2 || d.getUTCDay() > 6) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Pick the first available slot start (ISO) for a service on a business day. */
async function firstAvailableSlot(
  request: APIRequestContext,
  slug: string,
  dayIso: string,
): Promise<{ start: string; dayIso: string } | null> {
  const res = await request.get(
    API_BASE + `/event-types/by-slug/${slug}/availability?date=${dayIso}`,
  )
  if (res.status() !== 200) return null
  const body = (await res.json()) as { slots: Array<{ start: string; available: boolean }> }
  const open = body.slots?.find((s) => s.available)
  return open ? { start: open.start, dayIso } : null
}

function nextBusinessDays(count: number): string[] {
  const out: string[] = []
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  while (out.length < count) {
    if (d.getUTCDay() >= 2 && d.getUTCDay() <= 6) out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

test.describe('Public business booking (signed-out)', () => {
  test('home lists seeded services with prices — without calling an authed route', async ({
    page,
  }) => {
    const authedViolations: string[] = []
    page.on('response', (r) => {
      // The authed catalog route is exactly what m018 got wrong: a
      // visitor-visible page must never touch it, and it 401s signed out.
      if (r.status() === 401 && r.url().includes('/api/')) authedViolations.push(r.url())
    })

    await page.goto(APP_BASE)
    const card = page.getByTestId(`service-card-${SERVICE_SLUG}`)
    await expect(card).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId(`service-price-${SERVICE_SLUG}`)).toHaveText('$40')
    await expect(page.getByTestId('service-card-quick-chat')).toBeVisible()
    await expect(page.getByTestId('service-card-deep-dive-session')).toBeVisible()

    // The catalog endpoint itself is public and returns price + duration.
    const res = await page.request.get(API_BASE + '/event-types/public/services')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      services: Array<{ price_cents: number; duration_minutes: number }>
      hours: Array<{ day_of_week: number }>
    }
    expect(body.services.length).toBeGreaterThanOrEqual(3)
    for (const s of body.services) {
      expect(s).toHaveProperty('price_cents')
      expect(s).toHaveProperty('duration_minutes')
    }
    // Business hours are data: Tue(2)..Sat(6) seeded.
    expect(body.hours.map((h) => h.day_of_week).sort()).toEqual([2, 3, 4, 5, 6])

    expect(authedViolations, 'no visitor page may call an authed API route').toHaveLength(0)
  })

  test('a signed-out visitor can book a seeded service and sees a confirmation', async ({
    page,
  }) => {
    await page.goto(APP_BASE + `/book/${SERVICE_SLUG}`)
    await expect(page.getByTestId('booking-page-event')).toBeVisible({ timeout: 15000 })

    let clicked = false
    for (let i = 0; i < 14 && !clicked; i++) {
      await page.getByTestId(`day-${i}`).click()
      await page.waitForTimeout(800)
      const enabled = page
        .getByRole('option')
        .filter({ hasNotText: /booked/i })
        .first()
      if ((await enabled.count()) > 0) {
        await enabled.click()
        clicked = true
      }
    }
    expect(clicked, 'should find at least one bookable day in the next 14').toBe(true)

    await page.getByTestId('invitee-name').fill('Walk-in Visitor')
    await page.getByTestId('invitee-email').fill(`walkin+${Date.now()}@example.com`)

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/bookings/public') && r.request().method() === 'POST',
      ),
      page.getByTestId('booking-confirm').click(),
    ])
    expect(response.status(), 'signed-out booking should succeed').toBe(201)
    const created = (await response.json()) as { cancellationToken?: string }
    if (created.cancellationToken) createdTokens.push(created.cancellationToken)
    await expect(page).toHaveURL(/confirmed\?token=/, { timeout: 10000 })
  })

  test('a booked slot is not offered again', async ({ page, request }) => {
    const day = nextBusinessDays(1)[0]
    const free = await firstAvailableSlot(request, SERVICE_SLUG, day)
    expect(free, 'the seeded business day has at least one open slot').toBeTruthy()

    const create = await request.post(API_BASE + '/bookings/public', {
      data: {
        event_type_slug: SERVICE_SLUG,
        start_at: free!.start,
        invitee_name: 'Double-book Probe',
        invitee_email: `probe+${Date.now()}@example.com`,
        invitee_timezone: 'UTC',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(create.status(), 'first booking of the slot succeeds').toBe(201)
    createdTokens.push(((await create.json()) as { cancellationToken: string }).cancellationToken)

    // The slot must no longer be OFFERED: the availability endpoint (which the
    // booking page renders) drops it from the open slots.
    const after = await request.get(
      API_BASE + `/event-types/by-slug/${SERVICE_SLUG}/availability?date=${day}`,
    )
    const body = (await after.json()) as {
      slots: Array<{ start: string; available: boolean }>
    }
    const slot = body.slots.find((s) => s.start === free!.start)
    expect(slot, 'the booked slot still exists on the day').toBeTruthy()
    expect(slot!.available, 'the booked slot is not offered as available').toBe(false)
  })

  test('the owner page is password-protected', async ({ page, request }) => {
    const res = await request.get(API_BASE + '/bookings')
    expect(res.status(), 'the bookings API is auth-only').toBe(401)

    await page.goto(APP_BASE + '/bookings')
    await page.waitForURL(/login/, { timeout: 10000 })
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('after signing in, the owner sees the signed-out booking', async ({ browser, request }) => {
    const days = nextBusinessDays(7)
    let booked: { start: string; invitee: string } | null = null
    for (const day of days) {
      const free = await firstAvailableSlot(request, SERVICE_SLUG, day)
      if (!free) continue
      const invitee = `Owner Visible ${Date.now()}`
      const create = await request.post(API_BASE + '/bookings/public', {
        data: {
          event_type_slug: SERVICE_SLUG,
          start_at: free.start,
          invitee_name: invitee,
          invitee_email: `ownerview+${Date.now()}@example.com`,
          invitee_timezone: 'UTC',
        },
        headers: { 'Content-Type': 'application/json' },
      })
      if (create.status() === 201) {
        booked = { start: free.start, invitee }
        createdTokens.push(
          ((await create.json()) as { cancellationToken: string }).cancellationToken,
        )
        break
      }
    }
    expect(booked, 'seeded a public booking for the owner to see').toBeTruthy()

    const ctx = await browser.newContext()
    const owner = await ctx.newPage()
    await signup(owner)
    await owner.goto(APP_BASE + '/bookings')
    await expect(owner.getByText(booked!.invitee).first()).toBeVisible({ timeout: 15000 })
    await ctx.close()
  })
})
