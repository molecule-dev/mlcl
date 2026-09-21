import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, apiHeaders, signup, waitForSeed } from './_helpers.js'

// Settings persistence MUST go through the server-side /api/settings
// channel: the platform /users/me read never returns oauthData, so values
// saved via the user resource silently reset to defaults on reload.

test.describe('settings', () => {
  test('organization name saves and survives a full page reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const nameInput = page.getByLabel(/organization name/i)
    await expect(nameInput).toBeVisible({ timeout: 15000 })
    await expect.poll(async () => nameInput.inputValue(), { timeout: 10000 }).not.toBe('')
    await nameInput.fill('Harbor QA Foundation')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/^saved\.$/i)).toBeVisible({ timeout: 10000 })

    // Full reload — a client-only save would reset to defaults here.
    await page.reload()
    await expect(page.getByLabel(/organization name/i)).toBeVisible({ timeout: 15000 })
    await expect
      .poll(async () => page.getByLabel(/organization name/i).inputValue(), { timeout: 10000 })
      .toBe('Harbor QA Foundation')
  })

  test('GET/PATCH /api/settings round-trips the stored slice', async ({ page }) => {
    const { accessToken } = await signup(page)
    const base = new URL('/api/settings', APP_BASE).toString()
    const headers = apiHeaders(accessToken)

    const initial = await page.request.get(base, { headers })
    expect(initial.status()).toBe(200)

    const patched = await page.request.patch(base, {
      headers,
      data: { organizationName: 'Round Trip Org', notifyWeekly: false },
    })
    expect(patched.status()).toBe(200)
    const patchedBody = (await patched.json()) as {
      settings: { organizationName?: string; notifyWeekly?: boolean }
    }
    expect(patchedBody.settings.organizationName).toBe('Round Trip Org')
    expect(patchedBody.settings.notifyWeekly).toBe(false)

    const reread = await page.request.get(base, { headers })
    const rereadBody = (await reread.json()) as {
      settings: { organizationName?: string; notifyWeekly?: boolean }
    }
    expect(rereadBody.settings.organizationName).toBe('Round Trip Org')
    expect(rereadBody.settings.notifyWeekly).toBe(false)
  })
})
