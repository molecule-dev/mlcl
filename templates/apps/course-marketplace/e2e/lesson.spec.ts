/**
 * Lesson playback — POST /lessons/:id/progress mark-complete loop.
 *
 *   - A learner enrolled in a published course can fetch its lessons and
 *     POST progress (watched_seconds, completed=true) which the server
 *     reflects on subsequent reads.
 *   - The recomputed enrollment.progress climbs above 0% once a lesson
 *     is marked complete.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  authHeaders,
  becomeInstructor,
  publishCourse,
  seedCourse,
  signupApiOnly,
  uniqueEmail,
} from './_helpers.js'

test.describe('lesson progress', () => {
  test('mark-complete persists and bumps enrollment progress', async ({ page }) => {
    const author = await signupApiOnly(page, uniqueEmail('lesson-author'))
    await becomeInstructor(page, author.accessToken)
    const { id: courseId } = await seedCourse(page, author.accessToken, {
      title: `Lesson Spec ${Date.now()}`,
      price_cents: 0,
    })

    // Author adds two lessons.
    const lesson1Res = await page.request.post(`${API_BASE}/lessons`, {
      headers: authHeaders(author.accessToken),
      data: {
        course_id: courseId,
        title: 'Lesson 1',
        duration_sec: 120,
        sort_order: 1,
      },
    })
    expect(lesson1Res.status(), await lesson1Res.text().catch(() => '')).toBeLessThan(300)
    const lesson1 = (await lesson1Res.json()) as { id: string }

    const lesson2Res = await page.request.post(`${API_BASE}/lessons`, {
      headers: authHeaders(author.accessToken),
      data: {
        course_id: courseId,
        title: 'Lesson 2',
        duration_sec: 180,
        sort_order: 2,
      },
    })
    expect(lesson2Res.status()).toBeLessThan(300)

    await publishCourse(page, author.accessToken, courseId)

    // Buyer enrolls and marks lesson 1 complete.
    const buyer = await signupApiOnly(page, uniqueEmail('lesson-buyer'))
    const enrollRes = await page.request.post(`${API_BASE}/enrollments`, {
      headers: authHeaders(buyer.accessToken),
      data: { course_id: courseId },
    })
    expect(enrollRes.status(), await enrollRes.text().catch(() => '')).toBeLessThan(300)

    const progressRes = await page.request.post(`${API_BASE}/lessons/${lesson1.id}/progress`, {
      headers: authHeaders(buyer.accessToken),
      data: { watched_seconds: 120, completed: true },
    })
    expect(progressRes.status(), await progressRes.text().catch(() => '')).toBeLessThan(300)

    // Confirm the lesson is now flagged complete.
    const lessonsRes = await page.request.get(`${API_BASE}/lessons/course/${courseId}`, {
      headers: authHeaders(buyer.accessToken),
    })
    expect(lessonsRes.status()).toBe(200)
    const lessons = (await lessonsRes.json()) as Array<{
      id: string
      is_completed?: boolean
    }>
    const target = lessons.find((l) => l.id === lesson1.id)
    expect(target?.is_completed).toBe(true)

    // Enrollment progress should be > 0 now (recomputed server-side).
    const enrollmentsRes = await page.request.get(`${API_BASE}/enrollments`, {
      headers: authHeaders(buyer.accessToken),
    })
    const enrollments = (await enrollmentsRes.json()) as Array<{
      course_id: string
      progress_percent?: number
      lessons_completed?: number
    }>
    const myEnroll = enrollments.find((e) => e.course_id === courseId)
    expect(myEnroll).toBeTruthy()
    expect(Number(myEnroll?.progress_percent ?? 0)).toBeGreaterThan(0)
    expect(Number(myEnroll?.lessons_completed ?? 0)).toBeGreaterThan(0)
  })
})
