import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, api, getMyUserId } from './_helpers.js'

test('GET /api/assignments returns the empty list with no auth-side error', async ({ page }) => {
  await signup(page)
  const list = await api<unknown[]>(page, 'GET', '/assignments')
  expect(Array.isArray(list)).toBe(true)
})

test('Instructor creates assignment in a course they own (read-after-write)', async ({ page }) => {
  await signup(page)
  const course = await api<{ id: string }>(page, 'POST', '/courses', { name: 'Assign Course' })
  const created = await api<{ id: string; title: string; course_id: string }>(
    page,
    'POST',
    '/assignments',
    {
      course_id: course.id,
      title: 'Essay 1',
      description: 'Write 500 words',
      points: 100,
    },
  )
  expect(created.id).toBeTruthy()
  const list = await api<Array<{ id: string; title: string }>>(
    page,
    'GET',
    `/assignments/course/${course.id}`,
  )
  expect(list.find((a) => a.id === created.id)?.title).toBe('Essay 1')
})

test('Submission requires enrollment — creating one as instructor self-enrolled works after enroll', async ({
  page,
}) => {
  await signup(page)
  const me = await getMyUserId(page)
  const course = await api<{ id: string }>(page, 'POST', '/courses', { name: 'Submit Course' })
  const assignment = await api<{ id: string }>(page, 'POST', '/assignments', {
    course_id: course.id,
    title: 'Quiz',
  })

  // Self-enroll so submission is allowed (instructor can also be a student
  // in their own course for testing). Use the user's email pulled from /me.
  const profile = await api<{ email: string }>(page, 'GET', '/profile/me')
  await api(page, 'POST', '/enrollments', {
    course_id: course.id,
    student_id: me,
    student_email: profile.email,
  })
  const sub = await api<{ id: string; status: string }>(
    page,
    'POST',
    `/assignments/${assignment.id}/submissions`,
    { content: 'My answer.' },
  )
  expect(sub.id).toBeTruthy()
  expect(sub.status).toBe('submitted')
})
