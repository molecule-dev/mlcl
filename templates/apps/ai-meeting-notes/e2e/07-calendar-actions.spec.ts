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

test.describe('calendar', () => {
  test('GET /api/calendar_events derives date/time/duration_min/speaker_id', async ({ page }) => {
    const email = uniqueEmail('aimn-cal')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const token = await getAccessToken(email, password)

    const startsAt = '2026-05-15T15:00:00Z'
    const endsAt = '2026-05-15T16:30:00Z'
    const res = await fetch(API_BASE + '/calendar_events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Strategy review',
        source: 'google',
        starts_at: startsAt,
        ends_at: endsAt,
        attendees: ['lead@acme.test'],
      }),
    })
    expect(res.status).toBe(201)

    const list = (await fetch(API_BASE + '/calendar_events', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Array<Record<string, unknown>>
    expect(list.length).toBe(1)
    const e = list[0]
    expect(e.title).toBe('Strategy review')
    expect(e.duration_min).toBe(90)
    expect(typeof e.date).toBe('string')
    expect(typeof e.time).toBe('string')
    expect(typeof e.speaker_id).toBe('number')

    await page.goto(APP_BASE + '/calendar')
    await expect(page.getByRole('heading', { name: /^calendar$/i })).toBeVisible()
    await expect(page.getByText(/strategy review/i).first()).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('action items lifecycle', () => {
  test('PUT /api/action_items/:id flips status open → done', async ({ page }) => {
    const email = uniqueEmail('aimn-act-lifecycle')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const token = await getAccessToken(email, password)

    const meeting = (await fetch(API_BASE + '/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Standup',
        source: 'recorded',
        duration_minutes: 5,
        attendees: [],
      }),
    }).then((r) => r.json())) as { id: string }
    const ai = (await fetch(API_BASE + '/action_items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        description: 'Finish the writeup',
        meeting_id: meeting.id,
      }),
    }).then((r) => r.json())) as { id: string }

    await fetch(API_BASE + `/action_items/${ai.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'done' }),
    })

    const list = (await fetch(API_BASE + '/action_items', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Array<Record<string, unknown>>
    const updated = list.find((r) => r.id === ai.id)!
    expect(updated.status).toBe('done')

    // The Done filter on the Actions UI shows it; the Open filter does not.
    await page.goto(APP_BASE + '/actions')
    await page.getByRole('button', { name: /^done$/i }).click()
    await expect(page.getByText(/finish the writeup/i)).toBeVisible()
    await page.getByRole('button', { name: /^open$/i }).click()
    await expect(page.getByText(/finish the writeup/i)).not.toBeVisible({ timeout: 3_000 })
  })
})
