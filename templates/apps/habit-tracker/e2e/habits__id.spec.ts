/**
 * /habits/:id — Habit detail: shows the habit's stats, recent check-ins,
 * and exposes an inline Edit form that PATCHes /api/habits/:id and
 * round-trips the new name through a follow-up GET.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedHabit, signup } from './_helpers.js'

test('habit detail shows the habit name and stats', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id, name } = await seedHabit(page, accessToken, 'Stretch')

  await page.goto(APP_BASE + `/habits/${id}`)
  await expect(page.locator('h1')).toContainText(name, { timeout: 10_000 })
  // The four stat cards are present (current streak, longest, total, cadence).
  await expect(page.getByText(/current streak/i)).toBeVisible()
  await expect(page.getByText(/longest/i).first()).toBeVisible()
  await expect(page.getByText(/total/i).first()).toBeVisible()
})

test('edit button opens an inline form that PATCHes the habit name', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Pre-edit name')

  await page.goto(APP_BASE + `/habits/${id}`)
  await page.getByTestId('habit-edit').click()

  await page.getByTestId('habit-edit-name').fill('Renamed habit')
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('habit-edit-save').click()
    await expect(page.locator('h1')).toContainText('Renamed habit', { timeout: 10_000 })
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/habits\/[0-9a-f-]+$/.test(r.url))
  expect(patch?.status).toBe(200)

  // Read-after-write: GET /api/habits/:id reflects the new name.
  const res = await page.request.get(`${API_BASE}/habits/${id}`, {
    headers: apiHeaders(accessToken),
  })
  const body = (await res.json()) as { name: string }
  expect(body.name).toBe('Renamed habit')
})

test('back link returns to /habits', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Back-to-habits-test')

  await page.goto(APP_BASE + `/habits/${id}`)
  await page
    .getByRole('link', { name: /all habits|← all habits/i })
    .first()
    .click()
  await page.waitForURL(/\/habits$/, { timeout: 10_000 })
})

test('check-in via API renders in the Recent check-ins list', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Recent-checkin-habit')

  await page.request.post(`${API_BASE}/habits/${id}/check-in`, {
    headers: apiHeaders(accessToken),
    data: {},
  })

  await page.goto(APP_BASE + `/habits/${id}`)
  await expect(page.getByText(/recent check-ins/i)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('1', { exact: false }).first()).toBeVisible()
})

test('reminder section shows empty state until one is added', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Reminder-empty-habit')
  await page.goto(APP_BASE + `/habits/${id}`)
  await expect(page.getByTestId('habit-reminders')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/No reminders yet/i)).toBeVisible()
})

test('add reminder POSTs /api/reminders and renders the new row', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Reminder-add-habit')

  await page.goto(APP_BASE + `/habits/${id}`)
  await page.getByTestId('habit-reminder-time').fill('07:30')
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('habit-reminder-add').click()
    await expect(page.getByTestId('habit-reminders-list')).toContainText('07:30', {
      timeout: 10_000,
    })
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/reminders$/.test(r.url))
  expect(post?.status, JSON.stringify(reqs)).toBe(201)

  // Read-after-write: GET /api/reminders?habit_id=:id returns the new reminder.
  const res = await page.request.get(`${API_BASE}/reminders?habit_id=${id}`, {
    headers: apiHeaders(accessToken),
  })
  const list = (await res.json()) as Array<{
    time_of_day: string
    channel: string
    habit_id: string
    user_id: string
  }>
  expect(list.length).toBe(1)
  expect(list[0].time_of_day).toMatch(/^07:30/)
  expect(list[0].channel).toBe('push')
  expect(list[0].habit_id).toBe(id)
})

test('API rejects an invalid HH:MM with 4xx', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Reminder-bad-time-habit')

  // Bypass the browser's time-input sanitization to prove the API does
  // its own validation (defense in depth — the regex on the server is
  // the real guard).
  const res = await page.request.post(`${API_BASE}/reminders`, {
    headers: apiHeaders(accessToken),
    data: { habit_id: id, time_of_day: '25:99', channel: 'push' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBeGreaterThanOrEqual(400)
  expect(res.status()).toBeLessThan(500)
})

test('delete reminder removes it from the list and DB', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Reminder-delete-habit')

  // Seed a reminder via API
  const create = await page.request.post(`${API_BASE}/reminders`, {
    headers: apiHeaders(accessToken),
    data: { habit_id: id, time_of_day: '21:15', channel: 'push' },
  })
  expect(create.status()).toBe(201)
  const reminder = (await create.json()) as { id: string }

  await page.goto(APP_BASE + `/habits/${id}`)
  await expect(page.getByTestId(`habit-reminder-${reminder.id}`)).toBeVisible({ timeout: 10_000 })

  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId(`habit-reminder-delete-${reminder.id}`).click()
    await expect(page.getByTestId(`habit-reminder-${reminder.id}`)).toHaveCount(0, {
      timeout: 10_000,
    })
  })
  const del = reqs.find(
    (r) => r.method === 'DELETE' && new RegExp(`/api/reminders/${reminder.id}$`).test(r.url),
  )
  expect(del?.status).toBe(204)

  // DB invariant: the reminder is gone.
  const after = await page.request.get(`${API_BASE}/reminders?habit_id=${id}`, {
    headers: apiHeaders(accessToken),
  })
  const list = (await after.json()) as unknown[]
  expect(list.length).toBe(0)
})
