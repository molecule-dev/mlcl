/**
 * /calendar — 14-day grid: rows = habits, columns = dates. A check-in
 * via the API renders as a "completed" cell after navigation.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedHabit, signup } from './_helpers.js'

function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

test('calendar fetches habits + completions on first load', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/calendar')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.find((r) => /\/api\/habits$/.test(r.url) && r.method === 'GET')?.status).toBe(200)
  expect(reqs.find((r) => /\/api\/completions/.test(r.url))?.status).toBe(200)
})

test('check-in renders as completed cell on the calendar grid', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Daily walk')
  await page.request.post(`${API_BASE}/habits/${id}/check-in`, {
    headers: apiHeaders(accessToken),
    data: {},
  })

  await page.goto(APP_BASE + '/calendar')
  const cell = page.getByTestId(`cell-${id}-${todayISO()}`)
  await expect(cell).toBeVisible({ timeout: 10_000 })
  await expect(cell).toHaveAttribute('data-completed', 'true')
})

test('previous/next period buttons shift the visible window', async ({ page }) => {
  const { accessToken } = await signup(page)
  await seedHabit(page, accessToken, 'Window test')

  await page.goto(APP_BASE + '/calendar')
  await expect(page.getByTestId('calendar-range-label')).toHaveText(/last 14 days/i)

  await page.getByRole('button', { name: /previous period/i }).click()
  await expect(page.getByTestId('calendar-range-label')).not.toHaveText(/last 14 days/i)
})

test('next-period button moves forward to the next 14-day range', async ({ page }) => {
  const { accessToken } = await signup(page)
  await seedHabit(page, accessToken, 'Forward test')

  await page.goto(APP_BASE + '/calendar')
  await page.getByRole('button', { name: /previous period/i }).click()
  const movedLabel = await page.getByTestId('calendar-range-label').innerText()
  await page.getByRole('button', { name: /next period/i }).click()
  const afterNext = await page.getByTestId('calendar-range-label').innerText()
  expect(afterNext).not.toBe(movedLabel)
})

test('habit row renders with calendar-row-:id testid for each seeded habit', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id: a } = await seedHabit(page, accessToken, 'Row A')
  const { id: b } = await seedHabit(page, accessToken, 'Row B')

  await page.goto(APP_BASE + '/calendar')
  await expect(page.getByTestId(`calendar-row-${a}`)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId(`calendar-row-${b}`)).toBeVisible()
})

test('non-completed cell does not have data-completed=true', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Empty cell test')

  await page.goto(APP_BASE + '/calendar')
  // Pick a day in the past — should not be completed for a fresh habit.
  const past = new Date()
  past.setDate(past.getDate() - 5)
  const m = String(past.getMonth() + 1).padStart(2, '0')
  const day = String(past.getDate()).padStart(2, '0')
  const cell = page.getByTestId(`cell-${id}-${past.getFullYear()}-${m}-${day}`)
  await expect(cell).toBeVisible({ timeout: 10_000 })
  const completed = await cell.getAttribute('data-completed')
  expect(completed).not.toBe('true')
})
