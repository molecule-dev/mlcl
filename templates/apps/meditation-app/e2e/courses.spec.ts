/**
 * /courses — courses index. Asserts the heading, course cards, navigation
 * to a course detail page, and that /api/courses is fetched on load.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('courses index (/courses)', () => {
  test('lists courses from /api/courses with a card per course', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/courses')

    const r = await page.request.get(`${API_BASE}/courses`)
    expect(r.status()).toBe(200)
    const courses = (await r.json()) as Array<{ slug: string; title: string; day_count: number }>
    expect(courses.length).toBeGreaterThan(0)
    const first = courses[0]
    await expect(page.getByText(first.title, { exact: false }).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('a course card is clickable and navigates to /courses/<slug>', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/courses')
    const r = await page.request.get(`${API_BASE}/courses`)
    const courses = (await r.json()) as Array<{ slug: string; title: string }>
    const target = courses[0]
    await page.locator(`a[href="/courses/${target.slug}"]`).first().click()
    await expect(page).toHaveURL(new RegExp(`/courses/${target.slug}`))
  })

  test('initial load fetches /api/courses', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/courses')
      await page.waitForLoadState('networkidle')
    })
    const calls = reqs.filter((r) => r.method === 'GET' && r.url.includes('/api/courses'))
    expect(calls.length, JSON.stringify(reqs.map((r) => r.url))).toBeGreaterThan(0)
    expect(calls.every((r) => r.status < 400)).toBe(true)
  })
})
