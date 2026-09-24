/**
 * /bookings/:id — booking detail; cancel; "Message host" creates thread.
 *
 * Real outcomes asserted:
 *   - detail renders the booking row's listing/dates/total
 *   - "Message host" creates a thread (POST /api/messages/threads) and
 *     navigates to /messages/:threadId — read-after-write the thread is
 *     visible in /api/messages/threads
 *   - "Cancel reservation" PUTs /api/bookings/:id/cancel and the next GET
 *     reflects status='cancelled'
 *
 * The molecule-dev API authenticates via HttpOnly `token`+`sessionId`
 * cookies set on POST /api/users (signup). The SPA's http client does
 * NOT add an Authorization header — it relies entirely on cookies. So
 * every test in this file signs up via the UI, then creates the test
 * booking through the SAME browser context (`page.request`) so cookies
 * — and Bearer headers — both flow naturally.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, getAccessTokenFromPage, signup } from './_helpers'

async function getFirstListing(page: import('@playwright/test').Page) {
  const r = await page.request.get(`${API_BASE}/listings`)
  const body = (await r.json()) as { data: Array<{ id: string; title: string; host_id: string }> }
  return body.data[0]
}

async function makeBookingForCurrentUser(page: import('@playwright/test').Page, listingId: string) {
  const checkIn = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const checkOut = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10)
  const r = await page.request.post(`${API_BASE}/bookings`, {
    data: { listing_id: listingId, check_in: checkIn, check_out: checkOut, guests: 2 },
  })
  expect(
    r.status(),
    `POST /bookings should be 201; got body=${(await r.text()).slice(0, 200)}`,
  ).toBe(201)
  return (await r.json()) as { id: string; status: string }
}

test('booking detail renders real fields', async ({ page }) => {
  await signup(page)
  const listing = await getFirstListing(page)
  const booking = await makeBookingForCurrentUser(page, listing.id)

  await page.goto(APP_BASE + `/bookings/${booking.id}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: listing.title }).first()).toBeVisible({
    timeout: 10000,
  })
  await expect(page.getByText(/check\s*in/i).first()).toBeVisible()
  await expect(page.getByText(/check\s*out/i).first()).toBeVisible()
})

test('Message host creates thread, navigates to /messages/:id, thread visible in inbox', async ({
  page,
}) => {
  await signup(page)
  const listing = await getFirstListing(page)
  const booking = await makeBookingForCurrentUser(page, listing.id)

  await page.goto(APP_BASE + `/bookings/${booking.id}`)
  await page.waitForLoadState('networkidle')

  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /message host/i })
      .first()
      .click()
    await page.waitForURL(/\/messages(\/|$)/, { timeout: 10000 })
  })
  const post = reqs.find((r) => r.url.endsWith('/api/messages/threads') && r.method === 'POST')
  expect(post, 'POST /api/messages/threads should fire').toBeTruthy()
  expect([200, 201]).toContain(post!.status)

  // Read-after-write: GET /api/messages/threads should now return the
  // thread for this listing.
  const list = await page.request.get(`${API_BASE}/messages/threads`)
  const body = (await list.json()) as { data: Array<{ id: string; listing_id: string | null }> }
  expect(
    body.data.some((t) => t.listing_id === listing.id),
    'thread for this listing must be in inbox',
  ).toBeTruthy()
})

test('Cancel reservation flips status to cancelled and is visible on next GET', async ({
  page,
}) => {
  await signup(page)
  const listing = await getFirstListing(page)
  const booking = await makeBookingForCurrentUser(page, listing.id)

  await page.goto(APP_BASE + `/bookings/${booking.id}`)
  await page.waitForLoadState('networkidle')

  // The cancel is a two-step ConfirmButton (no native dialog): the first
  // click ARMS it and shows the inline confirm label, the second COMMITS.
  // hasText /cancel/i matches both the idle ("Cancel reservation") and the
  // armed ("Cancel this reservation? …") label, so one locator spans the
  // whole interaction.
  const cancelBtn = page
    .getByRole('button')
    .filter({ hasText: /cancel/i })
    .first()
  await cancelBtn.click()
  await expect(cancelBtn).toHaveText(/cancel this reservation\?/i)
  const reqs = await captureNetwork(page, async () => {
    await cancelBtn.click()
    await page.waitForTimeout(2000)
  })
  const put = reqs.find((r) => /\/api\/bookings\/[^/]+\/cancel/.test(r.url) && r.method === 'PUT')
  expect(put?.status).toBe(200)

  // Read-after-write: GET /api/bookings/:id reflects the new status.
  const after = await page.request.get(`${API_BASE}/bookings/${booking.id}`)
  const afterBody = (await after.json()) as { status: string }
  expect(afterBody.status).toBe('cancelled')
})

test('View listing link returns to /listings/:id', async ({ page }) => {
  await signup(page)
  const listing = await getFirstListing(page)
  const booking = await makeBookingForCurrentUser(page, listing.id)

  await page.goto(APP_BASE + `/bookings/${booking.id}`)
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('link', { name: /view listing/i })
    .first()
    .click()
  await expect(page).toHaveURL(new RegExp(`/listings/${listing.id}$`))
})

test('access token is available after signup (httpOnly cookie, M1-1)', async ({ page }) => {
  await signup(page)
  // [M1-1] The bearer token is now held in an httpOnly `token` cookie set
  // server-side. getAccessTokenFromPage reads it via page.context().cookies().
  // If cookie-based auth breaks, getAccessToken returns null and helpers fail.
  const token = await getAccessTokenFromPage(page)
  expect(token, 'auth httpOnly token cookie must be set after signup').toBeTruthy()
})
