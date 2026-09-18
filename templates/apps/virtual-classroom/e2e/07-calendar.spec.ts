/**
 * Calendar outcome tests.
 *
 * GET /me/calendar must include the seed room (kind=class) and the
 * seed assignments (kind=assignment).
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, signup } from './_helpers.js'

interface CalendarEvent {
  id: string
  kind: 'class' | 'assignment'
  title: string
  starts_at: string | null
  url: string
}

test('GET /me/calendar includes the seed room and seed assignments', async ({ page }) => {
  await signup(page)
  const events = await api<CalendarEvent[]>(page, 'GET', '/me/calendar')
  expect(
    events.length,
    'calendar has at least 4 events (1 room + 3 assignments)',
  ).toBeGreaterThanOrEqual(4)
  const classes = events.filter((e) => e.kind === 'class')
  const assignments = events.filter((e) => e.kind === 'assignment')
  expect(classes.length, 'at least one class event').toBeGreaterThanOrEqual(1)
  expect(assignments.length, 'at least three assignment events').toBeGreaterThanOrEqual(3)
})

test('Calendar UI loads and renders without crashing', async ({ page }) => {
  await signup(page)
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(APP_BASE + '/calendar', { waitUntil: 'networkidle' })
  expect(errs.filter((e) => !/favicon/i.test(e))).toEqual([])
})
