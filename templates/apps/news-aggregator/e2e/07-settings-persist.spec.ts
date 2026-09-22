import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessTokenFromPage, signup, uniqueEmail } from './_helpers.js'

/** Fetch /api/preferences with the live JWT from localStorage, returning the
 * persisted preference object. Confirms the server actually stored the
 * write — the toggle's aria-checked state alone could be locally cached.
 *
 * Preferences round-trip through the app's own server-side channel
 * (GET/PATCH /api/preferences): the platform user resource never returns
 * `oauthData` on reads, so the old `/api/users/me` → `props.oauthData`
 * read-back could never work. */
async function readPrefsFromServer(
  page: import('@playwright/test').Page,
): Promise<Record<string, unknown> | undefined> {
  const token = await getAccessTokenFromPage(page)
  expect(token, 'JWT must be present after signup').toBeTruthy()
  const prefs = await page.evaluate(async (jwt) => {
    const resp = await fetch('/api/preferences', { headers: { Authorization: `Bearer ${jwt}` } })
    return (await resp.json()) as Record<string, unknown>
  }, token)
  return prefs
}

test.describe('settings persistence', () => {
  test('toggling Daily digest persists via PATCH /api/preferences and survives reload', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('na-settings'))
    await page.goto(APP_BASE + '/settings')

    const dailyToggle = page.locator('#setting-daily')
    await expect(dailyToggle).toBeVisible()
    await expect(dailyToggle).toHaveAttribute('aria-checked', 'true')

    // Arm the wait BEFORE the click — http.patch resolves fast enough that
    // "click then waitForResponse" races and misses the PATCH in headless runs.
    const [patchResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/preferences') && r.request().method() === 'PATCH',
      ),
      dailyToggle.click(),
    ])
    expect(patchResp.status()).toBeGreaterThanOrEqual(200)
    expect(patchResp.status()).toBeLessThan(300)
    await expect(dailyToggle).toHaveAttribute('aria-checked', 'false')

    // Read-after-write: GET /api/preferences reflects the new preference.
    const prefs = await readPrefsFromServer(page)
    expect(prefs?.dailyDigest).toBe(false)

    // Reload — UI shows the persisted state (armed before the reload; the
    // SPA's mount fetch can complete before the load event fires).
    const reloadGet = page.waitForResponse(
      (r) => r.url().endsWith('/api/preferences') && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.reload()
    await reloadGet
    const dailyToggleAfter = page.locator('#setting-daily')
    await expect(dailyToggleAfter).toHaveAttribute('aria-checked', 'false')
  })

  test('toggling Show bias meters persists', async ({ page }) => {
    await signup(page, uniqueEmail('na-bias-toggle'))
    await page.goto(APP_BASE + '/settings')

    const meters = page.locator('#setting-bias-meters')
    await expect(meters).toBeVisible()
    // Arm the response listener BEFORE clicking — http.patch resolves
    // synchronously enough that "click then waitForResponse" races and
    // misses the PATCH in headless runs.
    const [patchResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/preferences') && r.request().method() === 'PATCH',
      ),
      meters.click(),
    ])
    expect(patchResp.status()).toBeGreaterThanOrEqual(200)
    expect(patchResp.status()).toBeLessThan(300)

    const prefs = await readPrefsFromServer(page)
    expect(prefs?.showBiasMeters).toBe(false)
  })
})
