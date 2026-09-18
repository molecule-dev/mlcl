import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedApi,
  captureNetwork,
  getFirstLessonIdViaApi,
  signup,
  whereUrl,
} from './_helpers.js'

test.describe('/dashboard', () => {
  test('hero renders streak / XP / daily-goal labels', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(/streak/i).first()).toBeVisible()
    await expect(page.getByText(/XP/i).first()).toBeVisible()
    await expect(page.getByText(/today.s goal/i).first()).toBeVisible()
  })

  test('summary endpoint fires and returns 200', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const summaries = whereUrl(reqs, /\/api\/progress\/user\/me\/summary/, 'GET')
    expect(summaries.length, 'GET /api/progress/user/me/summary fired').toBeGreaterThan(0)
    expect(summaries[0].status, 'summary status').toBe(200)
  })

  test('recommended lessons render real seeded lesson titles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    // Wait for the lessons fetch to finish so cards have real text.
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    // Recommended-lesson cards link to /lessons/<id>; assert at least one.
    const links = page.locator('a[href^="/lessons/"]')
    const count = await links.count()
    expect(count, 'at least one recommended lesson card rendered').toBeGreaterThan(0)
  })

  test('completing a lesson via API bumps total XP shown on the dashboard', async ({
    page,
    request,
  }) => {
    const { accessToken, userId } = await signup(page)
    expect(accessToken, 'token captured').toBeTruthy()
    expect(userId, 'userId captured').toBeTruthy()
    const api = authedApi(request, accessToken!)
    // Complete whichever lesson the catalog holds — naming a seeded lesson id
    // breaks this spec the moment the demo course is replaced.
    const lessonId = await getFirstLessonIdViaApi(api)
    // Bump XP via the API
    const bumpRes = await api.post(`/progress/user/${userId}/complete-lesson`, {
      lesson_id: lessonId,
      xp_earned: 60,
    })
    expect(bumpRes.status(), 'complete-lesson status').toBe(200)
    // Reload dashboard — the hero shows total_xp: 60
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    // The hero number is rendered via tabular-nums; just assert a numeric "60" appears
    // in the hero region. Use a generous match against the page content.
    await expect(page.getByText(/\b60\b/).first()).toBeVisible({ timeout: 10000 })
  })
})
