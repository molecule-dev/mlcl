/**
 * MyLearning — authenticated dashboard listing the caller's enrollments.
 *
 *   - The first GET /enrollments seeds 3 demo enrollments for new users
 *     (server-side seedDemoForUser), so the page is never empty for fresh
 *     accounts.
 *   - Each enrolled course tile resolves a "Continue" link to the first
 *     incomplete lesson under /lesson/:id.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authHeaders, signup, uniqueEmail, API_BASE } from './_helpers.js'

test.describe('my-learning', () => {
  test('lists enrollments for a fresh user (auto-seeded)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('mylearn'))
    // First GET seeds the user's demo enrollments server-side.
    const res = await page.request.get(`${API_BASE}/enrollments`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ course_id: string }>
    expect(body.length).toBeGreaterThan(0)
  })

  test('UI renders enrollment cards with continue links', async ({ page }) => {
    await signup(page, uniqueEmail('mylearn-ui'))
    await page.goto(APP_BASE + '/my-learning')
    await page.waitForLoadState('networkidle')
    // Page should not redirect to login.
    expect(page.url()).toContain('/my-learning')
    const cards = page.locator('a[href^="/lesson/"], a[href^="/courses/"]')
    await expect(cards.first()).toBeAttached()
  })
})
