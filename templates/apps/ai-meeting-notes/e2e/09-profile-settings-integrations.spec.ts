import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail } from './_helpers.js'

interface UserPropsBag {
  id: string
  email?: string
  name?: string
  oauthData?: Record<string, unknown> | null
}

interface UserReadEnvelope {
  props?: UserPropsBag
}

interface LoginResponse {
  accessToken: string
  user: UserPropsBag
  props: UserPropsBag
}

async function logIn(email: string, password: string): Promise<{ token: string; userId: string }> {
  const res = await fetch(API_BASE + '/users/log-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`log-in failed: ${res.status}`)
  const json = (await res.json()) as LoginResponse
  return { token: json.accessToken, userId: json.props.id }
}

async function fetchUser(token: string, userId: string): Promise<UserReadEnvelope> {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GET /users/${userId} failed: ${res.status}`)
  return (await res.json()) as UserReadEnvelope
}

test.describe('profile persistence', () => {
  test('save changes round-trips through PATCH /api/users/:id and survives a reload', async ({
    page,
  }) => {
    const email = uniqueEmail('aimn-profile')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const { token, userId } = await logIn(email, password)

    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: /^profile$/i })).toBeVisible()
    // Wait for the form to hydrate from GET /api/users/:id (loading=false).
    await expect(page.locator('[data-mol-id="profile-display-name"]')).toBeVisible({
      timeout: 15_000,
    })

    // Identity panel — edit display name + bio.
    await page.locator('[data-mol-id="profile-display-name"]').fill('Walked-Through Owner')
    await page.locator('[data-mol-id="profile-bio"]').fill('Bio set via the e2e walk.')

    // Preferences panel.
    await page.locator('[data-mol-id="profile-section-preferences"]').click()
    await page.locator('[data-mol-id="profile-speaker-color-3"]').click()
    await page.locator('[data-mol-id="profile-timezone"]').selectOption('Europe/London')
    await page.locator('[data-mol-id="profile-job-title"]').fill('Engineering Manager')

    // Notifications panel.
    await page.locator('[data-mol-id="profile-section-notifications"]').click()
    await page.locator('[data-mol-id="profile-notify-summaries"]').click()

    // Save.
    await page.locator('[data-mol-id="profile-save"]').click()
    await expect(page.locator('[data-mol-id="profile-saved"]')).toBeVisible({ timeout: 10_000 })

    // Backend invariant: the user row's oauthData.profile reflects the writes.
    const after = await fetchUser(token, userId)
    const oauth = (after.props?.oauthData ?? {}) as { profile?: Record<string, unknown> }
    expect(oauth.profile).toBeTruthy()
    expect(oauth.profile?.displayName).toBe('Walked-Through Owner')
    expect(oauth.profile?.bio).toBe('Bio set via the e2e walk.')
    expect(oauth.profile?.speakerColor).toBe(3)
    expect(oauth.profile?.timezone).toBe('Europe/London')
    expect(oauth.profile?.jobTitle).toBe('Engineering Manager')
    expect(oauth.profile?.notifySummaries).toBe(true)
    expect(after.props?.name).toBe('Walked-Through Owner')

    // Reload re-hydrates from the persisted state.
    await page.reload()
    await expect(page.locator('[data-mol-id="profile-display-name"]')).toHaveValue(
      'Walked-Through Owner',
      {
        timeout: 10_000,
      },
    )
    await expect(page.locator('[data-mol-id="profile-bio"]')).toHaveValue(
      'Bio set via the e2e walk.',
    )

    await page.locator('[data-mol-id="profile-section-preferences"]').click()
    await expect(page.locator('[data-mol-id="profile-timezone"]')).toHaveValue('Europe/London')
    await expect(page.locator('[data-mol-id="profile-job-title"]')).toHaveValue(
      'Engineering Manager',
    )

    await page.locator('[data-mol-id="profile-section-notifications"]').click()
    await expect(page.locator('[data-mol-id="profile-notify-summaries"]')).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})

test.describe('settings persistence', () => {
  test('changing transcription/sharing/retention settings persists in users.oauthData.settings', async ({
    page,
  }) => {
    const email = uniqueEmail('aimn-settings')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const { token, userId } = await logIn(email, password)

    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-transcription-language"]')).toBeVisible({
      timeout: 15_000,
    })

    await page.locator('[data-mol-id="settings-transcription-language"]').selectOption('Spanish')
    await page.locator('[data-mol-id="settings-transcription-profanity"]').selectOption('Mask')

    await page.locator('[data-mol-id="settings-section-sharing"]').click()
    await page.locator('[data-mol-id="settings-sharing-scope"]').selectOption('Private')
    await page.locator('[data-mol-id="settings-sharing-exportFormat"]').selectOption('PDF')

    await page.locator('[data-mol-id="settings-section-retention"]').click()
    await page.locator('[data-mol-id="settings-retention-audio"]').selectOption('30 days')
    await page.locator('[data-mol-id="settings-retention-transcript"]').selectOption('1 year')

    await page.locator('[data-mol-id="settings-save"]').click()
    await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10_000 })

    const after = await fetchUser(token, userId)
    const oauth = (after.props?.oauthData ?? {}) as {
      settings?: Record<string, Record<string, unknown>>
    }
    expect(oauth.settings).toBeTruthy()
    expect(oauth.settings?.transcription).toMatchObject({ language: 'Spanish', profanity: 'Mask' })
    expect(oauth.settings?.sharing).toMatchObject({ scope: 'Private', exportFormat: 'PDF' })
    expect(oauth.settings?.retention).toMatchObject({ audio: '30 days', transcript: '1 year' })

    // Reload re-hydrates the persisted values.
    await page.reload()
    await expect(page.locator('[data-mol-id="settings-transcription-language"]')).toHaveValue(
      'Spanish',
      {
        timeout: 10_000,
      },
    )
    await expect(page.locator('[data-mol-id="settings-transcription-profanity"]')).toHaveValue(
      'Mask',
    )

    await page.locator('[data-mol-id="settings-section-sharing"]').click()
    await expect(page.locator('[data-mol-id="settings-sharing-scope"]')).toHaveValue('Private')
    await expect(page.locator('[data-mol-id="settings-sharing-exportFormat"]')).toHaveValue('PDF')

    await page.locator('[data-mol-id="settings-section-retention"]').click()
    await expect(page.locator('[data-mol-id="settings-retention-audio"]')).toHaveValue('30 days')
    await expect(page.locator('[data-mol-id="settings-retention-transcript"]')).toHaveValue(
      '1 year',
    )
  })
})

test.describe('integrations persistence', () => {
  test('toggling Connect/Disconnect persists into users.oauthData.integrations and survives reload', async ({
    page,
  }) => {
    const email = uniqueEmail('aimn-integrations')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const { token, userId } = await logIn(email, password)

    await page.goto(APP_BASE + '/integrations')
    await expect(page.getByRole('heading', { name: /^integrations$/i })).toBeVisible()
    await expect(page.locator('[data-mol-id="integration-card-google_calendar"]')).toBeVisible({
      timeout: 15_000,
    })

    // Fresh user — every card starts as "Not connected".
    await expect(page.locator('[data-mol-id="integration-status-google_calendar"]')).toHaveText(
      /not connected/i,
    )
    await expect(page.locator('[data-mol-id="integration-status-zoom"]')).toHaveText(
      /not connected/i,
    )

    // Connect Google Calendar.
    await page.locator('[data-mol-id="integration-toggle-google_calendar"]').click()
    await expect(page.locator('[data-mol-id="integration-status-google_calendar"]')).toHaveText(
      /^connected$/i,
      { timeout: 10_000 },
    )

    // Connect Zoom.
    await page.locator('[data-mol-id="integration-toggle-zoom"]').click()
    await expect(page.locator('[data-mol-id="integration-status-zoom"]')).toHaveText(
      /^connected$/i,
      {
        timeout: 10_000,
      },
    )

    // Backend invariant — both flags are persisted with timestamps.
    const after = await fetchUser(token, userId)
    const oauth = (after.props?.oauthData ?? {}) as {
      integrations?: Record<string, { connected: boolean; connectedAt?: string }>
    }
    expect(oauth.integrations?.google_calendar?.connected).toBe(true)
    expect(typeof oauth.integrations?.google_calendar?.connectedAt).toBe('string')
    expect(oauth.integrations?.zoom?.connected).toBe(true)

    // Reload preserves the connected state.
    await page.reload()
    await expect(page.locator('[data-mol-id="integration-status-google_calendar"]')).toHaveText(
      /^connected$/i,
      { timeout: 10_000 },
    )
    await expect(page.locator('[data-mol-id="integration-status-zoom"]')).toHaveText(/^connected$/i)

    // Disconnecting Zoom flips the persisted state back to false.
    await page.locator('[data-mol-id="integration-toggle-zoom"]').click()
    await expect(page.locator('[data-mol-id="integration-status-zoom"]')).toHaveText(
      /not connected/i,
      {
        timeout: 10_000,
      },
    )

    const after2 = await fetchUser(token, userId)
    const oauth2 = (after2.props?.oauthData ?? {}) as {
      integrations?: Record<string, { connected: boolean }>
    }
    expect(oauth2.integrations?.google_calendar?.connected).toBe(true)
    expect(oauth2.integrations?.zoom?.connected).toBe(false)
  })
})

test.describe('team remove', () => {
  test('Remove on an active member calls DELETE /api/team/:id and the row vanishes from the list', async ({
    page,
  }) => {
    const email = uniqueEmail('aimn-team-remove')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const { token } = await logIn(email, password)

    const memberEmail = `removable.${Date.now()}@example.com`
    const inviteRes = await fetch(API_BASE + '/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: memberEmail, role: 'member' }),
    })
    expect(inviteRes.status).toBe(201)
    const invite = (await inviteRes.json()) as { id: string }

    // Mark them as joined so they show up under "Active members" instead of "Pending".
    await fetch(API_BASE + `/team/${invite.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ joined: true }),
    })

    await page.goto(APP_BASE + '/team')
    await expect(page.getByText(memberEmail)).toBeVisible()

    // Owner row has no remove button — just the invited member does.
    const removeBtn = page.locator(`[data-mol-id="team-remove-${invite.id}"]`)
    await expect(removeBtn).toBeVisible()
    await removeBtn.click()

    await expect(page.getByText(memberEmail)).not.toBeVisible({ timeout: 5_000 })

    // Backend invariant: GET shows it gone.
    const list = (await fetch(API_BASE + '/team', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Array<Record<string, unknown>>
    const row = list.find((r) => r.email === memberEmail)
    expect(row).toBeUndefined()

    // Reload — still gone.
    await page.reload()
    await expect(page.getByText(memberEmail)).not.toBeVisible({ timeout: 5_000 })
  })
})

test.describe('calendar links', () => {
  test('events with a meeting_id render as links to /meetings/:meeting_id; events without do not link to /meetings/:calendar_event_id', async ({
    page,
  }) => {
    const email = uniqueEmail('aimn-callinks')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const { token } = await logIn(email, password)

    // Real meeting that the calendar event will be tied to.
    const meeting = (await fetch(API_BASE + '/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Linked meeting',
        source: 'recorded',
        duration_minutes: 30,
        attendees: ['linked@example.com'],
      }),
    }).then((r) => r.json())) as { id: string }

    // Future-dated events so they appear in "Upcoming".
    const linkedStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const linkedEnd = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
    const linkedRes = await fetch(API_BASE + '/calendar_events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Calendar slot — linked',
        source: 'google',
        starts_at: linkedStart,
        ends_at: linkedEnd,
        attendees: [],
        meeting_id: meeting.id,
      }),
    })
    expect(linkedRes.status).toBe(201)

    const unlinkedStart = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString()
    const unlinkedEnd = new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString()
    const unlinkedRes = await fetch(API_BASE + '/calendar_events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Calendar slot — unlinked',
        source: 'google',
        starts_at: unlinkedStart,
        ends_at: unlinkedEnd,
        attendees: [],
      }),
    })
    expect(unlinkedRes.status).toBe(201)

    const list = (await fetch(API_BASE + '/calendar_events', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Array<{ id: string; title: string; meeting_id: string | null }>
    const linked = list.find((r) => r.title === 'Calendar slot — linked')!
    const unlinked = list.find((r) => r.title === 'Calendar slot — unlinked')!
    expect(linked.meeting_id).toBe(meeting.id)
    expect(unlinked.meeting_id).toBeNull()

    await page.goto(APP_BASE + '/calendar')
    await expect(page.getByRole('heading', { name: /^calendar$/i })).toBeVisible()
    await expect(page.locator('[data-mol-id="calendar-event-list"]')).toBeVisible({
      timeout: 15_000,
    })

    // Linked event is an anchor; href must be /meetings/<meeting.id>.
    const linkedLink = page.locator(`[data-mol-id="calendar-event-link-${linked.id}"]`)
    await expect(linkedLink).toBeVisible()
    await expect(linkedLink).toHaveAttribute('href', `/meetings/${meeting.id}`)

    // Unlinked event renders as plain text, NOT as a link.
    await expect(page.locator(`[data-mol-id="calendar-event-title-${unlinked.id}"]`)).toBeVisible()
    await expect(page.locator(`[data-mol-id="calendar-event-link-${unlinked.id}"]`)).toHaveCount(0)

    // Clicking the linked event lands on the existing meeting detail (no 404).
    await linkedLink.click()
    await expect(page).toHaveURL(new RegExp(`/meetings/${meeting.id}$`))
    await expect(page.getByText(/linked meeting/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
