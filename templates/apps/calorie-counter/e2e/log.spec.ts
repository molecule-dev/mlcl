import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, completeOnboarding, signup, todayDate } from './_helpers.js'

test.describe('/log (LogFood)', () => {
  test('Search input narrows the results list and fires GET /api/foods?q=', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/log')
    await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {})
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type=text]').first().fill('apple')
      await page.waitForTimeout(700)
    })
    const search = reqs.find((r) => /\/api\/foods\?[^"]*q=apple/.test(r.url) && r.method === 'GET')
    expect(search, 'GET /api/foods?q=apple fired').toBeTruthy()
  })

  test('Verified tab fires GET /api/foods?is_verified=true', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/log')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^Verified$/i }).click()
      await page.waitForTimeout(700)
    })
    const search = reqs.find(
      (r) => /\/api\/foods\?[^"]*is_verified=true/.test(r.url) && r.method === 'GET',
    )
    expect(search).toBeTruthy()
  })

  test('My foods tab fires GET /api/foods?is_verified=false', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/log')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^My foods$/i }).click()
      await page.waitForTimeout(700)
    })
    const search = reqs.find(
      (r) => /\/api\/foods\?[^"]*is_verified=false/.test(r.url) && r.method === 'GET',
    )
    expect(search).toBeTruthy()
  })

  test('Selecting Breakfast meal tab keeps page interactive (style toggles)', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/log')
    const breakfast = page.getByRole('button', { name: /^Breakfast$/ }).first()
    await breakfast.click()
    await expect(breakfast).toHaveClass(/text-accent/)
  })

  test('Add (+) on a verified food row creates a diary entry', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/log')
    await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {})
    const addBtn = page.getByRole('button', { name: /^Add /i }).first()
    await addBtn.waitFor({ timeout: 8_000 })
    const reqs = await captureNetwork(page, async () => {
      await addBtn.click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find((c) => c.method === 'POST' && /\/api\/diary($|\?)/.test(c.url))
    expect(post, 'POST /api/diary fired').toBeTruthy()
    expect(post!.status).toBe(201)
    const diary = await api<{ entries: Array<unknown>; totals: { calories: number } }>(
      page,
      'GET',
      `/diary?date=${todayDate()}`,
    )
    expect(diary.entries.length).toBeGreaterThanOrEqual(1)
    expect(diary.totals.calories).toBeGreaterThan(0)
  })

  test('Quick-Add Water button POSTs /api/diary/quick-add', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/log')
    await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {})
    const reqs = await captureNetwork(page, async () => {
      // Quick-add Water lives in the right rail and is the first one
      await page
        .getByRole('button', { name: /^Water$/i })
        .first()
        .click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find((c) => c.method === 'POST' && /\/api\/diary\/quick-add/.test(c.url))
    expect(post, 'POST /api/diary/quick-add fired').toBeTruthy()
  })

  test('Recent today list shows added entry after a /api/diary post', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/log')
    await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {})
    const food = await api<Array<{ id: string; name: string }>>(
      page,
      'GET',
      '/foods?limit=1&is_verified=true',
    )
    expect(food.length).toBeGreaterThan(0)
    await api(page, 'POST', '/diary', {
      date: todayDate(),
      meal_type: 'lunch',
      food_id: food[0].id,
      food_name: food[0].name,
      servings: 1,
      serving_unit: 'serving',
      calories: 100,
      protein: 5,
      carbs: 10,
      fat: 2,
    })
    await page.reload()
    await page.waitForTimeout(800)
    await expect(page.getByText(food[0].name).first()).toBeVisible({ timeout: 8_000 })
  })
})
