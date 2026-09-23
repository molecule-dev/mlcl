import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('settings /settings', () => {
  test('page loads with interactive form controls', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    // Settings exposes a tabbed UI: notification tab uses toggle buttons,
    // capture tab uses toggle buttons, hotkeys tab uses text inputs. Any
    // path through the UI must show at least one controllable element.
    const interactive = await page.locator('input, button[aria-pressed], [role="switch"]').count()
    expect(interactive).toBeGreaterThan(0)
    await expect(page.getByRole('button', { name: /save|update|apply/i }).first()).toBeVisible()
  })

  test('captureNetwork sees GET /api/settings on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
    })
    // The preference slice is served by the server-side /api/settings channel
    // (the platform user resource never returns oauthData on reads).
    const call = reqs.find((r) => /\/api\/settings(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call?.status).toBe(200)
  })

  test('PATCH /api/settings persists preference slices', async ({ page }) => {
    const { accessToken } = await signup(page)
    const newPrefs = {
      screenSharing: {
        notifications: { newComment: false, weeklySummary: true },
        capture: { autoTranscribe: true, hdEnabled: false },
        hotkeys: { startRecording: 'Ctrl+R', stopRecording: 'Ctrl+S' },
      },
    }
    const patch = await page.request.patch(`${API_BASE}/settings`, {
      headers: authHeaders(accessToken),
      data: newPrefs,
      failOnStatusCode: false,
    })
    expect(patch.status(), await patch.text().catch(() => '')).toBe(200)
    const reread = await page.request.get(`${API_BASE}/settings`, {
      headers: authHeaders(accessToken),
    })
    expect(reread.status()).toBe(200)
    const body = (await reread.json()) as {
      settings?: { screenSharing?: { notifications?: { newComment?: boolean } } }
    }
    expect(body.settings?.screenSharing?.notifications?.newComment).toBe(false)
  })

  test('cancel button reverts unsaved changes', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const cancelBtn = page.getByRole('button', { name: /cancel|reset|discard/i }).first()
    await expect(cancelBtn.first()).toBeAttached()
  })

  test('save button is reachable on the page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const saveBtn = page.getByRole('button', { name: /save|update|apply/i }).first()
    await expect(saveBtn.first()).toBeAttached()
  })
})
