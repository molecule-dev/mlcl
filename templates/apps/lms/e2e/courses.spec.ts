import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, api } from './_helpers.js'

test('POST /api/courses creates a course owned by the signed-in user (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  const { id } = await api<{ id: string; name: string; instructor_id: string }>(
    page,
    'POST',
    '/courses',
    { name: 'Intro to LMS Test', description: 'Created from e2e' },
  )
  expect(id).toBeTruthy()
  const list = await api<Array<{ id: string; name: string }>>(page, 'GET', '/courses')
  expect(list.find((c) => c.id === id)?.name).toBe('Intro to LMS Test')
})

test('PUT /api/courses/:id updates the course (read-after-write)', async ({ page }) => {
  await signup(page)
  const created = await api<{ id: string }>(page, 'POST', '/courses', {
    name: 'Original',
    description: 'before',
  })
  await api(page, 'PUT', `/courses/${created.id}`, { name: 'Renamed', description: 'after' })
  const fetched = await api<{ name: string; description: string }>(
    page,
    'GET',
    `/courses/${created.id}`,
  )
  expect(fetched.name).toBe('Renamed')
  expect(fetched.description).toBe('after')
})

test('POST /api/courses/:id/publish flips status to published', async ({ page }) => {
  await signup(page)
  const created = await api<{ id: string }>(page, 'POST', '/courses', { name: 'To publish' })
  await api(page, 'POST', `/courses/${created.id}/publish`, {})
  const after = await api<{ status: string; published_at: string }>(
    page,
    'GET',
    `/courses/${created.id}`,
  )
  expect(after.status).toBe('published')
  expect(after.published_at).toBeTruthy()
})

test('DELETE /api/courses/:id removes the row', async ({ page }) => {
  await signup(page)
  const created = await api<{ id: string }>(page, 'POST', '/courses', { name: 'Doomed' })
  await api(page, 'DELETE', `/courses/${created.id}`)
  const list = await api<Array<{ id: string }>>(page, 'GET', '/courses')
  expect(list.find((c) => c.id === created.id)).toBeUndefined()
})

test('GET /api/profile/users/:id returns minimal public info for any authenticated user', async ({
  page,
}) => {
  await signup(page)
  // Create a course so we have a known instructor_id (ourselves).
  const course = await api<{ id: string; instructor_id: string }>(page, 'POST', '/courses', {
    name: 'Public lookup test',
  })
  const me = await api<{ id: string; name: string; email: string }>(
    page,
    'GET',
    `/profile/users/${course.instructor_id}`,
  )
  expect(me.id).toBe(course.instructor_id)
  expect(me.email).toBeTruthy()
  // Sensitive fields must not leak through this endpoint.
  expect((me as Record<string, unknown>).oauthData).toBeUndefined()
  expect((me as Record<string, unknown>).planKey).toBeUndefined()
})

test('/courses UI: catalog → enroll → My courses (read-after-write)', async ({ page }) => {
  await signup(page)
  const course = await api<{ id: string }>(page, 'POST', '/courses', {
    name: 'Ui Catalog Course',
    description: 'enroll-from-catalog',
  })
  await api(page, 'POST', `/courses/${course.id}/publish`, {})

  // Sign up a second user who will browse + enroll via the UI.
  const ctx2 = await page.context().browser()!.newContext()
  const page2 = await ctx2.newPage()
  await page2.goto(APP_BASE + '/signup')
  const email2 = `lms+catalog-${Date.now()}-${Math.random().toString(16).slice(2, 6)}@example.com`
  await page2.locator('input#name').fill('Catalog Walker')
  await page2.locator('input#email').fill(email2)
  await page2.locator('input#password').fill('TestPass123!')
  await page2
    .getByRole('button', { name: /sign\s*up|create.*account|creating/i })
    .first()
    .click()
  await expect(page2).not.toHaveURL(/\/signup/, { timeout: 30000 })

  await page2.goto(APP_BASE + '/courses')
  await expect(page2.getByRole('heading', { name: 'Browse catalog', level: 2 })).toBeVisible()
  const enrollBtn = page2.locator(`[data-mol-id="btn-enroll-${course.id}"]`)
  await enrollBtn.scrollIntoViewIfNeeded()
  await expect(enrollBtn).toBeVisible()
  await enrollBtn.click()

  // After enroll, the course should appear in My courses.
  const myCard = page2.locator(`[data-mol-id="my-course-${course.id}"]`)
  await expect(myCard).toBeVisible({ timeout: 5000 })
  await expect(myCard.getByRole('button', { name: /continue course/i })).toBeVisible()

  await page2.close()
  await ctx2.close()
})
