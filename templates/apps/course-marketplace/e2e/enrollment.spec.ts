/**
 * Enrollment + checkout flow.
 *
 *   - Free courses (price_cents=0) enroll synchronously without Stripe.
 *   - Paid courses return a real Stripe Checkout session URL.
 *   - GET /api/enrollments lists the buyer's enrolled courses.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  authHeaders,
  becomeInstructor,
  publishCourse,
  readEnrollments,
  seedCourse,
  signupApiOnly,
  uniqueEmail,
} from './_helpers.js'

test.describe('enrollment + checkout', () => {
  test('free course enrolls synchronously and shows up in /api/enrollments', async ({ page }) => {
    // Sign up the buyer first via the API so seedDemoForUser doesn't
    // pre-enrol them in the course we're about to create.
    const buyer = await signupApiOnly(page, uniqueEmail('cm-buyer'))
    // Author + publish a free course as instructor.
    const owner = await signupApiOnly(page, uniqueEmail('cm-owner'))
    await becomeInstructor(page, owner.accessToken)
    const { id: courseId } = await seedCourse(page, owner.accessToken, {
      title: 'Free Spec Course',
      price_cents: 0,
    })
    await publishCourse(page, owner.accessToken, courseId)

    const enrollRes = await page.request.post(`${API_BASE}/checkout/create-session`, {
      headers: authHeaders(buyer.accessToken),
      data: { course_id: courseId },
    })
    expect(enrollRes.status()).toBe(200)
    const enrollBody = (await enrollRes.json()) as {
      free?: boolean
      enrollmentId?: string
      url?: string
    }
    expect(enrollBody.free).toBe(true)
    expect(enrollBody.enrollmentId).toBeTruthy()

    // Read-after-write: GET /enrollments must include the new row.
    const enrollments = await readEnrollments(page, buyer.accessToken)
    expect(enrollments.find((e) => e.course_id === courseId)).toBeTruthy()
  })

  test('paid course returns a real Stripe Checkout URL', async ({ page }) => {
    const buyer = await signupApiOnly(page, uniqueEmail('cm-buyer-paid'))
    const owner = await signupApiOnly(page, uniqueEmail('cm-owner-paid'))
    await becomeInstructor(page, owner.accessToken)
    const { id: courseId } = await seedCourse(page, owner.accessToken, {
      title: 'Paid Spec Course',
      price_cents: 2999,
    })
    await publishCourse(page, owner.accessToken, courseId)

    const checkoutRes = await page.request.post(`${API_BASE}/checkout/create-session`, {
      headers: authHeaders(buyer.accessToken),
      data: { course_id: courseId },
    })
    expect(checkoutRes.status()).toBe(200)
    const checkoutBody = (await checkoutRes.json()) as {
      sessionId?: string
      url?: string
    }
    expect(checkoutBody.sessionId).toMatch(/^cs_(test|live)_/)
    expect(checkoutBody.url).toMatch(/^https:\/\/checkout\.stripe\.com\//)
  })

  test('duplicate free enrollment returns 409, not a duplicate row', async ({ page }) => {
    const buyer = await signupApiOnly(page, uniqueEmail('cm-buyer-dup'))
    const owner = await signupApiOnly(page, uniqueEmail('cm-owner-dup'))
    await becomeInstructor(page, owner.accessToken)
    const { id: courseId } = await seedCourse(page, owner.accessToken, {
      title: 'Dup Spec Course',
      price_cents: 0,
    })
    await publishCourse(page, owner.accessToken, courseId)

    const first = await page.request.post(`${API_BASE}/checkout/create-session`, {
      headers: authHeaders(buyer.accessToken),
      data: { course_id: courseId },
    })
    expect(first.status()).toBe(200)
    const second = await page.request.post(`${API_BASE}/checkout/create-session`, {
      headers: authHeaders(buyer.accessToken),
      data: { course_id: courseId },
    })
    expect(second.status()).toBe(409)
  })
})
