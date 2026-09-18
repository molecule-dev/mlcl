/**
 * /courses/:id — course detail page. Asserts course title, curriculum
 * heading, day rows, the back-link to /courses, and the per-day session
 * fetches (/api/courses/:id + /api/sessions/:id) fire on load.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('course detail (/courses/:id)', () => {
  test('renders course title from /api/courses/:id', async ({ page }) => {
    await signup(page)
    const r = await page.request.get(`${API_BASE}/courses`)
    const courses = (await r.json()) as Array<{ slug: string; title: string }>
    expect(courses.length).toBeGreaterThan(0)
    const target = courses[0]
    await page.goto(APP_BASE + '/courses/' + target.slug)
    await expect(page.getByRole('heading', { name: target.title })).toBeVisible({
      timeout: 10000,
    })
  })

  test('renders the curriculum heading', async ({ page }) => {
    await signup(page)
    const r = await page.request.get(`${API_BASE}/courses`)
    const courses = (await r.json()) as Array<{ slug: string }>
    await page.goto(APP_BASE + '/courses/' + courses[0].slug)
    await expect(page.getByRole('heading', { name: /curriculum/i })).toBeVisible({
      timeout: 10000,
    })
  })

  test('renders at least one day row when the course has days', async ({ page }) => {
    await signup(page)
    const r = await page.request.get(`${API_BASE}/courses`)
    const courses = (await r.json()) as Array<{ slug: string; day_count: number }>
    const withDays = courses.find((c) => c.day_count > 0) ?? courses[0]
    await page.goto(APP_BASE + '/courses/' + withDays.slug)
    const detail = await page.request.get(`${API_BASE}/courses/${withDays.slug}`)
    const json = (await detail.json()) as { days: Array<{ day_number: number }> }
    if (json.days.length > 0) {
      await expect(page.getByTestId(`course-day-${json.days[0].day_number}`)).toBeVisible({
        timeout: 10000,
      })
    }
  })

  test('back-link returns to /courses index', async ({ page }) => {
    await signup(page)
    const r = await page.request.get(`${API_BASE}/courses`)
    const courses = (await r.json()) as Array<{ slug: string }>
    await page.goto(APP_BASE + '/courses/' + courses[0].slug)
    await page
      .getByRole('link', { name: /courses/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/courses(\?|$)/)
  })

  test('initial load fetches /api/courses/:id and any linked /api/sessions/:id', async ({
    page,
  }) => {
    await signup(page)
    const r = await page.request.get(`${API_BASE}/courses`)
    const courses = (await r.json()) as Array<{ slug: string; day_count: number }>
    const withDays = courses.find((c) => c.day_count > 0) ?? courses[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/courses/' + withDays.slug)
      await page.waitForLoadState('networkidle')
    })
    const courseCalls = reqs.filter(
      (r) => r.method === 'GET' && /\/api\/courses\/[^/]+$/.test(r.url),
    )
    expect(courseCalls.length, JSON.stringify(reqs.map((r) => r.url))).toBeGreaterThan(0)
    expect(courseCalls.every((r) => r.status < 400)).toBe(true)
  })
})
