import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedApi,
  captureNetwork,
  getFirstLessonIdViaApi,
  signup,
  whereUrl,
} from './_helpers.js'

test.describe('/profile', () => {
  test('renders the user name and email from auth state', async ({ page }) => {
    const { name, email } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    await expect(page.getByTestId('profile-name')).toContainText(new RegExp(name, 'i'))
    await expect(page.getByText(email)).toBeVisible()
  })

  test('GET /api/courses fires on profile load (course catalog hydration)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const calls = whereUrl(reqs, /\/api\/courses(?:\?|$)/, 'GET')
    expect(calls.length, 'GET /api/courses fired').toBeGreaterThan(0)
    expect(calls[0].status, 'courses status').toBe(200)
  })

  test('total XP reflects backend after lesson completion (read-after-write)', async ({
    page,
    request,
  }) => {
    const { accessToken, userId } = await signup(page)
    const api = authedApi(request, accessToken!)
    // Complete whichever lesson the catalog holds — a seeded lesson id would
    // stop existing as soon as the demo course is replaced.
    const lessonId = await getFirstLessonIdViaApi(api)
    const completeRes = await api.post(`/progress/user/${userId}/complete-lesson`, {
      lesson_id: lessonId,
      xp_earned: 80,
    })
    expect(completeRes.status()).toBe(200)
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    await expect(page.getByTestId('profile-total-xp')).toContainText(/\b80\b/)
  })

  test('first-lesson achievement unlocks after one completion', async ({ page, request }) => {
    const { accessToken, userId } = await signup(page)
    const api = authedApi(request, accessToken!)
    const lessonId = await getFirstLessonIdViaApi(api)
    await api.post(`/progress/user/${userId}/complete-lesson`, {
      lesson_id: lessonId,
      xp_earned: 40,
    })
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    await expect(page.getByTestId('achievement-first_lesson')).toBeVisible()
  })
})
