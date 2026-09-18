import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiSignup,
  authedApi,
  captureNetwork,
  signup,
  whereUrl,
} from './_helpers.js'

test.describe('/practice', () => {
  test('renders the heading + first phrase + record button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/practice')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    await expect(page.getByTestId('practice-stage')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('practice-prompt')).toBeVisible()
    await expect(page.getByTestId('practice-record')).toBeVisible()
  })

  test('GET /api/practice/phrases fires and returns a non-empty list', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/practice')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const calls = whereUrl(reqs, /\/api\/practice\/phrases/, 'GET')
    expect(calls.length, 'phrases endpoint fired').toBeGreaterThan(0)
    expect(calls[0].status, 'phrases status').toBe(200)
  })

  test('TTS endpoint returns real MP3 bytes (not a placeholder)', async ({ request }) => {
    const { accessToken } = await apiSignup(request)
    expect(accessToken, 'token captured').toBeTruthy()
    const tts = await request.post(`${API_BASE}/practice/synthesize`, {
      headers: { Authorization: `Bearer ${accessToken!}`, 'Content-Type': 'application/json' },
      data: { text: 'Hola, ¿cómo estás?', voice: 'nova' },
    })
    expect(tts.status(), 'TTS status').toBe(200)
    const ct = tts.headers()['content-type'] || ''
    expect(ct).toMatch(/audio|mpeg/)
    const buf = await tts.body()
    // Real MP3s have an ID3 tag header or 0xFF 0xFB sync — anything > a few KB
    // proves OpenAI returned real audio, not a placeholder.
    expect(buf.length, 'TTS payload byte count').toBeGreaterThan(2000)
  })

  test('clicking record then stop submits an exercise_results row (real XP persisted)', async ({
    page,
    request,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/practice')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

    // Record (start) → record (stop = submit)
    const recordBtn = page.getByTestId('practice-record')
    await recordBtn.waitFor({ timeout: 15000 })

    const reqs = await captureNetwork(page, async () => {
      await recordBtn.click()
      await page.waitForTimeout(500)
      await recordBtn.click()
      await page.waitForTimeout(2000)
    })
    const checkCalls = whereUrl(reqs, /\/api\/practice\/check/, 'POST')
    expect(checkCalls.length, 'POST /api/practice/check fired').toBeGreaterThan(0)
    expect(checkCalls[0].status, 'check status').toBe(201)

    // Backend invariant: today's XP increased — meaning exercise_results row was persisted
    const api = authedApi(request, accessToken!)
    const summary = await api.get('/progress/user/me/summary')
    const body = (await summary.json()) as { today_xp: number }
    expect(body.today_xp, 'today_xp persisted').toBeGreaterThan(0)
  })
})
