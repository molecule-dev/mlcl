import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, APP_BASE, API_BASE, apiHeaders, captureNetwork } from './_helpers.js'

test.describe('Settings page', () => {
  test('persists cadence + preferences across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible()

    // Initial state from server defaults: weekly + reminders on, digest on, coach off.
    await expect(page.getByTestId('cadence-weekly')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('toggle-weeklyReminders')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('toggle-coachingNudges')).toHaveAttribute('aria-pressed', 'false')

    // Switch to bi-weekly.
    await page.getByTestId('cadence-biweekly').click()
    await expect(page.getByTestId('cadence-biweekly')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('settings-status')).toContainText(/saved/i, { timeout: 10000 })

    // Toggle coaching nudges on.
    await page.getByTestId('toggle-coachingNudges').click()
    await expect(page.getByTestId('toggle-coachingNudges')).toHaveAttribute('aria-pressed', 'true')

    // Reload — server-derived state must rehydrate.
    await page.reload()
    await expect(page.getByTestId('cadence-biweekly')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('toggle-coachingNudges')).toHaveAttribute('aria-pressed', 'true')

    // Verify against the API too.
    const res = await page.request.get(API_BASE + '/settings')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.cadence).toBe('biweekly')
    expect(body.preferences.coachingNudges).toBe(true)
  })

  test('billing link routes to /settings/billing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('link', { name: /billing/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/settings\/billing/)
  })

  test('weekly cadence button is pressed by default and reverts to weekly when clicked', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('cadence-weekly')).toHaveAttribute('aria-pressed', 'true')

    // Switch to biweekly first, then back to weekly — confirms the button is wired.
    await page.getByTestId('cadence-biweekly').click()
    await expect(page.getByTestId('cadence-biweekly')).toHaveAttribute('aria-pressed', 'true')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('cadence-weekly').click()
      await expect(page.getByTestId('cadence-weekly')).toHaveAttribute('aria-pressed', 'true')
      // Wait for the PATCH to actually resolve before tearing down the
      // network listener — the local state flip is optimistic so
      // aria-pressed returns true before the server roundtrip completes.
      await expect(page.getByTestId('settings-status')).toContainText(/saved/i, {
        timeout: 10000,
      })
    })
    const patched = reqs.find((r) => r.method === 'PATCH' && /\/api\/settings/.test(r.url))
    expect(patched, 'PATCH /api/settings not observed').toBeTruthy()

    const fresh = await page.request.get(`${API_BASE}/settings`, {
      headers: apiHeaders(accessToken!),
    })
    const body = (await fresh.json()) as { cadence: string }
    expect(body.cadence).toBe('weekly')
  })

  test('weekly-reminders toggle persists OFF state across reload (PATCH + GET round-trip)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('toggle-weeklyReminders')).toHaveAttribute('aria-pressed', 'true')

    await page.getByTestId('toggle-weeklyReminders').click()
    await expect(page.getByTestId('toggle-weeklyReminders')).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await page.reload()
    await expect(page.getByTestId('toggle-weeklyReminders')).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    const fresh = await page.request.get(`${API_BASE}/settings`, {
      headers: apiHeaders(accessToken!),
    })
    const body = (await fresh.json()) as { preferences: { weeklyReminders: boolean } }
    expect(body.preferences.weeklyReminders).toBe(false)
  })

  test('Monday-digest toggle persists ON→OFF→ON cycle and the API reflects the final state', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('toggle-mondayDigest')).toHaveAttribute('aria-pressed', 'true')

    await page.getByTestId('toggle-mondayDigest').click()
    await expect(page.getByTestId('toggle-mondayDigest')).toHaveAttribute('aria-pressed', 'false')
    await page.getByTestId('toggle-mondayDigest').click()
    await expect(page.getByTestId('toggle-mondayDigest')).toHaveAttribute('aria-pressed', 'true')

    const fresh = await page.request.get(`${API_BASE}/settings`, {
      headers: apiHeaders(accessToken!),
    })
    const body = (await fresh.json()) as { preferences: { mondayDigest: boolean } }
    expect(body.preferences.mondayDigest).toBe(true)
  })

  test('Open profile link routes to /profile', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('link', { name: /open profile/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/profile$/)
  })
})
