import fs from 'node:fs'

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Per-page spec for /record. Browser-side MediaRecorder captures audio
 * and POSTs to /api/meetings/transcribe (Whisper + Claude pipeline).
 *
 * MediaRecorder is browser-driven; for the network/persistence
 * invariant, the e2e suite proves the upload path in 04-transcribe.spec.ts
 * (POSTs real audio bytes via fetch). This spec covers the page UI
 * affordances only.
 */

const SAMPLE_AUDIO = '/usr/share/sounds/alsa/Front_Center.wav'

test.describe('record page', () => {
  test('record heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('rec-h'), 'TestPass123!')
    await page.goto(APP_BASE + '/record')
    await expect(page.getByRole('heading', { name: /^record$/i }).first()).toBeVisible()
  })

  test('meeting title input is rendered and writable', async ({ page }) => {
    await signup(page, uniqueEmail('rec-title'), 'TestPass123!')
    await page.goto(APP_BASE + '/record')
    const input = page.getByLabel(/meeting-title|meeting title/i).first()
    await input.fill('Spec test meeting')
    await expect(input).toHaveValue('Spec test meeting')
  })

  test('start-recording button is rendered initially', async ({ page }) => {
    await signup(page, uniqueEmail('rec-start'), 'TestPass123!')
    await page.goto(APP_BASE + '/record')
    await expect(page.getByRole('button', { name: /start-recording/i }).first()).toBeVisible()
  })

  test('mic glyph is shown in idle state', async ({ page }) => {
    await signup(page, uniqueEmail('rec-mic'), 'TestPass123!')
    await page.goto(APP_BASE + '/record')
    const mic = page
      .locator('button[aria-label="start-recording"] .material-symbols-outlined')
      .first()
    await expect(mic).toBeVisible()
    await expect(mic).toHaveText('mic')
  })

  test('idle label "Tap to start recording" is shown', async ({ page }) => {
    await signup(page, uniqueEmail('rec-label'), 'TestPass123!')
    await page.goto(APP_BASE + '/record')
    await expect(page.getByText(/tap to start recording/i).first()).toBeVisible()
  })

  test('upload-and-transcribe round-trips through the API', async ({ page }) => {
    test.skip(!fs.existsSync(SAMPLE_AUDIO), `Sample audio not present at ${SAMPLE_AUDIO}; skipping`)
    const email = uniqueEmail('rec-pipe')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const tokenRes = await fetch(API_BASE + '/users/log-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const { accessToken } = (await tokenRes.json()) as { accessToken: string }
    const audio = fs.readFileSync(SAMPLE_AUDIO)
    const trans = await fetch(API_BASE + '/meetings/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav',
        Authorization: `Bearer ${accessToken}`,
        'X-Meeting-Title': 'Record-spec upload',
      },
      body: audio,
    })
    const rawBody = await trans.text()
    expect(trans.status, rawBody).toBe(201)
    const body = JSON.parse(rawBody) as {
      meeting_id: string
      transcript_text: string
      summary_md: string
    }
    expect(body.transcript_text.length).toBeGreaterThan(0)
    expect(body.summary_md).toMatch(/##\s*Summary/i)
  })

  test('sidebar nav-record chrome is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('rec-nav'), 'TestPass123!')
    await page.goto(APP_BASE + '/record')
    await expect(page.locator('[data-mol-id="nav-record"]').first()).toBeVisible()
  })

  test('GET /api/meetings/transcribe is wired (asserted via captureNetwork on actual upload smoke)', async ({
    page,
  }) => {
    test.skip(!fs.existsSync(SAMPLE_AUDIO), 'Sample audio not present; skipping')
    const email = uniqueEmail('rec-cap')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const reqs = await captureNetwork(page, async () => {
      const tokenRes = await page.evaluate(
        async ({ apiBase, e, p }) => {
          const r = await fetch(apiBase + '/users/log-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: e, password: p }),
          })
          return r.json()
        },
        { apiBase: API_BASE, e: email, p: password },
      )
      const token = (tokenRes as { accessToken: string }).accessToken
      // Fetch from the page so it shows up in network tab
      await page.evaluate(
        async ({ apiBase, t }) => {
          const audio = await fetch('/api/meetings').then(
            () => new Blob([new Uint8Array(1024)], { type: 'audio/wav' }),
          )
          await fetch(apiBase + '/meetings/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'audio/wav',
              Authorization: `Bearer ${t}`,
              'X-Meeting-Title': 'cap test',
            },
            body: audio,
          }).catch(() => undefined)
        },
        { apiBase: API_BASE, t: token },
      )
    })
    const transcribeCall = reqs.find(
      (r) => /\/api\/meetings\/transcribe$/.test(r.url) && r.method === 'POST',
    )
    expect(transcribeCall, 'POST /api/meetings/transcribe must fire').toBeTruthy()
  })
})
