import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiSignup, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Settings page (/settings)', () => {
  test('renders the Settings heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^Settings$/ })).toBeVisible()
  })

  test('handle, city and bio fields are visible and editable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('#settings-handle')).toBeVisible()
    await expect(page.locator('#settings-city')).toBeVisible()
    await expect(page.locator('#settings-bio')).toBeVisible()
    await page.locator('#settings-city').fill('Lisbon')
    await expect(page.locator('#settings-city')).toHaveValue('Lisbon')
  })

  test('"Save profile" PUTs /api/preferences and shows status, persists across reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const newCity = 'PersistCity-' + Date.now()
    await page.locator('#settings-city').fill(newCity)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save profile/i }).click()
      await expect(page.getByRole('status')).toBeVisible({ timeout: 5_000 })
    })
    const put = whereUrl(reqs, /\/api\/preferences/, 'PUT')
    expect(put.length, 'PUT /api/preferences fired').toBeGreaterThan(0)
    expect(put[0].status).toBeLessThan(300)
    await page.reload()
    await expect(page.locator('#settings-city')).toHaveValue(newCity)
  })

  test('changing the Output device combobox PUTs preferences with audioDevice', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const select = page.locator('select').first()
    const reqs = await captureNetwork(page, async () => {
      await select.selectOption({ index: 1 })
      await page.waitForTimeout(1500)
    })
    const put = whereUrl(reqs, /\/api\/preferences/, 'PUT')
    expect(put.length).toBeGreaterThan(0)
    const api = authedApi(request, session.accessToken!)
    const res = await api.get('/preferences')
    const body = (await res.json()) as { data?: Record<string, unknown> }
    expect(body.data?.audioDevice).toBeTruthy()
  })

  test('toggling Metronome switch persists through reload (read-after-write)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const switches = page.getByRole('switch')
    const metronome = switches.nth(0)
    const beforeAria = await metronome.getAttribute('aria-checked')
    await metronome.click()
    await page.waitForTimeout(1500)
    const afterAria = await metronome.getAttribute('aria-checked')
    expect(afterAria).not.toBe(beforeAria)
    const api = authedApi(request, session.accessToken!)
    const res = await api.get('/preferences')
    const body = (await res.json()) as { data?: { metronome?: boolean } }
    expect(body.data?.metronome).toBe(afterAria === 'true')
    await page.reload()
    await page.waitForLoadState('networkidle')
    const reloaded = page.getByRole('switch').nth(0)
    await expect(reloaded).toHaveAttribute('aria-checked', String(afterAria))
  })

  test('"Manage billing" link routes to /settings/billing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('link', { name: /manage billing/i }).click()
    await expect(page).toHaveURL(/\/settings\/billing$/)
  })

  test('initial load fetches GET /api/preferences', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
    })
    const get = whereUrl(reqs, /\/api\/preferences/, 'GET')
    expect(get.length).toBeGreaterThan(0)
    expect(get[0].status).toBeLessThan(300)
  })

  test('Sample rate combobox change persists', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const sampleRate = page.locator('select').nth(1)
    await sampleRate.selectOption({ index: 2 })
    await page.waitForTimeout(1500)
    const api = authedApi(request, session.accessToken!)
    const res = await api.get('/preferences')
    const body = (await res.json()) as { data?: { sampleRate?: string } }
    expect(body.data?.sampleRate).toBeTruthy()
  })

  test('Buffer size combobox change persists', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const bufferSize = page.locator('select').nth(2)
    await bufferSize.selectOption({ index: 1 })
    await page.waitForTimeout(1500)
    const api = authedApi(request, session.accessToken!)
    const res = await api.get('/preferences')
    const body = (await res.json()) as { data?: { bufferSize?: string } }
    expect(body.data?.bufferSize).toBeTruthy()
  })

  test('MIDI controller combobox change persists', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const midi = page.locator('select').nth(3)
    await midi.selectOption({ index: 1 })
    await page.waitForTimeout(1500)
    const api = authedApi(request, session.accessToken!)
    const res = await api.get('/preferences')
    const body = (await res.json()) as { data?: { midiInput?: string } }
    expect(body.data?.midiInput).toBeTruthy()
  })

  test('Auto-save toggle persists', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const autoSave = page.getByRole('switch').nth(1)
    await autoSave.click()
    await page.waitForTimeout(1500)
    const api = authedApi(request, session.accessToken!)
    const res = await api.get('/preferences')
    const body = (await res.json()) as { data?: { autoSave?: boolean } }
    expect(typeof body.data?.autoSave).toBe('boolean')
  })

  test('Push notifications toggle persists', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const pushSwitch = page.getByRole('switch').nth(2)
    await pushSwitch.click()
    await page.waitForTimeout(1500)
    const api = authedApi(request, session.accessToken!)
    const res = await api.get('/preferences')
    const body = (await res.json()) as { data?: { pushNotifications?: boolean } }
    expect(typeof body.data?.pushNotifications).toBe('boolean')
  })

  test('keyboard shortcuts list is rendered', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByText(/play.*pause/i).first()).toBeVisible()
    await expect(page.getByText(/Record arm/i)).toBeVisible()
  })

  test('anonymous /settings redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForURL(/\/login|\/$/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/login|\/$/)
  })

  test('GET /api/preferences direct API call returns the saved data shape', async ({ request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    await api.put('/preferences', { data: { audioDevice: 'Test Device' } })
    const res = await api.get('/preferences')
    expect(res.status()).toBeLessThan(300)
    const body = (await res.json()) as { data?: Record<string, unknown> }
    expect(body.data?.audioDevice).toBe('Test Device')
  })
})
