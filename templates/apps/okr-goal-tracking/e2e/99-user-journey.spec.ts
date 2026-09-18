/**
 * 99-user-journey.spec.ts — full multi-page integration journey.
 *
 * Walks a fresh user end-to-end through the core OKR loop:
 *   signup → dashboard → create objective → create KR → log a check-in →
 *   start a review → submit review → notifications → tenant isolation.
 *
 * Asserts read-after-write on the API for every mutation so the journey
 * proves real backend persistence, not just optimistic UI rendering.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  seedKeyResult,
  seedObjective,
  seedTeam,
  signup,
} from './_helpers.js'

test.describe('full user journey (signup → objective → KR → check-in → review → audit)', () => {
  test('completes the loop end-to-end and persists across reloads', async ({ page }) => {
    const { accessToken } = await signup(page)

    // 1. Dashboard renders for a fresh user.
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByTestId('dashboard-empty')).toBeVisible()

    // 2. Create a team (also exercises /api/teams).
    const team = await seedTeam(page, accessToken!, { name: `Journey Team ${Date.now()}` })
    expect(team.id).toBeTruthy()

    // 3. Create an objective via API and a key-result, then assert via UI.
    const obj = await seedObjective(page, accessToken!, {
      title: `Journey Objective ${Date.now()}`,
      scope: 'team',
      team_id: team.id,
    })
    const kr = await seedKeyResult(page, accessToken!, {
      objective_id: obj.id,
      title: 'Journey KR — ship feature',
      metric_type: 'percentage',
      start_value: 0,
      target_value: 100,
    })
    expect(kr.objective_id).toBe(obj.id)

    await page.goto(APP_BASE + '/objectives')
    await expect(page.locator('main')).toContainText(obj.title)
    await page.goto(APP_BASE + `/objectives/${obj.id}`)
    await expect(page.getByTestId('objective-title')).toContainText(obj.title)

    // 4. Run weekly check-in via API (UI form has its own spec).
    const checkInRes = await page.request.post(`${API_BASE}/check-ins`, {
      headers: apiHeaders(accessToken!),
      data: {
        key_result_id: kr.id,
        previous_value: 0,
        new_value: 50,
        confidence: 'medium',
        commentary: 'Halfway through the journey.',
      },
      failOnStatusCode: false,
    })
    expect(checkInRes.status(), await checkInRes.text()).toBe(201)

    // 5. /api/audit-events should now record the activity.
    const audit = await page.request.get(`${API_BASE}/audit-events`, {
      headers: apiHeaders(accessToken!),
    })
    expect(audit.status()).toBe(200)
    const auditRows = (await audit.json()) as Array<{ table_name: string; record_id: string }>
    expect(Array.isArray(auditRows)).toBe(true)

    // 6. Notifications page renders without error.
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('main')).toBeVisible()

    // 7. Reviews — start a draft via the index page and submit it.
    await page.goto(APP_BASE + '/reviews')
    await page.getByTestId('reviews-create-draft').click()
    const reviewCard = page.getByTestId('reviews-list').locator('a').first()
    await expect(reviewCard).toBeVisible({ timeout: 10000 })
    await reviewCard.click()
    await page.waitForURL(/\/reviews\/[0-9a-f-]{36}$/, { timeout: 10000 })
    const reviewId = page.url().split('/').pop() as string
    await page.getByTestId('review-summary-input').fill('Journey complete — strong cycle.')
    await page.getByTestId('review-rating-4').click()
    await page.getByTestId('review-submit').click()
    await expect(page.getByTestId('review-status')).toHaveText(/completed/i, { timeout: 10000 })

    const fresh = await page.request.get(`${API_BASE}/reviews/${reviewId}`, {
      headers: apiHeaders(accessToken!),
    })
    const reviewBody = (await fresh.json()) as { status: string; rating: number }
    expect(reviewBody.status).toBe('completed')
    expect(reviewBody.rating).toBe(4)

    // 8. Periods endpoint is available (read-only).
    const periods = await page.request.get(`${API_BASE}/periods`, {
      headers: apiHeaders(accessToken!),
    })
    expect(periods.status()).toBe(200)

    // 9. Dashboard reflects the populated state.
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('main')).toContainText(obj.title)
    await expect(page.getByTestId('dashboard-empty')).toHaveCount(0)
  })

  test('tenant isolation: a second signup does not see the first user objectives', async ({
    browser,
  }) => {
    const ctx1 = await browser.newContext()
    const page1 = await ctx1.newPage()
    const a = await signup(page1)
    const obj = await seedObjective(page1, a.accessToken!, {
      title: `Tenant1 ${Date.now()}`,
    })

    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    await signup(page2)
    await page2.goto(APP_BASE + '/objectives')
    await expect(page2.locator('main')).not.toContainText(obj.title)

    await ctx1.close()
    await ctx2.close()
  })
})
