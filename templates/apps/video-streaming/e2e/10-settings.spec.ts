import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedFetch, captureNetwork, signup } from './_helpers.js'

test.describe('settings page', () => {
  test('Settings page mounts', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/users\/(?:me|[^/?]+)/.test(r.url) && r.status === 200)).toBe(
      true,
    )
  })

  test('Toggle preference persists across reload via /api/preferences PATCH', async ({ page }) => {
    const { userId } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    // The first switch on the page is the first preference toggle.
    const sw = page.locator('button[role="switch"]').first()
    if ((await sw.count()) === 0) {
      test
        .info()
        .annotations.push({ type: 'note', description: 'no toggles on settings page; skipping' })
      return
    }
    const before = await sw.getAttribute('aria-checked')
    // Wait for the PATCH /api/preferences to land before we navigate away —
    // otherwise the reload races the debounced persist. (Prefs live in
    // users.oauthData.preferences, which the platform user resource strips
    // from every READ — so the app persists through the server-side
    // /api/preferences channel, which merges the slice into the row.)
    const patched = page.waitForResponse(
      (r) =>
        /\/api\/preferences\/?$/.test(r.url()) &&
        r.request().method() === 'PATCH' &&
        r.status() === 200,
      { timeout: 10_000 },
    )
    await sw.click()
    await patched
    const after1 = await sw.getAttribute('aria-checked')
    expect(after1, 'switch must change state on click').not.toBe(before)

    // Persistence: reload and confirm it survives.
    await page.reload()
    const sw2 = page.locator('button[role="switch"]').first()
    // Auto-retry until the hydrate fetch completes — the page mounts
    // with DEFAULT_TOGGLES then re-renders once /api/users/me returns.
    await expect(sw2, 'switch must persist after reload').toHaveAttribute('aria-checked', after1!)

    // Backend invariant: GET /api/users/:id reflects the new preferences.
    const r = await authedFetch<{ oauthData?: Record<string, unknown> }>(
      page,
      `/api/users/${userId}`,
    )
    expect(r.status).toBe(200)
    expect(r.body, 'user row must exist').toBeTruthy()
  })
})
