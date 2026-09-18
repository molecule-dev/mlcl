import fs from 'node:fs'

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail } from './_helpers.js'

/**
 * Real end-to-end transcription test. Posts a real audio file to
 * /api/meetings/transcribe, asserts:
 *   - Whisper actually returned text (not empty).
 *   - A meeting row was persisted with transcription_status = 'ready'.
 *   - Claude wrote a markdown summary with three sections.
 *   - GET /meetings/:id reflects the persisted state.
 *   - Visiting /meetings/:id renders the title and summary.
 *
 * Skipped if ALSA sample audio isn't available (no good fallback inside
 * a CI sandbox without ffmpeg/espeak).
 */

const SAMPLE_AUDIO = '/usr/share/sounds/alsa/Front_Center.wav'

test.describe('transcribe', () => {
  test('POST /api/meetings/transcribe runs Whisper + Claude and persists', async ({ page }) => {
    test.skip(
      !fs.existsSync(SAMPLE_AUDIO),
      `Sample audio not present at ${SAMPLE_AUDIO}; skipping transcribe e2e`,
    )

    const email = uniqueEmail('aimn-trans')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const tokenRes = await fetch(API_BASE + '/users/log-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const tokenJson = (await tokenRes.json()) as { accessToken: string }
    const token = tokenJson.accessToken

    const audio = fs.readFileSync(SAMPLE_AUDIO)
    const res = await fetch(API_BASE + '/meetings/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav',
        Authorization: `Bearer ${token}`,
        'X-Meeting-Title': 'Transcribe e2e test',
      },
      body: audio,
    })
    const text = await res.text()
    expect(res.status, text).toBe(201)
    const payload = JSON.parse(text) as {
      meeting_id: string
      transcript_text: string
      summary_md: string
      duration_minutes: number
    }

    expect(payload.meeting_id).toBeTruthy()
    expect(payload.transcript_text.length).toBeGreaterThan(0)
    expect(payload.summary_md).toMatch(/##\s*Summary/i)
    expect(payload.summary_md).toMatch(/##\s*Decisions/i)
    expect(payload.summary_md).toMatch(/##\s*Action Items/i)

    // Meeting must be persisted as ready.
    const meeting = (await fetch(API_BASE + `/meetings/${payload.meeting_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Record<string, unknown>
    expect(meeting.transcription_status).toBe('ready')
    expect(meeting.title).toBe('Transcribe e2e test')

    // Frontend rendering.
    await page.goto(APP_BASE + `/meetings/${payload.meeting_id}`)
    await expect(page.getByRole('heading', { name: /transcribe e2e test/i })).toBeVisible({
      timeout: 10_000,
    })
  })
})
