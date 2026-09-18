import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, api } from './_helpers.js'

interface ApiAssignment {
  id: string
  title: string
  status: string
}

interface Gpa {
  gpa: number
  percent: number
  count: number
}

interface ScheduleEntry {
  id: string
  course_name?: string
}

test('Dashboard renders for a brand-new user with seeded data', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-mol-id="page-dashboard"]')).toBeVisible({ timeout: 15000 })
})

test('First GET /assignments triggers lazy seed — list is non-empty', async ({ page }) => {
  await signup(page)
  const list = await api<ApiAssignment[]>(page, 'GET', '/assignments')
  expect(Array.isArray(list)).toBe(true)
  expect(list.length, 'lazy seed populated assignments').toBeGreaterThan(0)
})

test('GPA endpoint returns a real number computed from seeded grades', async ({ page }) => {
  await signup(page)
  // Seed via assignments call first so seed runs.
  await api<ApiAssignment[]>(page, 'GET', '/assignments')
  const gpa = await api<Gpa>(page, 'GET', '/grades/gpa')
  expect(gpa.gpa).toBeGreaterThan(0)
  expect(gpa.gpa).toBeLessThanOrEqual(4)
  expect(gpa.count).toBeGreaterThan(0)
  expect(gpa.percent).toBeGreaterThan(0)
})

test('Schedule /today returns at least one class for a fresh user', async ({ page }) => {
  await signup(page)
  // Trigger seed.
  await api<ApiAssignment[]>(page, 'GET', '/assignments')
  const today = await api<ScheduleEntry[]>(page, 'GET', '/schedule/today')
  expect(Array.isArray(today)).toBe(true)
  expect(
    today.length,
    'today schedule should be populated even on weekends (Mon fallback)',
  ).toBeGreaterThan(0)
})

test('Dashboard shows assignment titles fetched from /api/assignments', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle')
  // Wait for assignments to fetch and render.
  const assignments = await api<ApiAssignment[]>(page, 'GET', '/assignments')
  // At least one of the seeded titles should be visible somewhere on the dashboard.
  const sample = assignments.find((a) => a.title)
  expect(sample, 'seed produced at least one assignment').toBeTruthy()
  const titleVisible = await page
    .locator('body', { hasText: sample!.title.split(' ').slice(0, 3).join(' ') })
    .first()
    .isVisible()
    .catch(() => false)
  expect(titleVisible, `dashboard should render assignment "${sample!.title}"`).toBe(true)
})
