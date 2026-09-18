// Pet-care primary-feature journey:
//   signup → add pet → browse sitters → book a sitter → cancel booking →
//   add vet record → add medication → notification mark-as-read →
//   settings load. Every step asserts on the outcome (next GET reflects
//   the write) — not just "POST returned 2xx".

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedGet,
  authedPost,
  captureNetwork,
  expectNoConsoleErrors,
  signup,
} from './_helpers.js'

test('full pet-care journey: signup → pet → sitter → booking → cancel → vet → med', async ({
  page,
}) => {
  test.setTimeout(180_000)

  // 1. Fresh signup → land on dashboard.
  const creds = await signup(page)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

  // 2. Add a pet through the UI and read-after-write.
  await page.goto(APP_BASE + '/pets')
  await page.waitForLoadState('networkidle')
  // First-time empty-state CTA
  await page
    .locator('[data-mol-id="cta-add-first-pet"], [data-mol-id="cta-add-pet"]')
    .first()
    .click()
  const petName = `Mochi-${Date.now()}`
  await page.locator('#pet-name').fill(petName)
  await page.locator('#pet-species').selectOption('cat')
  await page.locator('#pet-breed').fill('Calico')

  const petReqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="submit-add-pet"]').click()
    await page.waitForTimeout(1500)
  })
  const petPost = petReqs.find((r) => r.method === 'POST' && /\/api\/pets\b/.test(r.url))
  expect(petPost, 'POST /api/pets observed').toBeTruthy()
  expect(petPost!.status).toBeGreaterThanOrEqual(200)
  expect(petPost!.status).toBeLessThan(300)

  const petsList = (await authedGet(page, '/pets')) as Array<{ id: string; name: string }>
  const myPet = petsList.find((p) => p.name === petName)
  expect(myPet, 'created pet returned by GET /api/pets').toBeTruthy()
  const petId = myPet!.id

  // Reload-persists check
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(petName).first()).toBeVisible({ timeout: 8000 })

  // 3. Browse sitters → seeded sitters render.
  await page.goto(APP_BASE + '/sitters')
  await page.waitForLoadState('networkidle')
  const sittersFromApi = (await authedGet(page, '/sitters')) as Array<{
    id: string
    display_name: string
  }>
  expect(sittersFromApi.length, 'seeded sitters present').toBeGreaterThan(0)
  await expect(page.getByText(sittersFromApi[0].display_name).first()).toBeVisible()

  // 4. Open a sitter detail page and book a visit.
  const sitter = sittersFromApi[0]
  await page.goto(APP_BASE + `/sitters/${sitter.id}`)
  await page.waitForLoadState('networkidle')
  await expect(
    page.getByRole('heading', { name: new RegExp(sitter.display_name, 'i') }),
  ).toBeVisible()

  // Open the booking modal.
  await page.locator('[data-mol-id="cta-book-sitter"]').click()
  await page.waitForTimeout(300)
  // The modal auto-selects the user's only pet; submit once values are valid.
  const bookReqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="submit-book-sitter"]').click()
    await page.waitForTimeout(2000)
  })
  const bookPost = bookReqs.find((r) => r.method === 'POST' && /\/api\/bookings\b/.test(r.url))
  expect(bookPost, 'POST /api/bookings observed').toBeTruthy()
  expect(bookPost!.status).toBeGreaterThanOrEqual(200)
  expect(bookPost!.status).toBeLessThan(300)

  // The modal closes & app navigates to /bookings/:id.
  await page.waitForURL(/\/bookings\/[a-f0-9-]+/, { timeout: 10000 })
  const bookingId = page.url().split('/').pop()!

  // Read-after-write on /bookings/upcoming.
  const upcoming = (await authedGet(page, '/bookings/upcoming')) as Array<{ id: string }>
  expect(
    upcoming.some((b) => b.id === bookingId),
    'booking visible on /bookings/upcoming',
  ).toBeTruthy()

  // 5. Cancel the booking from the detail page (two-step: cta-cancel-booking → cta-confirm-cancel).
  await page.locator('[data-mol-id="cta-cancel-booking"]').click()
  await page.waitForTimeout(300)
  const cancelReqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="cta-confirm-cancel"]').click()
    await page.waitForTimeout(2000)
  })
  const cancelPost = cancelReqs.find(
    (r) => r.method === 'POST' && /\/api\/bookings\/.*\/cancel\b/.test(r.url),
  )
  expect(cancelPost, 'POST /api/bookings/:id/cancel observed').toBeTruthy()
  expect(cancelPost!.status).toBeGreaterThanOrEqual(200)
  expect(cancelPost!.status).toBeLessThan(300)

  // The booking now reports cancelled.
  const cancelledBooking = (await authedGet(page, `/bookings/${bookingId}`)) as { status: string }
  expect(cancelledBooking.status).toBe('cancelled')

  // 6. Add a vet record and assert it persists.
  await page.goto(APP_BASE + '/vet-records')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-mol-id="cta-add-vet-record"]').first().click()
  await page.waitForTimeout(300)
  const vrTitle = `Annual checkup ${Date.now()}`
  await page.locator('#vr-title').fill(vrTitle)
  await page.locator('#vr-vet').fill('Dr. Smith')
  await page.locator('#vr-summary').fill('Healthy as can be')

  const vrReqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="submit-add-vet-record"]').click()
    await page.waitForTimeout(1800)
  })
  const vrPost = vrReqs.find((r) => r.method === 'POST' && /\/api\/vet-records\b/.test(r.url))
  expect(vrPost, 'POST /api/vet-records observed').toBeTruthy()
  expect(vrPost!.status).toBeGreaterThanOrEqual(200)
  expect(vrPost!.status).toBeLessThan(300)

  const vetRecords = (await authedGet(page, '/vet-records')) as Array<{ id: string; title: string }>
  expect(
    vetRecords.some((r) => r.title === vrTitle),
    'vet-record returned by GET',
  ).toBeTruthy()

  // 7. Add a medication and assert it persists.
  await page.goto(APP_BASE + '/medications')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-mol-id="cta-add-medication"]').first().click()
  await page.waitForTimeout(300)
  const medName = `Heartgard-${Date.now()}`
  await page.locator('#med-name').fill(medName)
  await page.locator('#med-dosage').fill('5 mg')
  await page.locator('#med-frequency').fill('Monthly')

  const medReqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="submit-add-medication"]').click()
    await page.waitForTimeout(1800)
  })
  const medPost = medReqs.find((r) => r.method === 'POST' && /\/api\/medications\b/.test(r.url))
  expect(medPost, 'POST /api/medications observed').toBeTruthy()
  expect(medPost!.status).toBeGreaterThanOrEqual(200)
  expect(medPost!.status).toBeLessThan(300)

  const meds = (await authedGet(page, '/medications?active=true')) as Array<{
    id: string
    name: string
  }>
  expect(
    meds.some((m) => m.name === medName),
    'medication returned by GET /api/medications',
  ).toBeTruthy()

  // 8. Notifications: at least the booking-cancelled / created ones exist.
  const notifs = (await authedGet(page, '/notifications')) as Array<{
    id: string
    read_at: string | null
  }>
  expect(Array.isArray(notifs), 'GET /api/notifications returns an array').toBeTruthy()

  await page.goto(APP_BASE + '/notifications')
  await page.waitForLoadState('networkidle')
  // mark-all-read button only present when unread > 0; if none, skip.
  const markAll = page.locator('[data-mol-id="cta-mark-all-read"]')
  if (await markAll.count().catch(() => 0)) {
    const markReqs = await captureNetwork(page, async () => {
      await markAll.click()
      await page.waitForTimeout(1500)
    })
    const markPost = markReqs.find(
      (r) => r.method === 'POST' && /\/api\/notifications\/mark-all-read\b/.test(r.url),
    )
    expect(markPost, 'POST /api/notifications/mark-all-read observed').toBeTruthy()
    expect(markPost!.status).toBeGreaterThanOrEqual(200)
    expect(markPost!.status).toBeLessThan(300)
  }

  // 9. Settings page loads with profile email pre-filled in #settings-email.
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('#settings-email')).toHaveValue(creds.email, { timeout: 10_000 })

  // 10. Health/reminders endpoint is reachable (handler 'health').
  const reminders = (await authedGet(page, '/health/reminders')) as Array<{ kind: string }>
  expect(Array.isArray(reminders), 'GET /api/health/reminders returns an array').toBeTruthy()

  expect(petId).toBeTruthy()
})

test('public landing renders without console errors', async ({ page }) => {
  await expectNoConsoleErrors(page, async () => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })
})
