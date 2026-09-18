import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail } from './_helpers.js'

async function getAccessToken(email: string, password: string): Promise<string> {
  const res = await fetch(API_BASE + '/users/log-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`log-in failed: ${res.status}`)
  return ((await res.json()) as { accessToken: string }).accessToken
}

test.describe('search', () => {
  test('search?q=foo returns enriched results when transcripts contain the term', async ({
    page,
  }) => {
    const email = uniqueEmail('aimn-search')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const token = await getAccessToken(email, password)

    // Create a meeting and a transcript segment.
    const meeting = (await fetch(API_BASE + '/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Roadmap conversation',
        source: 'recorded',
        duration_minutes: 30,
        attendees: ['alice@example.com', 'bob@example.com'],
      }),
    }).then((r) => r.json())) as { id: string }
    await fetch(API_BASE + '/transcript_segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        meeting_id: meeting.id,
        ts_start_ms: 0,
        ts_end_ms: 8_000,
        text: 'We agreed to ship the dashboard in May.',
      }),
    })

    // q is required by the validateQuery middleware.
    const noQ = await fetch(API_BASE + '/search', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(noQ.status).toBe(400)

    // With q=dashboard we expect one enriched result.
    const res = (await fetch(API_BASE + '/search?q=dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Array<Record<string, unknown>>
    expect(res.length).toBe(1)
    expect(res[0].meeting_title).toBe('Roadmap conversation')
    expect(typeof res[0].ts).toBe('string')
    expect(res[0].text).toContain('dashboard')

    // Frontend renders a hit when typing the query.
    await page.goto(APP_BASE + '/search')
    await page.getByPlaceholder(/search transcripts/i).fill('dashboard')
    await expect(page.getByText(/Roadmap conversation/).first()).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('team', () => {
  test('GET /api/team includes the synthesized Owner row even with zero invites', async ({
    page,
  }) => {
    const email = uniqueEmail('aimn-team')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const token = await getAccessToken(email, password)

    const list = (await fetch(API_BASE + '/team', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Array<Record<string, unknown>>
    expect(list.length).toBe(1)
    expect(list[0].role).toBe('Owner')
    expect((list[0].id as string).startsWith('self:')).toBe(true)
    expect(list[0].pending).toBe(false)

    await page.goto(APP_BASE + '/team')
    await expect(page.getByRole('heading', { name: /^team$/i })).toBeVisible()
    // Active members section shows count = 1 (just me).
    await expect(page.getByText(/active members \(1\)/i)).toBeVisible()
  })

  test('inviting a teammate by email creates a pending row visible in the UI', async ({ page }) => {
    const email = uniqueEmail('aimn-invite')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const token = await getAccessToken(email, password)

    const inviteEmail = `invitee.${Date.now()}@example.com`
    const res = await fetch(API_BASE + '/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail, role: 'member' }),
    })
    expect(res.status).toBe(201)

    const list = (await fetch(API_BASE + '/team', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Array<Record<string, unknown>>
    expect(list.length).toBe(2)
    const pending = list.find((r) => r.email === inviteEmail)!
    expect(pending.pending).toBe(true)
    expect(pending.role).toBe('Member')

    await page.goto(APP_BASE + '/team')
    await expect(page.getByText(/pending invitations \(1\)/i)).toBeVisible()
    await expect(page.getByText(inviteEmail)).toBeVisible()
  })
})

test.describe('notifications', () => {
  test('Notifications page renders empty state for fresh user', async ({ page }) => {
    await signup(page, uniqueEmail('aimn-notif'), 'TestPass123!')
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible()
    await expect(page.getByText(/no new notifications|no notifications/i)).toBeVisible()
  })

  test('Notification API enriches kind→type, link→href, computes unread', async ({ page }) => {
    const email = uniqueEmail('aimn-notif-api')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const token = await getAccessToken(email, password)
    await fetch(API_BASE + '/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        kind: 'mention',
        title: 'Alice mentioned you',
        body: 'In the Q4 sync',
        link: '/meetings/123',
      }),
    })

    const list = (await fetch(API_BASE + '/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Array<Record<string, unknown>>
    expect(list.length).toBe(1)
    expect(list[0].type).toBe('mention')
    expect(list[0].href).toBe('/meetings/123')
    expect(list[0].unread).toBe(true)

    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/alice mentioned you/i)).toBeVisible()
  })
})
