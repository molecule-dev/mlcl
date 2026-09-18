import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, api, apiRaw, courseNames } from './_helpers.js'

interface ApiGrade {
  id: string
  course_name?: string | null
  score?: number
  weight?: number
  letter_grade?: string
  graded_at: string
}

interface ApiAttendanceRow {
  id: string
  date: string
  status: 'present' | 'tardy' | 'absent' | 'excused'
  classes: number
}

interface AttendanceSummary {
  total: number
  present: number
  tardy: number
  absent: number
  excused: number
  presentRate: number
}

interface ReportCard {
  courses: Array<{
    course_id: string
    course_name: string
    score: number
    letter_grade: string
  }>
}

test('Grades list is non-empty and per-grade fields look right', async ({ page }) => {
  await signup(page)
  const grades = await api<ApiGrade[]>(page, 'GET', '/grades')
  expect(grades.length).toBeGreaterThan(0)
  for (const g of grades) {
    const score = Number(g.score ?? 0)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
    expect(g.letter_grade).toMatch(/^[A-F]$/)
  }
})

test('Report card summarises per-course averages', async ({ page }) => {
  await signup(page)
  await api<ApiGrade[]>(page, 'GET', '/grades')
  const rc = await api<ReportCard>(page, 'GET', '/grades/report-card')
  expect(rc.courses.length).toBeGreaterThan(0)
  for (const c of rc.courses) {
    expect(c.course_name).toBeTruthy()
    expect(c.letter_grade).toMatch(/^[A-F]$/)
    expect(c.score).toBeGreaterThan(0)
    expect(c.score).toBeLessThanOrEqual(100)
  }
})

test('Report card PDF is a real, non-empty PDF document', async ({ page }) => {
  await signup(page)
  await api<ApiGrade[]>(page, 'GET', '/grades')
  const resp = await apiRaw(page, 'GET', '/grades/report-card/pdf')
  expect(resp.status()).toBe(200)
  const ct = resp.headers()['content-type'] ?? ''
  expect(ct).toContain('application/pdf')
  const body = await resp.body()
  expect(body.length, 'pdf payload non-empty').toBeGreaterThan(100)
  // PDF magic bytes: %PDF
  expect(body.slice(0, 4).toString('utf8')).toBe('%PDF')
})

test('Attendance list and summary agree on counts', async ({ page }) => {
  await signup(page)
  const rows = await api<ApiAttendanceRow[]>(page, 'GET', '/attendance')
  expect(rows.length).toBeGreaterThan(0)

  const summary = await api<AttendanceSummary>(page, 'GET', '/attendance/summary')
  expect(summary.total).toBe(rows.length)
  expect(summary.present).toBe(rows.filter((r) => r.status === 'present').length)
  expect(summary.tardy).toBe(rows.filter((r) => r.status === 'tardy').length)
  expect(summary.absent).toBe(rows.filter((r) => r.status === 'absent').length)
  expect(summary.presentRate).toBeGreaterThanOrEqual(0)
  expect(summary.presentRate).toBeLessThanOrEqual(1)
})

test('Grades page renders the course names the API serves', async ({ page }) => {
  await signup(page)
  // Read the courses under test from the same endpoint the page reads.
  const names = await courseNames(page, '/grades')
  expect(names.length, 'grades cover at least two courses').toBeGreaterThan(1)
  await page.goto(APP_BASE + '/grades')
  await page.waitForLoadState('networkidle')
  for (const name of names.slice(0, 2)) {
    await expect(page.locator('body', { hasText: name }).first()).toBeVisible({
      timeout: 10000,
    })
  }
})

test('Attendance page renders today/recent rows', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/attendance')
  await page.waitForLoadState('networkidle')
  // Sufficient that the page doesn't error and at least one row text shows.
  await expect(page.locator('[data-mol-id="page-attendance"]')).toBeVisible({
    timeout: 15000,
  })
  // Assert on the attendance vocabulary the UI renders per row, not on the
  // note text a seeded row happens to carry.
  await expect(
    page.locator('body', { hasText: /present|absent|tardy|excused/i }).first(),
  ).toBeVisible({ timeout: 10000 })
})

test('Report card page renders a live letter grade for a course', async ({ page }) => {
  await signup(page)
  // The course to look for comes from the report-card endpoint the page reads.
  const rc = await api<ReportCard>(page, 'GET', '/grades/report-card')
  expect(rc.courses.length).toBeGreaterThan(0)
  const course = rc.courses[0]
  await page.goto(APP_BASE + '/grades/report-card')
  await page.waitForLoadState('networkidle')
  const row = page.locator(`[data-mol-id="report-card-row-${course.course_id}"]`)
  await expect(row).toBeVisible({ timeout: 10000 })
  await expect(row).toContainText(course.course_name)
  await expect(row.locator('[data-mol-id="grade-badge"]').last()).toHaveAttribute(
    'data-grade-letter',
    /^[A-F]$/,
  )
})
