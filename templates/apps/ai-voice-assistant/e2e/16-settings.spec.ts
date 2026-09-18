import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, APP_BASE, captureNetwork, signup } from './_helpers.js'

interface Preferences {
  voice: string
  language: string
  privacy: Record<string, boolean>
  notifications: Record<string, boolean>
  voicePlaybackEnabled: boolean
}

test.describe('/settings (preferences PUT)', () => {
  test.setTimeout(60_000)

  test('renders the voice / language / privacy / notifications sections', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: /default voice/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^language$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^privacy$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^notifications$/i })).toBeVisible()
  })

  test('clicking a voice tile PUTs /preferences and the row sticks across reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-voice-onyx"]').click()
      // The page renders an sr-only marker after a click.
      await expect(page.locator('[data-mol-id="settings-voice-picked-at"]')).toBeAttached({
        timeout: 10_000,
      })
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/api\/preferences/.test(r.url))
    expect(put, 'PUT /api/preferences must fire when voice changes').toBeDefined()
    expect(put!.status).toBe(200)

    // Read-after-write
    const fresh = await apiGet<Preferences>(page, '/preferences')
    expect(fresh.voice).toBe('onyx')

    // Reload survives
    await page.reload()
    await expect(page.locator('[data-mol-id="settings-voice-onyx"]')).toHaveAttribute(
      'class',
      /border-primary/,
      { timeout: 15_000 },
    )
  })

  test('changing language fires PUT /preferences and persists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    // Settings.update() calls persist(next) inside the setState callback,
    // so the PUT lands a tick after onChange. Wait explicitly for the
    // response rather than racing the captureNetwork window.
    const putWaiter = page.waitForResponse(
      (r) => r.request().method() === 'PUT' && /\/api\/preferences/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="language-picker-select"]').selectOption('es-MX')
    const putResp = await putWaiter
    expect(putResp.status()).toBe(200)

    const fresh = await apiGet<Preferences>(page, '/preferences')
    expect(fresh.language).toBe('es-MX')
  })

  test('toggling a privacy switch persists in oauthData.voicePreferences.privacy', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    // Default `transcripts` = true → click flips it false.
    const transcripts = page.getByRole('switch', { name: /save transcripts/i })
    await transcripts.click()
    await expect(transcripts).toHaveAttribute('aria-checked', 'false', { timeout: 10_000 })
    // Wait briefly for PUT to land.
    await page.waitForTimeout(500)
    const fresh = await apiGet<Preferences>(page, '/preferences')
    expect(fresh.privacy?.transcripts).toBe(false)
  })

  test('toggling a notification switch persists in oauthData.voicePreferences.notifications', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const reminders = page.getByRole('switch', { name: /daily check/i })
    // Default `reminders` = true → click flips it false.
    await reminders.click()
    await expect(reminders).toHaveAttribute('aria-checked', 'false', { timeout: 10_000 })
    await page.waitForTimeout(500)
    const fresh = await apiGet<Preferences>(page, '/preferences')
    expect(fresh.notifications?.reminders).toBe(false)
  })
})
