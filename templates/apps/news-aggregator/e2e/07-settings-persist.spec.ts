import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessTokenFromPage, signup, uniqueEmail } from './_helpers.js'

/** Fetch /api/users/me with the live JWT from localStorage, returning the
 * persisted preferences blob. Confirms the server actually stored the
 * write — the toggle's aria-checked state alone could be locally cached. */
async function readPrefsFromServer(
  page: import('@playwright/test').Page,
): Promise<Record<string, unknown> | undefined> {
  const token = await getAccessTokenFromPage(page)
  expect(token, 'JWT must be present after signup').toBeTruthy()
  const me = await page.evaluate(async (jwt) => {
    const resp = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${jwt}` } })
    return (await resp.json()) as {
      props?: { oauthData?: { preferences?: Record<string, unknown> } }
    }
  }, token)
  return me.props?.oauthData?.preferences
}

test.describe('settings persistence', () => {
  test('toggling Daily digest persists via PATCH /api/users/:id and survives reload', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('na-settings'))
    await page.goto(APP_BASE + '/settings')

    const dailyToggle = page.locator('#setting-daily')
    await expect(dailyToggle).toBeVisible()
    const initial = await dailyToggle.getAttribute('aria-checked')
    expect(initial).toBe('true')

    const [patchResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/users\//.test(r.url()) && r.request().method() === 'PATCH',
      ),
      dailyToggle.click(),
    ])
    expect(patchResp.status()).toBeGreaterThanOrEqual(200)
    expect(patchResp.status()).toBeLessThan(300)
    await expect(dailyToggle).toHaveAttribute('aria-checked', 'false')

    // Read-after-write: GET /api/users/me reflects the new preference.
    const prefs = await readPrefsFromServer(page)
    expect(prefs?.dailyDigest).toBe(false)

    // Reload — UI shows the persisted state.
    await page.reload()
    await page.waitForResponse(
      (r) => /\/api\/users\//.test(r.url()) && r.request().method() === 'GET',
    )
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
        (r) => /\/api\/users\//.test(r.url()) && r.request().method() === 'PATCH',
      ),
      meters.click(),
    ])
    expect(patchResp.status()).toBeGreaterThanOrEqual(200)
    expect(patchResp.status()).toBeLessThan(300)

    const prefs = await readPrefsFromServer(page)
    expect(prefs?.showBiasMeters).toBe(false)
  })
})
