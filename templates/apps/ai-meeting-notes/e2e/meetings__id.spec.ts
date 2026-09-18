import fs from 'node:fs'

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Per-page spec for /meetings/:id (Meeting detail). Renders one
 * meeting's transcript + AI summary + action items. Reachable from
 * /dashboard cards or /meetings rows.
 *
 * Real seed flow: signup → POST /meetings/transcribe with sample audio
 * (Whisper + Claude) → navigate to /meetings/<returned id>.
 */

const SAMPLE_AUDIO = '/usr/share/sounds/alsa/Front_Center.wav'

async function seedMeeting(
  email: string,
  password: string,
): Promise<{ token: string; meetingId: string }> {
  const tokenRes = await fetch(API_BASE + '/users/log-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const { accessToken } = (await tokenRes.json()) as { accessToken: string }
  if (fs.existsSync(SAMPLE_AUDIO)) {
    const audio = fs.readFileSync(SAMPLE_AUDIO)
    const trans = await fetch(API_BASE + '/meetings/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav',
        Authorization: `Bearer ${accessToken}`,
        'X-Meeting-Title': 'Detail page seed meeting',
      },
      body: audio,
    })
    const body = (await trans.json()) as { meeting_id: string }
    return { token: accessToken, meetingId: body.meeting_id }
  }
  // fallback: empty meeting via direct POST
  const res = await fetch(API_BASE + '/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      title: 'Detail page seed meeting',
      startedAt: new Date().toISOString(),
    }),
  })
  const created = (await res.json()) as { id?: string; props?: { id: string } }
  return { token: accessToken, meetingId: created.id ?? (created.props?.id as string) }
}

test.describe('meetings/:id detail page', () => {
  test('back-to-dashboard link is rendered', async ({ page }) => {
    const email = uniqueEmail('mdid-back')
    await signup(page, email, 'TestPass123!')
    const { meetingId } = await seedMeeting(email, 'TestPass123!')
    await page.goto(APP_BASE + `/meetings/${meetingId}`)
    await expect(page.getByRole('link', { name: /all meetings|back/i }).first()).toBeVisible()
  })

  test('h1 renders the meeting title', async ({ page }) => {
    const email = uniqueEmail('mdid-h1')
    await signup(page, email, 'TestPass123!')
    const { meetingId } = await seedMeeting(email, 'TestPass123!')
    await page.goto(APP_BASE + `/meetings/${meetingId}`)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('transcript section renders', async ({ page }) => {
    const email = uniqueEmail('mdid-trans')
    await signup(page, email, 'TestPass123!')
    const { meetingId } = await seedMeeting(email, 'TestPass123!')
    await page.goto(APP_BASE + `/meetings/${meetingId}`)
    await expect(page.getByText(/transcript/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('AI summary section renders', async ({ page }) => {
    const email = uniqueEmail('mdid-sum')
    await signup(page, email, 'TestPass123!')
    const { meetingId } = await seedMeeting(email, 'TestPass123!')
    await page.goto(APP_BASE + `/meetings/${meetingId}`)
    await expect(page.getByText(/ai summary|summary/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('decisions sub-section renders', async ({ page }) => {
    const email = uniqueEmail('mdid-dec')
    await signup(page, email, 'TestPass123!')
    const { meetingId } = await seedMeeting(email, 'TestPass123!')
    await page.goto(APP_BASE + `/meetings/${meetingId}`)
    await expect(page.getByText(/decision|decisions/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('follow-ups / action-items section renders', async ({ page }) => {
    const email = uniqueEmail('mdid-fol')
    await signup(page, email, 'TestPass123!')
    const { meetingId } = await seedMeeting(email, 'TestPass123!')
    await page.goto(APP_BASE + `/meetings/${meetingId}`)
    await expect(page.getByText(/follow-ups|action items/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('GET /api/meetings/:id fires on load', async ({ page }) => {
    const email = uniqueEmail('mdid-net')
    await signup(page, email, 'TestPass123!')
    const { meetingId } = await seedMeeting(email, 'TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/meetings/${meetingId}`)
      await page.waitForLoadState('networkidle')
    })
    const getCall = reqs.find(
      (r) => new RegExp(`/api/meetings/${meetingId}(\\?|$)`).test(r.url) && r.method === 'GET',
    )
    expect(getCall, 'GET /api/meetings/:id must fire').toBeTruthy()
    expect([200, 201]).toContain(getCall!.status)
  })
})
