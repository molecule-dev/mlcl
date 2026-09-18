import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, num, signup } from './_helpers.js'

test.describe('/onboarding (Onboarding)', () => {
  test('Continue advances from welcome step to "What\'s your goal?"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/onboarding')
    await page.getByRole('button', { name: /continue/i }).click()
    await expect(page.getByRole('heading', { name: /goal/i })).toBeVisible()
  })

  test('Goal buttons select and apply selected style', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/onboarding')
    await page.getByRole('button', { name: /continue/i }).click()
    const lose = page.getByRole('button', { name: /lose weight/i })
    await lose.click()
    // Selected state changes the border colour — assert that class string
    // contains the selected token.
    await expect(lose).toHaveClass(/border-primary/)
  })

  test('Activity buttons select and apply selected style', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/onboarding')
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /maintain/i }).click()
    await page.getByRole('button', { name: /continue/i }).click()
    const active = page.locator('button', { hasText: /^directions_runActive/ }).first()
    await active.click()
    await expect(active).toHaveClass(/border-primary/)
  })

  test('Finish persists goals via POST /api/goals + redirects to /today', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/onboarding')
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /maintain/i }).click()
    await page.getByRole('button', { name: /continue/i }).click()
    await page
      .locator('button', { hasText: /^directions_runActive/ })
      .first()
      .click()
    await page.getByRole('button', { name: /continue/i }).click()
    const calText = await page.locator('[data-testid="onboarding-calories"]').textContent()
    const calNum = Number((calText ?? '').replace(/[^0-9]/g, ''))
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="onboarding-finish"]').click()
      await page.waitForURL(/\/today/, { timeout: 15_000 })
    })
    const post = reqs.find((r) => /\/api\/goals/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/goals fired').toBeTruthy()
    const goals = await api<{ calories: number | string; protein: number | string }>(
      page,
      'GET',
      '/goals',
    )
    expect(num(goals.calories)).toBe(calNum)
  })

  test('Macros step shows non-zero computed calorie target', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/onboarding')
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /continue/i }).click()
      await page.waitForTimeout(150)
    }
    const t = await page.locator('[data-testid="onboarding-calories"]').textContent()
    const n = Number((t ?? '').replace(/[^0-9]/g, ''))
    expect(n).toBeGreaterThan(1500)
    expect(n).toBeLessThan(3500)
  })

  test('Back button is disabled on first step and enabled after Continue', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/onboarding')
    await expect(page.getByRole('button', { name: /^back$/i })).toBeDisabled()
    await page.getByRole('button', { name: /continue/i }).click()
    await expect(page.getByRole('button', { name: /^back$/i })).toBeEnabled()
  })
})
