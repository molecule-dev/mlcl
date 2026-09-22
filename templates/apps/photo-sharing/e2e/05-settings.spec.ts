import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('settings', () => {
  test('PATCH /preferences round-trips photoPrefs; PATCH /users/:id round-trips name', async ({
    page,
  }) => {
    await signup(page)
    // Poll GET /users/me until it returns 200 — under parallel audit load,
    // the first raw page.request.get() fired right after signup can hit a
    // transient ECONNRESET while the API socket settles. Retrying with a
    // short poll budget is deterministic and adds <1s on happy paths.
    let meBefore: { props: { id: string } } | undefined
    await expect
      .poll(
        async () => {
          try {
            const res = await page.request.get(`${API_BASE}/users/me`)
            if (res.ok()) {
              meBefore = await res.json()
              return res.status()
            }
            return res.status()
          } catch {
            return 0
          }
        },
        { timeout: 10_000, intervals: [100, 250, 500, 1000] },
      )
      .toBe(200)
    const userId = meBefore!.props.id
    // The platform user resource NEVER returns oauthData on reads (GET
    // /users/me strips it), so prefs ride the server-side /preferences
    // channel — the same channel the Settings page uses. A PATCH with a
    // PARTIAL slice must not clear the keys it omits.
    const upd = await page.request.patch(`${API_BASE}/preferences`, {
      data: { showExif: true, publicProfile: false },
      headers: { 'content-type': 'application/json' },
    })
    expect(upd.status()).toBeLessThan(300)
    const prefsAfter = await (await page.request.get(`${API_BASE}/preferences`)).json()
    expect(prefsAfter.photoPrefs.showExif).toBe(true)
    expect(prefsAfter.photoPrefs.publicProfile).toBe(false)
    // Untouched keys survive the partial patch (merged, not replaced).
    expect(prefsAfter.photoPrefs.notifyFeatured).toBe(true)
    // Partial-slice survival: write a second key, first two stay.
    const upd2 = await page.request.patch(`${API_BASE}/preferences`, {
      data: { weeklyDigest: false },
      headers: { 'content-type': 'application/json' },
    })
    expect(upd2.status()).toBeLessThan(300)
    const prefsAfter2 = await (await page.request.get(`${API_BASE}/preferences`)).json()
    expect(prefsAfter2.photoPrefs.showExif).toBe(true)
    expect(prefsAfter2.photoPrefs.publicProfile).toBe(false)
    expect(prefsAfter2.photoPrefs.weeklyDigest).toBe(false)
    // Name still round-trips through the platform user resource.
    const nameUpd = await page.request.patch(`${API_BASE}/users/${userId}`, {
      data: { name: 'New Display Name' },
      headers: { 'content-type': 'application/json' },
    })
    expect(nameUpd.status()).toBeLessThan(300)
    let meAfter: { props: { name: string } } | undefined
    await expect
      .poll(
        async () => {
          try {
            const res = await page.request.get(`${API_BASE}/users/me`)
            if (res.ok()) {
              meAfter = await res.json()
              return res.status()
            }
            return res.status()
          } catch {
            return 0
          }
        },
        { timeout: 10_000, intervals: [100, 250, 500, 1000] },
      )
      .toBe(200)
    expect(meAfter!.props.name).toBe('New Display Name')
  })

  test('Settings page round-trips a name change through reload', async ({ page }) => {
    await signup(page)
    await page.goto(`${APP_BASE}/settings`)
    // Wait for the settings form to load (loading state goes away).
    await expect(page.getByTestId('settings-name')).toBeVisible({ timeout: 15_000 })
    const nameInput = page.getByTestId('settings-name')
    const newName = `Updated Name ${Date.now()}`
    await nameInput.fill(newName)
    const { reqs } = await captureNetwork(page, async () => {
      await page.getByTestId('settings-save').click()
      // Wait for the post-save "Saved." banner to confirm the round-trip landed.
      await expect(page.getByTestId('settings-saved-banner')).toBeVisible({ timeout: 10_000 })
    })
    // Gate-12 contract: Save must fire PATCH /api/users/:id and re-read /me.
    const patch = reqs.find((r) => /\/api\/users\/[^?]+$/.test(r.url) && r.method === 'PATCH')
    expect(patch, 'PATCH /api/users/:id should fire on Save').toBeTruthy()
    expect(patch!.status).toBeLessThan(300)
    // Backend reflects the new name on a fresh GET.
    const me = await (await page.request.get(`${API_BASE}/users/me`)).json()
    expect(me.props.name).toBe(newName)
    // Reload — UI shows the persisted value.
    await page.reload()
    await expect(page.getByTestId('settings-name')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('settings-name')).toHaveValue(newName, { timeout: 5_000 })
  })
})
