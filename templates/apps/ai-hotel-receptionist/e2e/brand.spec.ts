import { expect, test, type Page } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

/**
 * Brand consistency — the gate that keeps the ONE-brand rule enforced
 * forever. Every surface renders its brand through the shared
 * `BrandWordmark` component (concierge glyph tile + serif wordmark from
 * branding.ts), so on EVERY route there is:
 *
 *   1. exactly ONE `[data-mol-id="brand-wordmark"]` element, visible
 *      (footer appName TEXT does not carry the data-mol-id and is fine);
 *   2. whose wordmark text is the brand name from branding.ts;
 *   3. whose computed font-family is the brand serif — page 1's computed
 *      value is captured as the baseline (asserted to CONTAIN Newsreader)
 *      and every other page must render the IDENTICAL family string, so a
 *      surface that swaps the serif fails even if the test itself defines
 *      the expectation (tautology-proof).
 *
 * Coverage: every route in App.tsx — public (landing, login, signup,
 * forgot/reset-password, privacy, terms) and authed (dashboard,
 * reservations + new + detail, rooms-rates, guests + detail, voice-agents,
 * calls + detail, simulator, account). There is no `/about` route in this
 * app (the footer's About is an AppFooter modal rendering plain appName
 * text, not a brand rendering). The drawer-open mobile state is not
 * exercised: the shell mounts only one breakpoint's brand per viewport at
 * the default desktop viewport (TopBar mobileOnly / Sidebar ≥md / Drawer
 * only while open), which is the same single-mount rule as the nav.
 */

const WORDMARK = '[data-mol-id="brand-wordmark"]'
const BRAND_TEXT = 'Switchboard'

/** Captured once on the first route asserted; every page must match it. */
let baselineFontFamily: string | null = null

async function expectBrandOnPage(page: Page, path: string): Promise<void> {
  await page.goto(APP_BASE + path, { waitUntil: 'domcontentloaded' })
  const wordmark = page.locator(WORDMARK)
  await expect(wordmark, `${path} must render exactly one brand wordmark`).toHaveCount(1)
  await expect(wordmark, `${path} brand wordmark must be visible`).toBeVisible()
  const text = wordmark.locator('.sb-serif')
  await expect(text, `${path} wordmark text must be the brand name`).toHaveText(BRAND_TEXT)
  const family = await text.evaluate((el) => window.getComputedStyle(el).fontFamily)
  if (baselineFontFamily === null) {
    expect(family, 'the brand wordmark must render in the brand serif (Newsreader)').toContain(
      'Newsreader',
    )
    baselineFontFamily = family
  } else {
    expect(
      family,
      `${path} renders the wordmark in "${family}"; every page must use the same family string ("${baselineFontFamily}")`,
    ).toBe(baselineFontFamily)
  }
}

test.describe('brand wordmark — public routes', () => {
  const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/privacy',
    '/terms',
  ]
  for (const route of PUBLIC_ROUTES) {
    test(`exactly one Switchboard wordmark in the brand serif on ${route}`, async ({ page }) => {
      await expectBrandOnPage(page, route)
    })
  }
})

test.describe('brand wordmark — authed workspace', () => {
  test('exactly one Switchboard wordmark on every authed route', async ({ page }) => {
    await signup(page)

    // Detail-route fixture ids, read back from the API (each fresh signup
    // is seeded with demo calls/guests; the reservation is created here —
    // same canonical front-desk fixture as the reservation lifecycle spec).
    const reservationId = await page.evaluate(async () => {
      const types = await fetch('/api/room-types', { credentials: 'include' }).then((r) => r.json())
      const roomTypeId = (types as { data: Array<{ id: string }> }).data[0]?.id
      if (!roomTypeId) return null
      const checkIn = new Date()
      checkIn.setUTCDate(checkIn.getUTCDate() + 30)
      const checkOut = new Date(checkIn)
      checkOut.setUTCDate(checkOut.getUTCDate() + 2)
      const iso = (d: Date) => d.toISOString().slice(0, 10)
      const created = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          room_type_id: roomTypeId,
          guest_name: 'Brand Spec Fixture',
          check_in: iso(checkIn),
          check_out: iso(checkOut),
          guests: 1,
        }),
      }).then((r) => r.json())
      return (created as { id?: string }).id ?? null
    })
    const callId = await page.evaluate(async () => {
      // outcome=booked guarantees a real record; fall back to any seeded call.
      const booked = (await fetch('/api/calls?outcome=booked', { credentials: 'include' }).then(
        (r) => r.json(),
      )) as { data: Array<{ id: string }> }
      if (booked.data.length > 0) return booked.data[0]!.id
      const all = (await fetch('/api/calls', { credentials: 'include' }).then((r) => r.json())) as {
        data: Array<{ id: string }>
      }
      return all.data[0]?.id ?? null
    })
    const guestId = await page.evaluate(async () => {
      const guests = (await fetch('/api/guests', { credentials: 'include' }).then((r) =>
        r.json(),
      )) as { data: Array<{ id: string }> }
      return guests.data[0]?.id ?? null
    })

    if (!reservationId) test.skip(true, 'no room types to create a reservation fixture from')
    if (!callId) test.skip(true, 'no seeded calls to open a call detail for')
    if (!guestId) test.skip(true, 'no seeded guests to open a guest detail for')

    const routes = [
      '/dashboard',
      '/reservations',
      '/reservations/new',
      '/reservations/' + reservationId,
      '/rooms',
      '/guests',
      '/guests/' + guestId,
      '/voice-agents',
      '/calls',
      '/calls/' + callId,
      '/simulator',
      '/account',
    ]
    for (const route of routes) {
      await expectBrandOnPage(page, route)
    }
  })
})
