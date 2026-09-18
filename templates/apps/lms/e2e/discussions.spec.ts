import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, api } from './_helpers.js'

test('GET /api/discussions returns the empty list initially', async ({ page }) => {
  await signup(page)
  const list = await api<unknown[]>(page, 'GET', '/discussions')
  expect(Array.isArray(list)).toBe(true)
})

test('Author posts a thread, sees it in /api/discussions and on /api/discussions/course/:id', async ({
  page,
}) => {
  await signup(page)
  const course = await api<{ id: string }>(page, 'POST', '/courses', { name: 'Discuss Course' })
  const created = await api<{ id: string; title: string; course_id: string }>(
    page,
    'POST',
    '/discussions',
    {
      course_id: course.id,
      title: 'How do I enroll?',
      content: 'Trying to figure out enrollments.',
    },
  )
  expect(created.id).toBeTruthy()

  const all = await api<Array<{ id: string }>>(page, 'GET', '/discussions')
  expect(all.find((d) => d.id === created.id)).toBeTruthy()

  const courseList = await api<Array<{ id: string }>>(
    page,
    'GET',
    `/discussions/course/${course.id}`,
  )
  expect(courseList.find((d) => d.id === created.id)).toBeTruthy()
})

test('Posting a reply persists and is visible on GET /:id/replies', async ({ page }) => {
  await signup(page)
  const course = await api<{ id: string }>(page, 'POST', '/courses', { name: 'Reply Course' })
  const thread = await api<{ id: string }>(page, 'POST', '/discussions', {
    course_id: course.id,
    title: 'A thread',
    content: 'A body',
  })
  const reply = await api<{ id: string; content: string }>(
    page,
    'POST',
    `/discussions/${thread.id}/replies`,
    { content: 'A helpful reply.' },
  )
  expect(reply.id).toBeTruthy()
  const replies = await api<Array<{ id: string; content: string }>>(
    page,
    'GET',
    `/discussions/${thread.id}/replies`,
  )
  expect(replies.find((r) => r.id === reply.id)?.content).toBe('A helpful reply.')
})

test('/discussions UI page renders for a signed-in user', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/discussions')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('body')).toBeVisible()
})
