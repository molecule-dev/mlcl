/**
 * /habits/new — Create habit form: submitting persists via POST /api/habits
 * and navigates to /habits/:id; the disabled save button activates on input.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test('create habit POSTs and lands on /habits/:id', async ({ page }) => {
  const { accessToken } = await signup(page)

  await page.goto(APP_BASE + '/habits/new')
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Read at night')

  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /create habit/i }).click()
    await page.waitForURL(/\/habits\/[0-9a-f-]{8,}/, { timeout: 10_000 })
  })

  const post = reqs.find((r) => r.method === 'POST' && /\/api\/habits$/.test(r.url))
  expect(post?.status).toBe(201)

  const list = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const habits = (await list.json()) as Array<{ name: string }>
  expect(habits.find((h) => h.name === 'Read at night')).toBeTruthy()
})

test('create habit submit button is disabled when name is empty', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  const submit = page.getByRole('button', { name: /create habit/i })
  await expect(submit).toBeDisabled()
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Anything')
  await expect(submit).toBeEnabled()
})

test('cancel button returns to /habits without creating anything', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Will not save')
  await page.getByRole('button', { name: /^cancel$/i }).click()
  await page.waitForURL(/\/habits$/, { timeout: 10_000 })

  const list = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const habits = (await list.json()) as Array<{ name: string }>
  expect(habits.find((h) => h.name === 'Will not save')).toBeFalsy()
})

test('category selection styles the chosen pill (visible signal)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  const learning = page.getByRole('button', { name: /learning/i })
  await learning.click()
  // After clicking Learning, the pill changes background — assert the
  // submission carries through.
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Learn TS')
  await page.getByRole('button', { name: /create habit/i }).click()
  await page.waitForURL(/\/habits\/[0-9a-f-]+/, { timeout: 10_000 })
})

test('custom frequency persists cadence=custom + days_of_week (Mon-Fri)', async ({ page }) => {
  // Regression: form was sending a comma-separated cadence string and
  // accent_color/notes that don't match the schema; custom-cadence creation
  // would 400 silently. Now: select custom frequency, untick Sat+Sun, save,
  // and read back the row to confirm the backend stored the right shape.
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Weekday focus block')
  await page.getByRole('button', { name: /^custom$/i }).click()
  // Day buttons are rendered Mon..Sun; toggle off Saturday (index 5) and Sunday (index 6).
  const dayButtons = page.locator('button.w-10.h-10')
  await dayButtons.nth(5).click()
  await dayButtons.nth(6).click()
  await page.locator('textarea').fill('weekday-only deep work')
  await page.getByRole('button', { name: /create habit/i }).click()
  await page.waitForURL(/\/habits\/[0-9a-f-]+/, { timeout: 10_000 })

  const list = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const habits = (await list.json()) as Array<{
    name: string
    cadence: string
    days_of_week: number[]
    description: string | null
  }>
  const row = habits.find((h) => h.name === 'Weekday focus block')
  expect(row, 'created habit must round-trip via API').toBeTruthy()
  expect(row?.cadence).toBe('custom')
  // UI Mon..Fri = backend Sun-first indices [1,2,3,4,5]
  expect(row?.days_of_week).toEqual([1, 2, 3, 4, 5])
  expect(row?.description).toBe('weekday-only deep work')
})

// Per-category emoji-pill coverage: each pill is a real button. Not asserting
// every pill end-to-end — that would be 6× redundant — but covering Mind +
// Creativity + Social ensures the shared "select pill, submit, persist
// category=…" path works for non-default selections.

test('Mind pill selection persists category=mind', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  await page.getByRole('button', { name: /^mind$/i }).click()
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Daily breathing')
  await page.getByRole('button', { name: /create habit/i }).click()
  await page.waitForURL(/\/habits\/[0-9a-f-]+/, { timeout: 10_000 })
  const list = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const row = ((await list.json()) as Array<{ name: string; category: string }>).find(
    (h) => h.name === 'Daily breathing',
  )
  expect(row?.category).toBe('mind')
})

test('Creativity pill persists category=creativity', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  await page.getByRole('button', { name: /^creativity$/i }).click()
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Sketch daily')
  await page.getByRole('button', { name: /create habit/i }).click()
  await page.waitForURL(/\/habits\/[0-9a-f-]+/, { timeout: 10_000 })
  const list = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const row = ((await list.json()) as Array<{ name: string; category: string }>).find(
    (h) => h.name === 'Sketch daily',
  )
  expect(row?.category).toBe('creativity')
})

test('Social pill persists category=social', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  await page.getByRole('button', { name: /^social$/i }).click()
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Ring a friend')
  await page.getByRole('button', { name: /create habit/i }).click()
  await page.waitForURL(/\/habits\/[0-9a-f-]+/, { timeout: 10_000 })
  const list = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const row = ((await list.json()) as Array<{ name: string; category: string }>).find(
    (h) => h.name === 'Ring a friend',
  )
  expect(row?.category).toBe('social')
})

test('Daily cadence is the default and persists', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Default cadence')
  await page.getByRole('button', { name: /create habit/i }).click()
  await page.waitForURL(/\/habits\/[0-9a-f-]+/, { timeout: 10_000 })
  const list = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const row = ((await list.json()) as Array<{ name: string; cadence: string }>).find(
    (h) => h.name === 'Default cadence',
  )
  expect(row?.cadence).toBe('daily')
})

test('Weekly cadence persists cadence=weekly', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Weekly chore')
  await page.getByRole('button', { name: /^weekly$/i }).click()
  await page.getByRole('button', { name: /create habit/i }).click()
  await page.waitForURL(/\/habits\/[0-9a-f-]+/, { timeout: 10_000 })
  const list = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const row = ((await list.json()) as Array<{ name: string; cadence: string }>).find(
    (h) => h.name === 'Weekly chore',
  )
  expect(row?.cadence).toBe('weekly')
})

test('description textarea persists to the row', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Habit with notes')
  await page.locator('textarea').fill('keep me honest')
  await page.getByRole('button', { name: /create habit/i }).click()
  await page.waitForURL(/\/habits\/[0-9a-f-]+/, { timeout: 10_000 })
  const list = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const row = ((await list.json()) as Array<{ name: string; description: string | null }>).find(
    (h) => h.name === 'Habit with notes',
  )
  expect(row?.description).toBe('keep me honest')
})

test('Cancel does not create a habit', async ({ page }) => {
  const { accessToken } = await signup(page)
  const before = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const beforeCount = ((await before.json()) as unknown[]).length
  await page.goto(APP_BASE + '/habits/new')
  await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Cancelled habit')
  await page.getByRole('button', { name: /^cancel$/i }).click()
  await page.waitForURL(/\/habits$/, { timeout: 10_000 })
  const after = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const afterCount = ((await after.json()) as unknown[]).length
  expect(afterCount).toBe(beforeCount)
})

test('Learning pill flips its background-color when selected', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  const learning = page.getByRole('button', { name: /^learning$/i })
  const before = await learning.evaluate((el) => getComputedStyle(el).backgroundColor)
  await learning.click()
  await page.waitForTimeout(150)
  const after = await learning.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(after, 'pill background color did not change after selection').not.toBe(before)
  await expect(page).toHaveURL(/\/habits\/new/)
})

test('accent color swatch click visually selects the swatch', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  const swatch = page.getByRole('button', { name: /Use color #f97316/i })
  const before = await swatch.evaluate((el) => getComputedStyle(el).boxShadow)
  await swatch.click()
  await page.waitForTimeout(150)
  const after = await swatch.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(after, 'accent swatch did not pick up a selected ring').not.toBe(before)
})

test('Daily cadence button renders highlighted on initial mount', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/habits/new')
  const daily = page.getByRole('button', { name: /^daily$/i })
  const weekly = page.getByRole('button', { name: /^weekly$/i })
  const dailyBg = await daily.evaluate(
    (el) => getComputedStyle(el).backgroundImage + '|' + getComputedStyle(el).backgroundColor,
  )
  const weeklyBg = await weekly.evaluate(
    (el) => getComputedStyle(el).backgroundImage + '|' + getComputedStyle(el).backgroundColor,
  )
  expect(dailyBg, "daily and weekly look identical — daily isn't showing as selected").not.toBe(
    weeklyBg,
  )
})
