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

test.describe('Editor page (/projects/:id)', () => {
  test('renders the project name h1 and BPM/time-sig meta', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!, {
      name: 'Editor Test ' + Date.now(),
      bpm: 130,
    })
    await loginThenGoto(page, u, `/projects/${proj.id}`)
    await expect(page.getByRole('heading', { name: proj.name })).toBeVisible()
    await expect(page.getByText(/130 BPM/)).toBeVisible()
  })

  test('"All projects" back link routes to /projects', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}`)
    await page
      .getByRole('link', { name: /all projects/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('"Open mixer" link routes to /projects/:id/mix', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}`)
    await page.getByRole('link', { name: /open mixer/i }).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${proj.id}/mix$`))
  })

  test('toolbar buttons toggle aria-pressed=true on selection', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}`)
    const pencil = page.getByRole('button', { name: /^Pencil$/ })
    await pencil.click()
    await expect(pencil).toHaveAttribute('aria-pressed', 'true')
    const select = page.getByRole('button', { name: /^Select$/ })
    await select.click()
    await expect(select).toHaveAttribute('aria-pressed', 'true')
    await expect(pencil).toHaveAttribute('aria-pressed', 'false')
  })

  test('"Add audio track" POSTs /api/tracks with type=audio and shows the track', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}`)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /add audio track/i }).click()
      await page.waitForTimeout(1000)
    })
    const post = whereUrl(reqs, /\/api\/tracks(?!\/)/, 'POST')
    expect(post.length, 'POST /api/tracks fired').toBeGreaterThan(0)
    expect(post[0].status).toBe(201)
    const api = authedApi(request, u.accessToken!)
    const tracksRes = await api.get(`/tracks?project_id=${proj.id}`)
    const data = await tracksRes.json()
    const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? data.props ?? data)
    expect(arr.length, 'one track persisted').toBeGreaterThanOrEqual(1)
    expect(arr[0].type).toBe('audio')
  })

  test('"Add MIDI track" POSTs /api/tracks with type=midi', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}`)
    await page.getByRole('button', { name: /add MIDI track/i }).click()
    await page.waitForTimeout(1500)
    const api = authedApi(request, u.accessToken!)
    const tracksRes = await api.get(`/tracks?project_id=${proj.id}`)
    const data = await tracksRes.json()
    const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? data.props ?? data)
    expect(arr.some((t: { type: string }) => t.type === 'midi')).toBe(true)
  })

  test('empty-tracks placeholder is shown on a brand-new project', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}`)
    await expect(page.getByText(/No tracks yet/i)).toBeVisible()
  })

  test('"Open piano roll" navigates to /projects/:id/clips/:clipId after adding a track', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await addTrack(request, u.accessToken!, proj.id, { name: 'Lead', type: 'midi' })
    await loginThenGoto(page, u, `/projects/${proj.id}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /open piano roll/i }).click()
    await page.waitForURL(new RegExp(`/projects/${proj.id}/clips/[^/]+`), { timeout: 10_000 })
    expect(page.url()).toMatch(new RegExp(`/projects/${proj.id}/clips/[a-f0-9-]+`))
  })

  test('reload after adding a track shows the same track (persistence invariant)', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await addTrack(request, u.accessToken!, proj.id, { name: 'Bass Persist Test', type: 'audio' })
    await loginThenGoto(page, u, `/projects/${proj.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Bass Persist Test/)).toBeVisible({ timeout: 10_000 })
    await page.reload()
    await expect(page.getByText(/Bass Persist Test/)).toBeVisible({ timeout: 10_000 })
  })

  test('initial load fetches GET /api/projects/:id and GET /api/tracks?project_id=', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    const reqs = await captureNetwork(page, async () => {
      await loginThenGoto(page, u, `/projects/${proj.id}`)
      await page.waitForLoadState('networkidle')
    })
    expect(whereUrl(reqs, new RegExp(`/api/projects/${proj.id}`), 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/tracks/, 'GET').length).toBeGreaterThan(0)
  })

  test('anonymous /projects/:id redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/projects/00000000-0000-0000-0000-000000000000')
    await page.waitForURL(/\/login|\/$/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/login|\/$/)
  })
})
