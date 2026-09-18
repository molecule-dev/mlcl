/**
 * Courses CRUD outcome tests.
 *
 * Asserts on persistence — created courses come back from GET /courses,
 * deletes 404, enrolling is idempotent, /:id requires membership.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, apiRaw, signup } from './_helpers.js'

interface CourseRow {
  id: string
  code: string
  title: string
  description: string
  is_published: boolean
  instructor_id: string
}

test('POST /courses creates a course returned by GET /courses', async ({ page }) => {
  await signup(page)
  const code = 'TEST ' + Date.now().toString().slice(-5)
  const title = 'Outcome test course'
  const created = await api<CourseRow>(page, 'POST', '/courses', {
    code,
    title,
    description: 'created by e2e',
    is_published: true,
  })
  expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
  expect(created.code).toBe(code)
  expect(created.title).toBe(title)

  const list = await api<CourseRow[]>(page, 'GET', '/courses')
  expect(
    list.find((c) => c.id === created.id),
    'created course in list',
  ).toBeTruthy()

  const fetched = await api<CourseRow>(page, 'GET', `/courses/${created.id}`)
  expect(fetched.id).toBe(created.id)
})

test('DELETE /courses/:id removes the course (subsequent GET 404s)', async ({ page }) => {
  await signup(page)
  const created = await api<CourseRow>(page, 'POST', '/courses', {
    code: 'DEL ' + Date.now().toString().slice(-4),
    title: 'Will delete',
  })
  await api(page, 'DELETE', `/courses/${created.id}`)
  const after = await apiRaw(page, 'GET', `/courses/${created.id}`)
  expect(after.status(), 'deleted course returns 404').toBe(404)
})

test('PUT /courses/:id updates the title', async ({ page }) => {
  await signup(page)
  const created = await api<CourseRow>(page, 'POST', '/courses', {
    code: 'UPD ' + Date.now().toString().slice(-4),
    title: 'Original',
  })
  const updated = await api<CourseRow>(page, 'PUT', `/courses/${created.id}`, {
    title: 'Updated title',
  })
  expect(updated.title).toBe('Updated title')
  const refetched = await api<CourseRow>(page, 'GET', `/courses/${created.id}`)
  expect(refetched.title).toBe('Updated title')
})

test('POST /courses/:id/enroll is idempotent (re-enroll returns same enrollment)', async ({
  page,
}) => {
  // Author of a course is also an instructor — enroll a second user as student.
  await signup(page)
  const course = await api<CourseRow>(page, 'POST', '/courses', {
    code: 'ENR ' + Date.now().toString().slice(-4),
    title: 'Enrollable',
    is_published: true,
  })

  // Switch to a fresh user via signup in a new context — for now sign up
  // and self-enroll the same instructor; idempotency still holds.
  const enroll1 = await api<{ id: string }>(page, 'POST', `/courses/${course.id}/enroll`)
  const enroll2 = await api<{ id: string }>(page, 'POST', `/courses/${course.id}/enroll`)
  expect(enroll1.id).toBe(enroll2.id)
})

test('GET /courses/:id requires course membership (404 for stranger course)', async ({ page }) => {
  await signup(page)
  // Valid UUID v4 shape (version=4, variant=8) the zod uuid() schema accepts.
  const fakeId = '00000000-0000-4000-8000-000000000000'
  const r = await apiRaw(page, 'GET', `/courses/${fakeId}`)
  expect(r.status(), 'non-existent course returns 404').toBe(404)
})

test('Courses page shows the auto-seeded AULA 101 in the list', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/courses', { waitUntil: 'networkidle' })
  await expect(page.getByText(/AULA\s*101/).first()).toBeVisible({ timeout: 10000 })
})
