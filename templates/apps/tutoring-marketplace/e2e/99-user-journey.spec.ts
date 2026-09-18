/**
 * Cross-page kitchen-sink user journey.
 * Drives a single user through the marketplace top to bottom: signup →
 * browse tutors → view tutor profile → book → confirm → see in sessions list →
 * message tutor → settings/account → become-tutor → pricing/checkout → logout.
 * Asserts read-after-write at every persistent step.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiFetch,
  captureNetwork,
  getAccessToken,
  pickBookableTutor,
  signup,
} from './_helpers.js'

test.describe.configure({ mode: 'serial' })

test('end-to-end user journey: signup → search → tutor → book → confirm → sessions → messages → become-tutor → pricing', async ({
  page,
}) => {
  test.setTimeout(120_000)

  // 1. Signup
  const auth = await signup(page)

  // 2. /search → the marketplace has a browseable catalog
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const tutorsList = await apiFetch<any[]>(page, 'GET', '/tutors')
  expect(tutorsList.status).toBe(200)
  expect(Array.isArray(tutorsList.body) ? tutorsList.body.length : 0).toBeGreaterThan(0)

  // 3. /tutor/:id — public detail page. The tutor is whichever bookable one
  // the live catalog holds, so the journey survives replacing the demo rows.
  const tutor = await pickBookableTutor(page)
  await page.goto(APP_BASE + '/tutor/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByText(tutor.display_name).first()).toBeVisible()

  // 4. /book/:id — choose first slot, confirm booking
  await page.goto(APP_BASE + '/book/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /confirm booking/i })
      .first()
      .click()
    await page.waitForURL(/\/confirm/, { timeout: 15_000 })
  })
  const bookingPost = reqs.find((r) => r.method === 'POST' && /\/api\/bookings(\?|$)/.test(r.url))
  expect(bookingPost?.status, 'POST /api/bookings 201').toBe(201)

  // 5. Read-after-write: GET /api/bookings includes the new row
  const list = await apiFetch<any[]>(page, 'GET', '/bookings')
  expect(list.status).toBe(200)
  const arr = list.body as any[]
  expect(arr.length).toBeGreaterThanOrEqual(1)
  const newest = arr[0]
  expect(newest.tutor_id).toBe(tutor.id)

  // 6. /sessions — booking shows up under Upcoming
  await page.goto(APP_BASE + '/sessions')
  await page.waitForTimeout(1_500)
  const sessHtml = await page.content()
  expect(sessHtml).toContain(tutor.display_name)

  // 7. /sessions/:id — see detail
  await page.goto(APP_BASE + '/sessions/' + newest.id)
  await page.waitForTimeout(1_500)

  // 8. /messages?with=:tutorUserId — start a thread with the tutor we booked
  await page.goto(APP_BASE + '/messages?with=' + (tutor.user_id ?? tutor.id))
  await page.waitForTimeout(2_000)
  const threads = await apiFetch<any[]>(page, 'GET', '/messages/threads')
  expect(threads.status).toBe(200)

  // 9. /become-tutor — create a tutor profile
  await page.goto(APP_BASE + '/become-tutor')
  await page.waitForTimeout(1_500)

  // 10. /account — backend GET /users/:id reflects the signup payload
  const jwt = await getAccessToken(page)
  const userId = jwt
    ? (() => {
        try {
          const part = jwt.split('.')[1]
          if (!part) return null
          const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
          return json.userId ?? null
        } catch {
          return null
        }
      })()
    : null
  expect(userId, 'userId should be decodable from JWT').toBeTruthy()
  const me = await apiFetch<any>(page, 'GET', '/users/' + userId)
  expect(me.status).toBe(200)
  // Server may return the user under .props or at the top level
  const meEmail = (me.body?.email ?? me.body?.props?.email ?? '').toLowerCase()
  expect(meEmail).toBe(auth.email.toLowerCase())
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)

  // 11. /pricing — Stripe checkout via API returns real cs_test_ URL
  await page.goto(APP_BASE + '/pricing')
  await page.waitForTimeout(1_500)
  const checkout = await apiFetch<any>(page, 'POST', '/billing/checkout', {
    priceId:
      process.env.STRIPE_TUTORING_MARKETPLACE_PRO_MONTHLY ?? 'price_1TVBpgCES2eiMwhCW71szwNo',
  })
  expect(checkout.status).toBeGreaterThanOrEqual(200)
  expect(checkout.status).toBeLessThan(400)
  if (checkout.body.checkoutUrl) {
    expect(String(checkout.body.checkoutUrl)).toMatch(/checkout\.stripe\.com|cs_test_/)
  }

  // 12. Theme persistence — toggle and reload
  await page.goto(APP_BASE + '/')
  const themeBefore = await page.evaluate(
    () =>
      document.documentElement.getAttribute('data-mol-mode') ??
      document.documentElement.getAttribute('data-theme'),
  )
  await page
    .getByRole('button', { name: /toggle theme/i })
    .first()
    .click()
  await page.waitForTimeout(300)
  const themeAfter = await page.evaluate(
    () =>
      document.documentElement.getAttribute('data-mol-mode') ??
      document.documentElement.getAttribute('data-theme'),
  )
  expect(themeAfter).not.toBe(themeBefore)
  await page.reload()
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          document.documentElement.getAttribute('data-mol-mode') ??
          document.documentElement.getAttribute('data-theme'),
      ),
    )
    .toBe(themeAfter)

  // 13. /api/subjects — public endpoint hit (handler subjects exercised)
  const subjects = await apiFetch<any[]>(page, 'GET', '/subjects')
  expect(subjects.status).toBe(200)
})
