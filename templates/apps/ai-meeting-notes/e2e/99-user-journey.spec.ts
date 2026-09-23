import fs from 'node:fs'

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail } from './_helpers.js'

const SAMPLE_AUDIO = '/usr/share/sounds/alsa/Front_Center.wav'

interface UserPropsBag {
  id: string
  oauthData?: Record<string, unknown> | null
}

interface SessionEnvelope {
  accessToken: string
  props: UserPropsBag
}

/** Response of the server-side settings channel (GET/PATCH /api/settings/me). */
interface SettingsMeEnvelope {
  id: string
  settings?: { sharing?: { scope?: string } }
  integrations?: Record<string, { connected?: boolean }>
}

async function loginViaApi(email: string, password: string): Promise<SessionEnvelope> {
  const res = await fetch(`${API_BASE}/users/log-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  expect(res.ok, `log-in failed: ${res.status}`).toBe(true)
  return (await res.json()) as SessionEnvelope
}

test.describe('user journey (kitchen-sink)', () => {
  test('signup → record meeting → action items → settings → integrations → team → search → notifications → logout', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('aimn-journey')
    const password = 'JourneyPass1!'

    // 1. Sign up; land on dashboard.
    await signup(page, email, password)
    await expect(page).toHaveURL(/\/dashboard|\/$/, { timeout: 15_000 })

    const session = await loginViaApi(email, password)
    const auth = { Authorization: `Bearer ${session.accessToken}` }

    // 2. Seed a meeting so downstream pages show real content. Prefer
    //    the full transcribe pipeline (Whisper + Claude) when an ALSA
    //    sample is on disk; fall back to creating a bare meeting row
    //    otherwise. Either way we end up with a persisted meeting tied
    //    to this user that the rest of the journey can lean on.
    if (fs.existsSync(SAMPLE_AUDIO)) {
      const audio = fs.readFileSync(SAMPLE_AUDIO)
      const transcribe = await request.post(`${API_BASE}/meetings/transcribe`, {
        headers: { ...auth, 'Content-Type': 'audio/wav', 'X-Meeting-Title': 'Journey Sync' },
        data: audio,
      })
      expect(transcribe.status(), `transcribe HTTP=${transcribe.status()}`).toBe(201)
    } else {
      const created = await request.post(`${API_BASE}/meetings`, {
        headers: { ...auth, 'Content-Type': 'application/json' },
        data: { title: 'Journey Sync', source: 'manual', duration_minutes: 30 },
      })
      expect(created.status()).toBe(201)
    }

    // 3. Dashboard reflects new content (a meeting card or "Recent
    //    meetings" entry).  Empty state OK if the audio was rejected.
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('link', { name: /record/i }).first()).toBeVisible()

    // 4. Walk every primary navigation page in the sidebar — they must
    //    all render without throwing or hanging on a spinner.
    for (const path of [
      '/meetings',
      '/calendar',
      '/actions',
      '/team',
      '/search',
      '/integrations',
      '/notifications',
    ]) {
      await page.goto(APP_BASE + path)
      await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')))
      // No client-side error overlay (Vite). Some pages render specific
      // h1; we only assert the layout shell hasn't replaced the whole
      // page with an error boundary.
      const fatal = page.getByText(/runtime error|failed to render|something went wrong/i)
      expect(await fatal.count(), `error overlay on ${path}`).toBe(0)
    }

    // 5. Persist a settings tweak — flip default sharing scope. Verify
    //    via GET /api/settings/me (the server-side channel; the platform
    //    user resource never returns oauthData on reads). The Sharing
    //    pane is in a sibling tab on the Settings page, so we open it
    //    first before touching the dropdown.
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-sharing"]').click()
    await expect(page.locator('[data-mol-id="settings-sharing-scope"]')).toBeVisible({
      timeout: 15_000,
    })
    const sharingScope = page.locator('[data-mol-id="settings-sharing-scope"]')
    await sharingScope.selectOption('Public link')
    await page.locator('[data-mol-id="settings-save"]').click()
    await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10_000 })

    const settingsRes = await request.get(`${API_BASE}/settings/me`, { headers: auth })
    expect(settingsRes.status()).toBe(200)
    const settingsMe = (await settingsRes.json()) as SettingsMeEnvelope
    expect(settingsMe.settings?.sharing?.scope).toBe('Public link')

    // 6. Persist an integration — connect Google Calendar — and verify
    //    via GET /api/settings/me that the connected state persisted.
    await page.goto(APP_BASE + '/integrations')
    const googleToggle = page.locator('[data-mol-id="integration-toggle-google_calendar"]')
    await expect(googleToggle).toBeVisible({ timeout: 15_000 })
    await googleToggle.click()
    await expect(page.locator('[data-mol-id="integration-card-google_calendar"]')).toHaveAttribute(
      'data-status',
      'connected',
      { timeout: 10_000 },
    )

    const settingsAfterIntegration = (await (
      await request.get(`${API_BASE}/settings/me`, { headers: auth })
    ).json()) as SettingsMeEnvelope
    expect(settingsAfterIntegration.integrations?.['google_calendar']?.connected).toBe(true)

    // 7. Verify the public auth-recovery and static pages still render
    //    when revisited mid-session — they must be public and not
    //    bounce to login.
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('[data-mol-id="page-terms"]')).toBeVisible()
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('[data-mol-id="page-privacy"]')).toBeVisible()
    await page.goto(APP_BASE + '/pricing')
    await expect(
      page.getByRole('heading', { name: /pricing|plans|choose|plan/i }).first(),
    ).toBeVisible()

    // 8. Log out via menu; protected routes bounce to /login.
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('button', { name: /account|menu|profile|user|listener/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
