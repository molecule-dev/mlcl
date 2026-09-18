/**
 * Dashboard outcome tests.
 *
 * After signup, the auto-seed (`me.ts:ensureUserSeed`) drops two starter
 * courses (AULA 101, PROD 210) plus a live room and a couple of
 * notifications. The dashboard must reflect that real backend state —
 * not a blank shell.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, signup } from './_helpers.js'

interface DashboardBundle {
  stats: {
    courses: number
    enrolled: number
    teaching: number
    assignments: number
    unreadNotifications: number
  }
  upcomingRoom: { id: string; name: string } | null
  upcomingRooms: Array<{ id: string }>
  courses: Array<{ id: string; code: string; title: string }>
  assignments: Array<{ id: string; title: string }>
  grades: Array<{ id: string }>
  notifications: Array<{ id: string; title: string }>
}

test('dashboard renders the auto-seeded courses, assignments and live room', async ({ page }) => {
  await signup(page)

  const bundle = await api<DashboardBundle>(page, 'GET', '/me/dashboard')
  expect(bundle.stats.courses, 'seeded course count').toBeGreaterThanOrEqual(2)
  expect(bundle.stats.teaching, 'teaching count includes seeded courses').toBeGreaterThanOrEqual(2)
  expect(
    bundle.stats.assignments,
    'seeded assignment count (2 in AULA 101 + 1 in PROD 210)',
  ).toBeGreaterThanOrEqual(3)
  expect(bundle.upcomingRoom, 'auto-seed creates one waiting room').not.toBeNull()
  expect(
    bundle.notifications.length,
    'seed adds welcome + assignment notifications',
  ).toBeGreaterThanOrEqual(2)
  expect(bundle.courses.map((c) => c.code).sort()).toEqual(['AULA 101', 'PROD 210'])

  await page.goto(APP_BASE + '/dashboard', { waitUntil: 'networkidle' })
  await expect(page.getByText('AULA 101', { exact: false }).first()).toBeVisible({
    timeout: 10000,
  })
  await expect(page.getByText('PROD 210', { exact: false }).first()).toBeVisible()
})

test('dashboard /me/dashboard never returns the SPA HTML shell', async ({ page }) => {
  await signup(page)
  const responses: { url: string; contentType: string; status: number }[] = []
  page.on('response', (r) => {
    if (r.url().includes('/me/dashboard')) {
      responses.push({
        url: r.url(),
        contentType: r.headers()['content-type'] ?? '',
        status: r.status(),
      })
    }
  })
  await page.goto(APP_BASE + '/dashboard', { waitUntil: 'networkidle' })
  expect(responses.length, 'dashboard must call /me/dashboard').toBeGreaterThan(0)
  for (const r of responses) {
    expect(r.status, `dashboard request status ${r.url}`).toBeLessThan(400)
    expect(r.contentType, `dashboard response should be JSON, not HTML (${r.url})`).toContain(
      'application/json',
    )
  }
})
