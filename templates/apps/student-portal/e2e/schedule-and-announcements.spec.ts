import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, api, courseNames } from './_helpers.js'

interface ScheduleEntry {
  id: string
  course_name?: string
  weekday?: number
  day?: number
  start_time?: string
  end_time?: string
  teacher?: string
  room?: string
  period_label?: string
}

interface Announcement {
  id: string
  title: string
  body: string
  audience: 'school' | 'class' | 'self'
  pinned: boolean
}

test('Full week schedule has Monday-Friday entries for every period', async ({ page }) => {
  await signup(page)
  const all = await api<ScheduleEntry[]>(page, 'GET', '/schedule')
  expect(all.length).toBeGreaterThan(0)

  const weekdays = new Set(all.map((e) => e.weekday ?? e.day))
  expect(weekdays).toEqual(new Set([1, 2, 3, 4, 5]))

  // Every course runs on every weekday — the invariant a hardcoded entry count
  // stood in for, stated against however many courses the schedule holds.
  const courses = new Set(all.map((e) => e.course_name))
  expect(courses.size).toBeGreaterThan(0)
  for (const weekday of [1, 2, 3, 4, 5]) {
    const onDay = new Set(
      all.filter((e) => (e.weekday ?? e.day) === weekday).map((e) => e.course_name),
    )
    expect(onDay, `weekday ${weekday} covers every course`).toEqual(courses)
  }
  expect(all.length).toBe(courses.size * 5)
})

test('/schedule/today returns a non-empty list even on weekends', async ({ page }) => {
  await signup(page)
  const today = await api<ScheduleEntry[]>(page, 'GET', '/schedule/today')
  expect(today.length).toBeGreaterThan(0)
  for (const e of today) {
    expect(e.course_name).toBeTruthy()
    expect(e.start_time).toMatch(/^\d{2}:\d{2}$/)
    expect(e.end_time).toMatch(/^\d{2}:\d{2}$/)
  }
})

test('Schedule page renders the courses the API serves', async ({ page }) => {
  await signup(page)
  // The course to look for comes from the endpoint the page reads.
  const names = await courseNames(page, '/schedule')
  expect(names.length).toBeGreaterThan(0)
  await page.goto(APP_BASE + '/schedule')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('body', { hasText: names[0] }).first()).toBeVisible({
    timeout: 10000,
  })
})

test('Announcements list contains the pinned all-school announcement', async ({ page }) => {
  await signup(page)
  const announcements = await api<Announcement[]>(page, 'GET', '/announcements')
  expect(announcements.length).toBeGreaterThan(0)
  const pinned = announcements.find((a) => a.pinned)
  expect(pinned, 'a pinned announcement exists').toBeTruthy()
  expect(pinned!.audience).toBe('school')
  // Assert the record is complete, not what the demo announcement happens to say.
  expect(pinned!.title).toBeTruthy()
  expect(pinned!.body).toBeTruthy()
})

test('Announcement create + read-after-write surfaces in list', async ({ page }) => {
  await signup(page)
  const created = await api<Announcement>(page, 'POST', '/announcements', {
    title: 'Custom announcement ' + Date.now(),
    body: 'Hand-rolled.',
    audience: 'self',
    pinned: false,
    icon: 'campaign',
  })
  expect(created.id).toBeTruthy()

  const list = await api<Announcement[]>(page, 'GET', '/announcements')
  expect(list.find((a) => a.id === created.id)?.title).toBe(created.title)
})
