import { test, expect } from '@molecule/app-e2e-fixtures-default'
import * as fs from 'node:fs'

import { signup, API_BASE, captureNetwork } from './_helpers.js'

test.describe('records leaderboard', () => {
  test('PR filter narrows the table to a single kind and "All" restores the full set', async ({
    page,
  }) => {
    await signup(page)

    // Seed: complete a workout via API so a 1RM-estimated record gets auto-recorded.
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const exResp = await page.request.get(`${API_BASE}/exercises`, {
      headers: { Cookie: cookieHeader },
    })
    expect(exResp.status()).toBe(200)
    const exercises = await exResp.json()
    expect(exercises.length).toBeGreaterThan(0)
    const exId = exercises[0].id
    const wRes = await page.request.post(`${API_BASE}/workouts`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { name: 'Filter Seed' },
    })
    const w = await wRes.json()
    await page.request.post(`${API_BASE}/workouts/${w.id}/sets`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        exercise_id: exId,
        weight: 80,
        weight_kg: 80,
        weight_unit: 'kg',
        reps: 5,
        set_index: 0,
      },
    })
    await page.request.post(`${API_BASE}/workouts/${w.id}/complete`, {
      headers: { Cookie: cookieHeader },
    })

    // GET /records returns at least one record (kind 1rm_estimated).
    const recordsResp = await page.request.get(`${API_BASE}/records`, {
      headers: { Cookie: cookieHeader },
    })
    expect(recordsResp.status()).toBe(200)
    const records = await recordsResp.json()
    expect(records.length).toBeGreaterThan(0)
    const kinds = new Set(records.map((r: { kind: string }) => r.kind))
    expect(kinds.has('1rm_estimated')).toBe(true)

    await page.goto('/records')
    await page.waitForLoadState('networkidle').catch(() => null)
    await page.getByRole('button', { name: /^filter$/i }).click()

    // Default "All" filter shows N records.
    const all = await page.locator('table tbody tr').count()
    expect(all).toBeGreaterThan(0)

    // Click "5RM" — there should be 0 records since no 5RM was recorded.
    await page.getByRole('button', { name: /^5RM$/i }).click()
    await page.waitForTimeout(300)
    expect(await page.locator('table tbody tr').count()).toBe(0)

    // Restore "All" — same N back.
    await page.getByRole('button', { name: /^all$/i }).click()
    await page.waitForTimeout(300)
    expect(await page.locator('table tbody tr').count()).toBe(all)
  })
})

test.describe('history CSV export', () => {
  test('Export CSV downloads a real file containing the completed workout volume', async ({
    page,
  }) => {
    await signup(page)

    // Seed one completed workout so there's something to export.
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const exResp = await page.request.get(`${API_BASE}/exercises`, {
      headers: { Cookie: cookieHeader },
    })
    const exId = (await exResp.json())[0].id
    const wRes = await page.request.post(`${API_BASE}/workouts`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { name: 'CSV Export Seed' },
    })
    const w = await wRes.json()
    await page.request.post(`${API_BASE}/workouts/${w.id}/sets`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        exercise_id: exId,
        weight: 100,
        weight_kg: 100,
        weight_unit: 'kg',
        reps: 5,
        set_index: 0,
      },
    })
    await page.request.post(`${API_BASE}/workouts/${w.id}/complete`, {
      headers: { Cookie: cookieHeader },
    })

    await page.goto('/history')
    await page.waitForLoadState('networkidle').catch(() => null)

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 })
    await page.getByTestId('export-csv').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^workout-history-\d{4}-\d{2}-\d{2}\.csv$/)
    const path = await download.path()
    expect(path).toBeTruthy()
    const contents = fs.readFileSync(path!, 'utf8')
    expect(contents).toContain('Date,Workout,Volume,Unit,Duration (min),Sets')
    // 100 × 5 = 500 kg total volume should appear in the file.
    expect(contents).toMatch(/CSV Export Seed/i)
    expect(contents).toContain('500')
    expect(contents).toContain('kg')
  })
})

test.describe('repeat workout', () => {
  test('clicking Repeat workout creates a new in_progress workout and navigates to /workout/active', async ({
    page,
  }) => {
    await signup(page)

    // Seed a completed workout to repeat.
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const exResp = await page.request.get(`${API_BASE}/exercises`, {
      headers: { Cookie: cookieHeader },
    })
    const exId = (await exResp.json())[0].id
    const wRes = await page.request.post(`${API_BASE}/workouts`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { name: 'Source Workout' },
    })
    const w = await wRes.json()
    await page.request.post(`${API_BASE}/workouts/${w.id}/sets`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        exercise_id: exId,
        weight: 60,
        weight_kg: 60,
        weight_unit: 'kg',
        reps: 10,
        set_index: 0,
      },
    })
    await page.request.post(`${API_BASE}/workouts/${w.id}/complete`, {
      headers: { Cookie: cookieHeader },
    })

    await page.goto(`/history/${w.id}`)
    await page.waitForLoadState('networkidle').catch(() => null)
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('repeat-workout').click()
      await page.waitForURL(/\/workout\/active/, { timeout: 15000 })
    })
    const newWorkoutPost = reqs.find(
      (r) => /\/api\/workouts(?:\?|$|\/repeat)/.test(r.url) && r.method === 'POST',
    )
    expect(newWorkoutPost, 'POST /api/workouts (repeat) was not observed').toBeTruthy()
    expect(newWorkoutPost!.status).toBeLessThan(300)

    // Read-after-write: GET /workouts/active now returns a NEW workout (different id, in_progress).
    const activeResp = await page.request.get(`${API_BASE}/workouts/active`, {
      headers: { Cookie: cookieHeader },
    })
    expect(activeResp.status()).toBe(200)
    const active = await activeResp.json()
    expect(active).toBeTruthy()
    expect(active.id).not.toBe(w.id)
    expect(active.status).toBe('in_progress')
  })
})

test.describe('exercise detail page', () => {
  test('renders the exercise stats triad and the recent-sessions table after a logged session', async ({
    page,
  }) => {
    await signup(page)

    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const exResp = await page.request.get(`${API_BASE}/exercises`, {
      headers: { Cookie: cookieHeader },
    })
    const exercises = await exResp.json()
    const ex = exercises[0]
    const wRes = await page.request.post(`${API_BASE}/workouts`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { name: 'ExDetail Seed' },
    })
    const w = await wRes.json()
    await page.request.post(`${API_BASE}/workouts/${w.id}/sets`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        exercise_id: ex.id,
        weight: 90,
        weight_kg: 90,
        weight_unit: 'kg',
        reps: 5,
        set_index: 0,
      },
    })
    await page.request.post(`${API_BASE}/workouts/${w.id}/complete`, {
      headers: { Cookie: cookieHeader },
    })

    await page.goto(`/exercises/${ex.id}`)
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByRole('heading', { name: new RegExp(ex.name, 'i') }).first()).toBeVisible(
      { timeout: 15000 },
    )
    // Best est. 1RM card — Epley(90, 5) ≈ 105 kg
    await expect(page.getByText(/best est\.\s*1RM/i).first()).toBeVisible()
    await expect(page.getByText(/105\s*kg/i).first()).toBeVisible({ timeout: 15000 })
    // Recent sessions table includes the session row showing 90 × 5
    await expect(page.getByText(/90\s*×\s*5/i).first()).toBeVisible({ timeout: 15000 })
  })
})

test.describe('active workout — set deletion', () => {
  test('deleting a logged set updates the total volume and persists across reload', async ({
    page,
  }) => {
    await signup(page)

    await page.goto('/workout/active')
    await page.waitForLoadState('networkidle').catch(() => null)
    const startBtn = page.getByTestId('start-workout')
    if (await startBtn.count().catch(() => 0)) await startBtn.click()
    await expect(page.getByTestId('set-composer')).toBeVisible({ timeout: 15000 })

    const select = page.getByTestId('exercise-select')
    const optionValues = await select
      .locator('option')
      .evaluateAll((opts) => (opts as HTMLOptionElement[]).map((o) => o.value).filter(Boolean))
    expect(optionValues.length).toBeGreaterThan(0)

    // Add two sets: 100 × 5 + 100 × 3 = 800 kg total
    await select.selectOption(optionValues[0])
    await page.getByTestId('set-weight').fill('100')
    await page.getByTestId('set-reps').fill('5')
    await page.getByTestId('add-set').click()
    await expect(page.getByTestId('logged-set').first()).toBeVisible({ timeout: 15000 })

    await select.selectOption(optionValues[0])
    await page.getByTestId('set-weight').fill('100')
    await page.getByTestId('set-reps').fill('3')
    await page.getByTestId('add-set').click()
    await expect(page.getByTestId('logged-set').nth(1)).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('total-volume')).toContainText('800', { timeout: 15000 })

    // Delete the second set — total should drop to 500.
    await page.getByTestId('delete-set').nth(1).click()
    await expect(page.getByTestId('total-volume')).toContainText('500', { timeout: 15000 })
    await expect(page.getByTestId('logged-set')).toHaveCount(1, { timeout: 15000 })

    // Reload — only one set remains and total is still 500.
    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByTestId('logged-set')).toHaveCount(1, { timeout: 15000 })
    await expect(page.getByTestId('total-volume')).toContainText('500', { timeout: 15000 })
  })
})

test.describe('dashboard recent workouts', () => {
  test('after completing a workout, the dashboard "recent workouts" section shows it', async ({
    page,
  }) => {
    await signup(page)

    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const exResp = await page.request.get(`${API_BASE}/exercises`, {
      headers: { Cookie: cookieHeader },
    })
    const exId = (await exResp.json())[0].id
    const unique = `Dash-${Date.now()}`
    const wRes = await page.request.post(`${API_BASE}/workouts`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { name: unique },
    })
    const w = await wRes.json()
    await page.request.post(`${API_BASE}/workouts/${w.id}/sets`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        exercise_id: exId,
        weight: 50,
        weight_kg: 50,
        weight_unit: 'kg',
        reps: 5,
        set_index: 0,
      },
    })
    await page.request.post(`${API_BASE}/workouts/${w.id}/complete`, {
      headers: { Cookie: cookieHeader },
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByText(unique).first()).toBeVisible({ timeout: 15000 })
  })
})

test.describe('not-found route', () => {
  test('visiting an unknown path renders the 404 page with a link back', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByRole('heading', { name: /no bar here|not found|404/i })).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByRole('link', { name: /back to dashboard|dashboard/i }).first(),
    ).toBeVisible()
  })
})
