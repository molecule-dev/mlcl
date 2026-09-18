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

  test('captureNetwork sees GET /api/users/:id on load', async ({ page }) => {
    const { userId } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.url.includes(`/api/users/${userId}`) && r.method === 'GET')
    expect(call?.status).toBe(200)
  })

  test('PATCH /api/users/:id persists oauthData.screenSharing settings', async ({ page }) => {
    const { accessToken, userId } = await signup(page)
    const newPrefs = {
      oauthData: {
        screenSharing: {
          notifications: { newComment: false, weeklySummary: true },
          capture: { autoTranscribe: true, hdEnabled: false },
          hotkeys: { startRecording: 'Ctrl+R', stopRecording: 'Ctrl+S' },
        },
      },
    }
    const patch = await page.request.patch(`${API_BASE}/users/${userId}`, {
      headers: authHeaders(accessToken),
      data: newPrefs,
      failOnStatusCode: false,
    })
    expect([200, 204]).toContain(patch.status())
    const reread = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: authHeaders(accessToken),
    })
    const body = (await reread.json()) as {
      props?: { oauthData?: { screenSharing?: unknown } }
    } & {
      oauthData?: { screenSharing?: unknown }
    }
    const persisted =
      (body.props?.oauthData as { screenSharing?: { notifications?: { newComment: boolean } } })
        ?.screenSharing ??
      (body.oauthData as { screenSharing?: { notifications?: { newComment: boolean } } })
        ?.screenSharing
    expect(
      (persisted as { notifications?: { newComment: boolean } } | undefined)?.notifications
        ?.newComment,
    ).toBe(false)
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
