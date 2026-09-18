import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, getAccessToken, signup, api } from './_helpers.js'

interface ApiAssignment {
  id: string
  course_name: string
  title: string
  status: 'upcoming' | 'submitted' | 'graded' | 'overdue'
  submitted_at?: string | null
}

test('Assignments list is non-empty after signup (lazy seed)', async ({ page }) => {
  await signup(page)
  const list = await api<ApiAssignment[]>(page, 'GET', '/assignments')
  // Non-empty, not "more than however many rows the demo seed happens to make".
  expect(list.length).toBeGreaterThan(0)
  const upcoming = list.filter((a) => a.status === 'upcoming')
  const overdue = list.filter((a) => a.status === 'overdue')
  expect(upcoming.length, 'has upcoming assignments').toBeGreaterThan(0)
  expect(overdue.length, 'has overdue assignment for filter testing').toBeGreaterThan(0)
})

test('Submit assignment changes status to submitted (read-after-write)', async ({ page }) => {
  await signup(page)
  const list = await api<ApiAssignment[]>(page, 'GET', '/assignments?status=upcoming')
  expect(list.length).toBeGreaterThan(0)
  const target = list[0]
  expect(target.status).toBe('upcoming')

  // POST submit
  const result = await api<ApiAssignment>(page, 'POST', `/assignments/${target.id}/submit`)
  expect(result.status).toBe('submitted')
  expect(result.submitted_at).toBeTruthy()

  // Read-after-write — fresh GET reflects the new status.
  const fetched = await api<ApiAssignment>(page, 'GET', `/assignments/${target.id}`)
  expect(fetched.status).toBe('submitted')
  expect(fetched.submitted_at).toBeTruthy()
})

test('Filtering by status works server-side', async ({ page }) => {
  await signup(page)
  // Trigger seed.
  await api<ApiAssignment[]>(page, 'GET', '/assignments')
  const submitted = await api<ApiAssignment[]>(page, 'GET', '/assignments?status=submitted')
  for (const a of submitted) expect(a.status).toBe('submitted')

  const graded = await api<ApiAssignment[]>(page, 'GET', '/assignments?status=graded')
  for (const a of graded) expect(a.status).toBe('graded')
})

test('Assignment detail page renders for a real assignment ID', async ({ page }) => {
  await signup(page)
  const list = await api<ApiAssignment[]>(page, 'GET', '/assignments')
  expect(list.length).toBeGreaterThan(0)
  const target = list[0]

  await page.goto(`${APP_BASE}/assignments/${target.id}`)
  await page.waitForLoadState('networkidle')
  // Title should appear in the rendered detail.
  const fragment = target.title.split(' ').slice(0, 3).join(' ')
  await expect(page.locator('body', { hasText: fragment }).first()).toBeVisible({ timeout: 10000 })
})

test('Cannot submit another user’s assignment (IDOR guard)', async ({ page, browser }) => {
  await signup(page)
  const myList = await api<ApiAssignment[]>(page, 'GET', '/assignments')
  const myAssignment = myList[0]

  // Spin up a second user in a fresh context.
  const ctx2 = await browser.newContext()
  const page2 = await ctx2.newPage()
  await signup(page2)
  const resp = await page2.request.fetch(
    `${process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'}/assignments/${myAssignment.id}/submit`.replace(
      /\/api\/api\//,
      '/api/',
    ),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${(await getAccessToken(page2)) ?? ''}`,
      },
    },
  )
  expect(resp.status(), 'cross-user submit must 404').toBe(404)
  await ctx2.close()
})
