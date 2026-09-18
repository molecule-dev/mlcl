import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('settings', () => {
  test('PATCH /users/:id round-trips name + photoPrefs through GET /users/me', async ({ page }) => {
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
    const upd = await page.request.patch(`${API_BASE}/users/${userId}`, {
      data: {
        name: 'New Display Name',
        oauthData: {
          photoPrefs: { showExif: true, publicProfile: false, notifyFeatured: true },
        },
      },
      headers: { 'content-type': 'application/json' },
    })
    expect(upd.status()).toBeLessThan(300)
    let meAfter:
      | {
          props: {
            name: string
            oauthData: {
              photoPrefs: { showExif: boolean; publicProfile: boolean; notifyFeatured: boolean }
            }
          }
        }
      | undefined
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
    expect(meAfter!.props.oauthData.photoPrefs.showExif).toBe(true)
    expect(meAfter!.props.oauthData.photoPrefs.publicProfile).toBe(false)
    expect(meAfter!.props.oauthData.photoPrefs.notifyFeatured).toBe(true)
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
