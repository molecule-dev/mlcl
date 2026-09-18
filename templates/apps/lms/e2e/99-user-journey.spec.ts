import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  api,
  captureNetwork,
  expectNoConsoleErrors,
  getMyUserId,
  signup,
} from './_helpers.js'

/**
 * Cross-page kitchen-sink user journey for the LMS.
 *
 * One signed-in user, one course, one module, one assignment, one
 * submission. Walks through every primary route and asserts that the
 * page renders, the network calls hit real backend handlers (no SPA
 * fallback) and that no fatal console errors fire.
 *
 * This spec is the "happy path smoke" — per-page specs cover edge
 * cases. Together they form the coverage net.
 */

test('end-to-end student journey across every primary route', async ({ page }) => {
  // 1. Sign up a fresh user
  const { email } = await signup(page)
  const myId = await getMyUserId(page)

  // 2. Seed: course → module → lesson → assignment → enrollment → grade
  const course = await api<{ id: string; name: string }>(page, 'POST', '/courses', {
    name: 'Journey Course',
    description: 'cross-page e2e',
  })
  await api(page, 'POST', `/courses/${course.id}/publish`, {})

  const moduleRow = await api<{ id: string }>(page, 'POST', '/modules', {
    course_id: course.id,
    title: 'Module One',
    position: 0,
  })
  const lesson = await api<{ id: string }>(page, 'POST', `/modules/${moduleRow.id}/items`, {
    type: 'page',
    title: 'Lesson One',
    position: 0,
  })
  const assignment = await api<{ id: string }>(page, 'POST', '/assignments', {
    course_id: course.id,
    title: 'Journey Assignment',
    points: 100,
  })

  const profile = await api<{ email: string }>(page, 'GET', '/profile/me')
  await api(page, 'POST', '/enrollments', {
    course_id: course.id,
    student_id: myId,
    student_email: profile.email,
  })
  const submission = await api<{ id: string }>(
    page,
    'POST',
    `/assignments/${assignment.id}/submissions`,
    { content: 'My answer.' },
  )
  await api(page, 'POST', `/grades`, {
    assignment_id: assignment.id,
    course_id: course.id,
    student_id: myId,
    score: 95,
    max_score: 100,
  })
  expect(submission.id).toBeTruthy()

  // 3. Walk every primary authenticated route and assert it renders +
  // hits a real backend (not the SPA fallback) for the dashboard /
  // gradebook / leaderboard / stats endpoints.
  const journey = [
    { path: '/dashboard', expect: /\/api\/me\/stats|\/api\/courses\?my=true|\/api\/leaderboard/ },
    { path: '/courses' },
    { path: `/course/${course.id}`, expect: /\/api\/courses\/|\/api\/modules/ },
    { path: '/assignments', expect: /\/api\/assignments/ },
    { path: '/discussions', expect: /\/api\/discussions/ },
    { path: '/gradebook', expect: /\/api\/grades/ },
    { path: '/notifications', expect: /\/api\/courses\?my=true/ },
    { path: '/settings' },
    { path: '/plan-updated' },
    // route literal: /course/:courseId/lesson/:lessonId
    { path: `/course/${course.id}/lesson/${lesson.id}` },
  ]

  for (const step of journey) {
    await expectNoConsoleErrors(page, async () => {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + step.path)
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
      })
      await expect(page.locator('body')).toBeVisible()
      if (step.expect) {
        const matched = reqs.some((r) => step.expect!.test(r.url) && r.status < 500)
        expect(matched, `${step.path} fired ${step.expect} (got ${reqs.length} reqs)`).toBe(true)
      }
    })
  }

  // 4. Public routes (anonymous-OK)
  for (const path of ['/pricing', '/help', '/privacy', '/terms']) {
    await page.goto(APP_BASE + path)
    await expect(page.locator('body')).toBeVisible()
  }

  expect(email).toContain('@')
})
