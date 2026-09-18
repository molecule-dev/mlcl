import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/settings', () => {
  test('renders pref controls', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByText(/Target language/i).first()).toBeVisible()
    await expect(page.getByText(/Daily goal/i).first()).toBeVisible()
    await expect(page.getByText(/Notifications/i).first()).toBeVisible()
  })

  test('changing target language fires PATCH and persists across reload', async ({
    page,
    request,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="lang-fr"]').click()
      await page.waitForTimeout(1500)
    })
    const patch = whereUrl(reqs, /\/api\/users\/me\/preferences/, 'PATCH')
    expect(patch.length, 'PATCH /api/users/me/preferences fired').toBeGreaterThan(0)
    expect(patch[0].status, 'PATCH status').toBe(200)

    // Backend invariant: GET preferences returns target_languages with 'fr'.
    const api = authedApi(request, accessToken!)
    const after = await api.get('/users/me/preferences')
    const body = (await after.json()) as { target_languages: string[] }
    expect(body.target_languages, 'target_languages persisted').toContain('fr')

    // Reload — French is still selected.
    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    await expect(page.locator('[data-testid="lang-fr"]')).toHaveAttribute('aria-pressed', 'true')
  })

  test('changing daily goal persists across reload', async ({ page, request }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

    await page.locator('[data-testid="goal-150"]').click()
    await page.waitForTimeout(1500)

    const api = authedApi(request, accessToken!)
    const after = await api.get('/users/me/preferences')
    const body = (await after.json()) as { daily_goal_xp: number }
    expect(Number(body.daily_goal_xp), 'daily_goal_xp persisted').toBe(150)

    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    await expect(page.locator('[data-testid="goal-150"]')).toHaveAttribute('aria-pressed', 'true')
  })

  test('toggling reminder switch persists', async ({ page, request }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

    const toggle = page.locator('[data-testid="settings-toggle-reminder"]')
    const initial = await toggle.getAttribute('aria-checked')
    await toggle.scrollIntoViewIfNeeded()
    await toggle.click()
    await page.waitForTimeout(1500)

    const api = authedApi(request, accessToken!)
    const after = await api.get('/users/me/preferences')
    const body = (await after.json()) as { reminder_enabled: boolean }
    expect(String(body.reminder_enabled), 'reminder_enabled flipped').not.toBe(initial)
  })
})
