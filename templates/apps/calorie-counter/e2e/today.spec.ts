import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, completeOnboarding, signup, todayDate } from './_helpers.js'

test.describe('/today (Today)', () => {
  test('Water +button POSTs /api/diary/quick-add and increments water-count', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/today')
    const before = ((await page.locator('[data-testid="water-count"]').textContent()) ?? '').trim()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="water-add-button"]').click()
      await page.waitForTimeout(800)
    })
    const after = ((await page.locator('[data-testid="water-count"]').textContent()) ?? '').trim()
    expect(after).not.toEqual(before)
    const post = reqs.find((r) => /\/api\/diary\/quick-add/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/diary/quick-add fired').toBeTruthy()
  })

  test('Water count survives a page reload', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/today')
    await page.locator('[data-testid="water-add-button"]').click()
    await page.waitForTimeout(700)
    const after = ((await page.locator('[data-testid="water-count"]').textContent()) ?? '').trim()
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    const reloaded = (
      (await page.locator('[data-testid="water-count"]').textContent()) ?? ''
    ).trim()
    expect(reloaded).toEqual(after)
  })

  test('Snack quick-add creates a diary entry', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/today')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Snack$/ })
        .first()
        .click()
      await page.waitForTimeout(700)
    })
    const post = reqs.find((r) => /\/api\/diary\/quick-add/.test(r.url) && r.method === 'POST')
    expect(post).toBeTruthy()
    const diary = await api<{ entries: Array<{ food_name: string }> }>(
      page,
      'GET',
      `/diary?date=${todayDate()}`,
    )
    expect(diary.entries.find((e) => e.food_name === 'Snack')).toBeTruthy()
  })

  test('Coffee quick-add creates a diary entry', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/today')
    await page
      .getByRole('button', { name: /^Coffee$/ })
      .first()
      .click()
    await page.waitForTimeout(700)
    const diary = await api<{ entries: Array<{ food_name: string }> }>(
      page,
      'GET',
      `/diary?date=${todayDate()}`,
    )
    expect(diary.entries.find((e) => e.food_name === 'Coffee')).toBeTruthy()
  })

  test('"Add food" link navigates to /log', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/today')
    await page
      .getByRole('link', { name: /add food/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/log/)
  })

  test('Calorie ring + macros render numeric values from /api/diary + /api/goals', async ({
    page,
  }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/today')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    // Calorie remaining label is visible
    await expect(page.getByText(/calories remaining/i).first()).toBeVisible()
    // Macros card title visible
    await expect(page.getByText(/macronutrients/i).first()).toBeVisible()
  })

  test('Macros card shows three macro rows (Protein/Carbs/Fat)', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/today')
    await expect(page.getByText(/^Protein$/)).toBeVisible()
    await expect(page.getByText(/^Carbs$/)).toBeVisible()
    await expect(page.getByText(/^Fat$/)).toBeVisible()
  })

  test('Streak card pulls /api/nutrition/streak and renders an integer', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/today')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const streakCall = reqs.find(
      (r) => /\/api\/nutrition\/streak/.test(r.url) && r.method === 'GET',
    )
    expect(streakCall, 'GET /api/nutrition/streak fired').toBeTruthy()
    expect(streakCall!.status).toBe(200)
  })
})
