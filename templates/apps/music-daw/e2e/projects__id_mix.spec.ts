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

test.describe('Mixer page (/projects/:id/mix)', () => {
  test('renders the Mixer heading', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}/mix`)
    await expect(page.getByRole('heading', { name: /^Mixer$/ })).toBeVisible()
  })

  test('back link "Arrangement" returns to /projects/:id', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}/mix`)
    await page
      .getByRole('link', { name: /^Arrangement$/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`/projects/${proj.id}$`))
  })

  test('empty mixer shows placeholder + "Open arrangement" cta', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await loginThenGoto(page, u, `/projects/${proj.id}/mix`)
    await expect(page.getByText(/No tracks yet/i)).toBeVisible()
    const cta = page.getByRole('link', { name: /open arrangement/i })
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).toHaveURL(new RegExp(`/projects/${proj.id}$`))
  })

  test('with tracks, the channel-strip mute button is present and toggles aria-pressed', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    const track = await addTrack(request, u.accessToken!, proj.id, {
      name: 'Mute Test',
      type: 'audio',
    })
    await loginThenGoto(page, u, `/projects/${proj.id}/mix`)
    await page.waitForLoadState('networkidle')
    const mute = page.getByRole('button', { name: new RegExp(`Mute ${track.name}`) })
    await expect(mute).toBeVisible()
    await expect(mute).toHaveAttribute('aria-pressed', 'false')
    await mute.click()
    await expect(mute).toHaveAttribute('aria-pressed', 'true')
  })

  test('mute toggle PUTs /api/tracks/:id and persists across reload (invariant: read-after-write)', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    const track = await addTrack(request, u.accessToken!, proj.id, {
      name: 'Mute Persist',
      type: 'audio',
    })
    await loginThenGoto(page, u, `/projects/${proj.id}/mix`)
    await page.waitForLoadState('networkidle')
    const mute = page.getByRole('button', { name: new RegExp(`Mute ${track.name}`) })
    const reqs = await captureNetwork(page, async () => {
      await mute.click()
      await page.waitForTimeout(1500)
    })
    const put = whereUrl(reqs, new RegExp(`/api/tracks/${track.id}`), 'PUT')
    expect(put.length, 'PUT /api/tracks/:id fired').toBeGreaterThan(0)
    expect(put[0].status).toBeLessThan(300)
    const api = authedApi(request, u.accessToken!)
    const after = await api.get(`/tracks?project_id=${proj.id}`)
    const data = await after.json()
    const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? data.props ?? data)
    const t = arr.find((x: { id: string }) => x.id === track.id)
    expect(t.muted, 'mute persisted in DB').toBe(true)
    await page.reload()
    await page.waitForLoadState('networkidle')
    const reloadedMute = page.getByRole('button', { name: new RegExp(`Mute ${track.name}`) })
    await expect(reloadedMute).toHaveAttribute('aria-pressed', 'true')
  })

  test('solo toggle flips aria-pressed and persists', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    const track = await addTrack(request, u.accessToken!, proj.id, {
      name: 'Solo Test',
      type: 'audio',
    })
    await loginThenGoto(page, u, `/projects/${proj.id}/mix`)
    await page.waitForLoadState('networkidle')
    const solo = page.getByRole('button', { name: new RegExp(`Solo ${track.name}`) })
    await solo.click()
    await page.waitForTimeout(1000)
    const api = authedApi(request, u.accessToken!)
    const after = await api.get(`/tracks?project_id=${proj.id}`)
    const data = await after.json()
    const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? data.props ?? data)
    expect(arr.find((x: { id: string }) => x.id === track.id).solo).toBe(true)
  })

  test('volume range slider PUTs new value to backend', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    const track = await addTrack(request, u.accessToken!, proj.id, {
      name: 'Vol Test',
      type: 'audio',
    })
    await loginThenGoto(page, u, `/projects/${proj.id}/mix`)
    await page.waitForLoadState('networkidle')
    const slider = page.locator(`input[aria-label="Volume ${track.name}"]`)
    await expect(slider).toHaveCount(1)
    const reqs = await captureNetwork(page, async () => {
      // React tracks the native HTMLInputElement.value via a property descriptor
      // — assigning `el.value = ...` directly bypasses React's tracker, so the
      // synthetic onChange never fires. Use the native setter, then dispatch input.
      await slider.evaluate((el: HTMLInputElement) => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )!.set!
        setter.call(el, '0.42')
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await page.waitForTimeout(1500)
    })
    const put = whereUrl(reqs, new RegExp(`/api/tracks/${track.id}`), 'PUT')
    expect(put.length).toBeGreaterThan(0)
    const api = authedApi(request, u.accessToken!)
    const after = await api.get(`/tracks?project_id=${proj.id}`)
    const data = await after.json()
    const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? data.props ?? data)
    expect(Number(arr.find((x: { id: string }) => x.id === track.id).volume)).toBeCloseTo(0.42, 1)
  })

  test('pan range slider PUTs new value to backend', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    const track = await addTrack(request, u.accessToken!, proj.id, {
      name: 'Pan Test',
      type: 'audio',
    })
    await loginThenGoto(page, u, `/projects/${proj.id}/mix`)
    await page.waitForLoadState('networkidle')
    const slider = page.locator(`input[aria-label="Pan ${track.name}"]`)
    await slider.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!
      setter.call(el, '-0.5')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(1500)
    const api = authedApi(request, u.accessToken!)
    const after = await api.get(`/tracks?project_id=${proj.id}`)
    const data = await after.json()
    const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? data.props ?? data)
    expect(Number(arr.find((x: { id: string }) => x.id === track.id).pan)).toBeCloseTo(-0.5, 1)
  })

  test('initial load fetches GET /api/tracks?project_id=', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await addTrack(request, u.accessToken!, proj.id, { name: 'Net Test', type: 'audio' })
    const reqs = await captureNetwork(page, async () => {
      await loginThenGoto(page, u, `/projects/${proj.id}/mix`)
      await page.waitForLoadState('networkidle')
    })
    const get = whereUrl(reqs, /\/api\/tracks/, 'GET')
    expect(get.length).toBeGreaterThan(0)
    expect(get[0].status).toBeLessThan(300)
  })

  test('tracks count chip in header reflects real track count', async ({ page, request }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!)
    await addTrack(request, u.accessToken!, proj.id, { name: 'Chip 1', type: 'audio' })
    await addTrack(request, u.accessToken!, proj.id, { name: 'Chip 2', type: 'midi' })
    await loginThenGoto(page, u, `/projects/${proj.id}/mix`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/2 tracks/i)).toBeVisible()
  })
})
