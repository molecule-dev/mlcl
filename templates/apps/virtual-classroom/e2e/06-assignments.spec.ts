/**
 * Assignment outcome tests.
 *
 * Seed creates 3 assignments across two courses; we assert listing,
 * detail-fetch, and creating + submitting.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, signup } from './_helpers.js'

interface AssignmentRow {
  id: string
  course_id: string
  title: string
  description: string
  type: string
  points: number
}
interface SubmissionRow {
  id: string
  assignment_id: string
  student_id: string
  content: string | null
}
interface CourseRow {
  id: string
  code: string
}

test('GET /assignments returns the seeded assignments', async ({ page }) => {
  await signup(page)
  const list = await api<AssignmentRow[]>(page, 'GET', '/assignments')
  expect(list.length, 'three seeded assignments').toBeGreaterThanOrEqual(3)
  const titles = list.map((a) => a.title)
  expect(titles).toContain('Try the live whiteboard')
  expect(titles).toContain('Post a chat message in your live room')
})

test('GET /assignments/:id returns the assignment detail', async ({ page }) => {
  await signup(page)
  const list = await api<AssignmentRow[]>(page, 'GET', '/assignments')
  const sample = list[0]
  const detail = await api<AssignmentRow>(page, 'GET', `/assignments/${sample.id}`)
  expect(detail.id).toBe(sample.id)
  expect(detail.title).toBe(sample.title)
})

test('Instructor can POST /assignments and PUT /assignments/:id', async ({ page }) => {
  await signup(page)
  const courses = await api<CourseRow[]>(page, 'GET', '/courses')
  const course = courses.find((c) => c.code === 'AULA 101')
  if (!course) throw new Error('AULA 101 not seeded')
  const created = await api<AssignmentRow>(page, 'POST', '/assignments', {
    course_id: course.id,
    title: 'New e2e assignment',
    description: 'created by test',
    points: 10,
    type: 'homework',
  })
  expect(created.title).toBe('New e2e assignment')

  const updated = await api<AssignmentRow>(page, 'PUT', `/assignments/${created.id}`, {
    title: 'Renamed by test',
  })
  expect(updated.title).toBe('Renamed by test')
})

test('Student POST /assignments/:id/submit creates a submission', async ({ page }) => {
  await signup(page)
  const list = await api<AssignmentRow[]>(page, 'GET', '/assignments')
  const target = list[0]
  const sub = await api<SubmissionRow>(page, 'POST', `/assignments/${target.id}/submit`, {
    content: 'My submission text from the e2e suite',
  })
  expect(sub.assignment_id).toBe(target.id)
  expect(sub.content).toContain('e2e suite')
})

test('Assignments page UI shows the seeded items', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/assignments', { waitUntil: 'networkidle' })
  await expect(page.getByText(/Try the live whiteboard/).first()).toBeVisible({
    timeout: 10000,
  })
})
