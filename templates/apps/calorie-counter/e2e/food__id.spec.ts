import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, completeOnboarding, signup, todayDate } from './_helpers.js'

test.describe('/food/:id (FoodDetail)', () => {
  async function ensureFood(page: import('@playwright/test').Page) {
    await signup(page)
    await completeOnboarding(page)
    const foods = await api<Array<{ id: string; name: string; calories: number | string }>>(
      page,
      'GET',
      '/foods?limit=1&is_verified=true',
    )
    expect(foods.length, 'no verified foods returned').toBeGreaterThan(0)
    return foods[0]
  }

  test('Hero renders food name from GET /api/foods/:id', async ({ page }) => {
    const food = await ensureFood(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/food/${food.id}`)
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const get = reqs.find((r) => r.url.includes(`/api/foods/${food.id}`) && r.method === 'GET')
    expect(get, 'GET /api/foods/:id fired').toBeTruthy()
    await expect(page.getByRole('heading', { name: new RegExp(food.name, 'i') })).toBeVisible()
  })

  test('Servings input scales the displayed calories', async ({ page }) => {
    const food = await ensureFood(page)
    await page.goto(`${APP_BASE}/food/${food.id}`)
    await page.waitForTimeout(500)
    // The kcal display renders Math.round(calories * servings); read the
    // hero number directly (text-6xl span before the `kcal` label).
    const heroNum = () =>
      page.evaluate(() => {
        const main = document.querySelector('main')
        if (!main) return 0
        const candidates = Array.from(main.querySelectorAll('span'))
          .filter((s) => s.className.includes('text-6xl'))
          .map((s) => Number((s.textContent || '').replace(/[^0-9]/g, '')))
          .filter((n) => Number.isFinite(n) && n > 0)
        return candidates[0] ?? 0
      })
    const before = await heroNum()
    expect(before).toBeGreaterThan(0)
    await page.locator('#serving-count').fill('2')
    await page.waitForTimeout(400)
    const after = await heroNum()
    expect(after).toBeGreaterThan(before)
  })

  test('Add to Lunch creates a /api/diary entry', async ({ page }) => {
    const food = await ensureFood(page)
    await page.goto(`${APP_BASE}/food/${food.id}`)
    await page.waitForTimeout(500)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Lunch$/i })
        .first()
        .click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find((r) => /\/api\/diary($|\?)/.test(r.url) && r.method === 'POST')
    expect(post).toBeTruthy()
    const diary = await api<{ entries: Array<{ food_name: string }> }>(
      page,
      'GET',
      `/diary?date=${todayDate()}`,
    )
    expect(diary.entries.find((e) => e.food_name === food.name)).toBeTruthy()
  })

  test('"Add to diary" top-right button creates a diary entry', async ({ page }) => {
    const food = await ensureFood(page)
    await page.goto(`${APP_BASE}/food/${food.id}`)
    await page.waitForTimeout(500)
    await page
      .getByRole('button', { name: /add to diary/i })
      .first()
      .click()
    await page.waitForTimeout(800)
    const diary = await api<{ entries: Array<{ food_name: string }> }>(
      page,
      'GET',
      `/diary?date=${todayDate()}`,
    )
    expect(diary.entries.find((e) => e.food_name === food.name)).toBeTruthy()
  })

  test('Back to results returns to /log', async ({ page }) => {
    const food = await ensureFood(page)
    await page.goto(`${APP_BASE}/log`)
    await page.goto(`${APP_BASE}/food/${food.id}`)
    await page
      .getByRole('button', { name: /back to results/i })
      .first()
      .click()
    await page.waitForTimeout(500)
    expect(page.url()).toMatch(/\/log/)
  })
})
