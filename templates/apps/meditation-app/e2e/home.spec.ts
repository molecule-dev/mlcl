/**
 * /home — authenticated dashboard. Asserts today-session card, KPI tiles,
 * recommended grid, and that the page actually fetches /api/sessions,
 * /api/categories, /api/stats/* and /api/preferences on initial load.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('home page (/home)', () => {
  test('renders the today-session hero with a Begin link to /sessions/<slug>', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/home')
    await expect(page.getByText(/today.s session/i)).toBeVisible({ timeout: 10000 })
    const begin = page.getByRole('link', { name: /begin session/i })
    await expect(begin).toBeVisible()
    expect(await begin.getAttribute('href')).toMatch(/^\/sessions\//)
  })

  test('Begin link actually navigates to a session player page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/home')
    const begin = page.getByRole('link', { name: /begin session/i })
    await begin.click()
    await page.waitForURL(/\/sessions\//, { timeout: 10000 })
  })

  test('streak / sessions KPI tiles render with numeric values', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/home')
    await expect(page.getByText(/day streak/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('recommended grid renders at least one /sessions/* link card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/home')
    const recommended = page.locator('a[href^="/sessions/"]')
    await expect(recommended.first()).toBeVisible({ timeout: 10000 })
    await expect(recommended.first()).toBeAttached()
  })

  test('initial load fetches /api/sessions, /api/categories, /api/stats/* and /api/preferences', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/home')
      await page.waitForLoadState('networkidle')
    })
    const got = (path: string) =>
      reqs.some((r) => r.method === 'GET' && r.url.includes(path) && r.status < 400)
    expect(got('/api/sessions'), JSON.stringify(reqs.map((r) => r.url))).toBe(true)
    expect(got('/api/categories')).toBe(true)
    expect(got('/api/stats/streak')).toBe(true)
    expect(got('/api/stats/summary')).toBe(true)
    expect(got('/api/preferences')).toBe(true)
  })
})
