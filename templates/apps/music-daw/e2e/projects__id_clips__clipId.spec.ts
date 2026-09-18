import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  addTrack,
  apiSignup,
  authedApi,
  captureNetwork,
  createProject,
  whereUrl,
} from './_helpers.js'

async function loginThenGoto(
  page: import('@playwright/test').Page,
  u: { email: string; password: string },
  path: string,
) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').fill(u.email)
  await page.locator('#password').fill(u.password)
  await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
  await page.goto(APP_BASE + path)
}

async function provisionClip(request: import('@playwright/test').APIRequestContext, token: string) {
  const proj = await createProject(request, token)
  const track = await addTrack(request, token, proj.id, { name: 'Roll Lead', type: 'midi' })
  const api = authedApi(request, token)
  const res = await api.post('/clips', {
    track_id: track.id,
    kind: 'midi',
    start_time: 0,
    duration: 4,
  })
  expect(res.status()).toBe(201)
  const body = await res.json()
  const clip = body.id ? body : (body.data ?? body.props ?? body)
  return { proj, track, clip }
}

test.describe('Piano roll page (/projects/:id/clips/:clipId)', () => {
  test('renders the Piano roll heading and grid metadata', async ({ page, request }) => {
    const u = await apiSignup(request)
    const { proj, clip } = await provisionClip(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}/clips/${clip.id}`)
    await expect(page.getByRole('heading', { name: /piano roll/i })).toBeVisible()
    await expect(page.getByText(/4 bars/)).toBeVisible()
    await expect(page.getByText(/64 steps/)).toBeVisible()
    await expect(page.getByText(/1\/16 grid/)).toBeVisible()
  })

  test('"Arrangement" back link returns to /projects/:id', async ({ page, request }) => {
    const u = await apiSignup(request)
    const { proj, clip } = await provisionClip(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}/clips/${clip.id}`)
    await page
      .getByRole('link', { name: /^Arrangement$/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`/projects/${proj.id}$`))
  })

  test('clicking the grid POSTs /api/midi-notes and renders a new note (read-after-write)', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const { proj, clip } = await provisionClip(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}/clips/${clip.id}`)
    await page.waitForLoadState('networkidle')
    const grid = page.getByRole('button', { name: /click to add a note/i })
    await expect(grid).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      const box = await grid.boundingBox()
      if (!box) throw new Error('grid has no bbox')
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(1500)
    })
    const post = whereUrl(reqs, /\/api\/midi[-_]notes/, 'POST')
    expect(post.length, 'POST /api/midi-notes fired').toBeGreaterThan(0)
    expect(post[0].status).toBe(201)
    const api = authedApi(request, u.accessToken!)
    const clipRes = await api.get(`/clips/${clip.id}`)
    const clipBody = await clipRes.json()
    const obj = clipBody.midi_notes ? clipBody : (clipBody.data ?? clipBody.props ?? clipBody)
    expect(Array.isArray(obj.midi_notes), 'clip has midi_notes array').toBe(true)
    expect(obj.midi_notes.length, 'one note persisted').toBeGreaterThanOrEqual(1)
  })

  test('clicking an existing note DELETEs it (read-after-write)', async ({ page, request }) => {
    const u = await apiSignup(request)
    const { proj, clip } = await provisionClip(request, u.accessToken!)
    const api = authedApi(request, u.accessToken!)
    const noteRes = await api.post('/midi-notes', {
      clip_id: clip.id,
      pitch: 60,
      velocity: 100,
      start: 0,
      duration: 0.5,
    })
    expect(noteRes.status()).toBe(201)
    await loginThenGoto(page, u, `/projects/${proj.id}/clips/${clip.id}`)
    await page.waitForLoadState('networkidle')
    const noteBtn = page.getByRole('button', { name: /pitch 60/i })
    await expect(noteBtn).toBeVisible({ timeout: 5_000 })
    const reqs = await captureNetwork(page, async () => {
      await noteBtn.click()
      await page.waitForTimeout(1500)
    })
    const del = whereUrl(reqs, /\/api\/midi[-_]notes\/[a-f0-9-]+/, 'DELETE')
    expect(del.length, 'DELETE fired').toBeGreaterThan(0)
    const after = await api.get(`/clips/${clip.id}`)
    const body = await after.json()
    const obj = body.midi_notes ? body : (body.data ?? body.props ?? body)
    expect(obj.midi_notes.length).toBe(0)
  })

  test('clip-missing fallback is shown for an invalid clipId', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}/clips/00000000-0000-0000-0000-000000000000`)
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: /^Arrangement$/i }).first()).toBeVisible()
  })

  test('initial load fetches GET /api/clips/:id', async ({ page, request }) => {
    const u = await apiSignup(request)
    const { proj, clip } = await provisionClip(request, u.accessToken!)
    const reqs = await captureNetwork(page, async () => {
      await loginThenGoto(page, u, `/projects/${proj.id}/clips/${clip.id}`)
      await page.waitForLoadState('networkidle')
    })
    expect(whereUrl(reqs, new RegExp(`/api/clips/${clip.id}`), 'GET').length).toBeGreaterThan(0)
  })

  test('after adding a note, the velocity-lane visualisation renders bars', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const { proj, clip } = await provisionClip(request, u.accessToken!)
    const api = authedApi(request, u.accessToken!)
    await api.post('/midi-notes', {
      clip_id: clip.id,
      pitch: 60,
      velocity: 100,
      start: 0,
      duration: 0.5,
    })
    await loginThenGoto(page, u, `/projects/${proj.id}/clips/${clip.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/velocity/i)).toBeVisible()
  })

  test('header note-count reflects the actual count of notes on the clip', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const { proj, clip } = await provisionClip(request, u.accessToken!)
    const api = authedApi(request, u.accessToken!)
    await api.post('/midi-notes', {
      clip_id: clip.id,
      pitch: 60,
      velocity: 100,
      start: 0,
      duration: 0.5,
    })
    await api.post('/midi-notes', {
      clip_id: clip.id,
      pitch: 64,
      velocity: 100,
      start: 0.5,
      duration: 0.5,
    })
    await loginThenGoto(page, u, `/projects/${proj.id}/clips/${clip.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /piano roll · 2 notes/i })).toBeVisible()
  })
})
