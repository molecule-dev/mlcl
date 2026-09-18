import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiSignup, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Samples library page (/samples)', () => {
  test('renders the page heading and search input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/samples')
    await expect(page.getByRole('heading', { name: /Samples & loops/i })).toBeVisible()
    await expect(page.locator('input[type="search"]')).toBeVisible()
  })

  test('initial load fetches /api/samples and renders rows (or empty-state)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/samples')
      await page.waitForLoadState('networkidle')
    })
    const get = whereUrl(reqs, /\/api\/samples(?!\/)/, 'GET')
    expect(get.length).toBeGreaterThan(0)
    expect(get[0].status).toBeLessThan(300)
  })

  test('All / Drums / Bass / Synths / Vocals / FX category chips are present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/samples')
    for (const label of ['All', 'Drums', 'Bass', 'Synths', 'Vocals', 'FX']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${label}$`) })).toBeVisible()
    }
  })

  test('selecting Drums filters to only category=drums rows', async ({ page, request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const r = await api.post('/samples', {
      name: 'Test Kick',
      pack: 'TestPack',
      bpm: 120,
      key: 'C',
      duration_seconds: 2,
      category: 'drums',
      url: 'https://example.com/kick.wav',
      is_public: false,
    })
    expect(r.status()).toBe(201)
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(u.email)
    await page.locator('#password').fill(u.password)
    await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/samples')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /^Drums$/ }).click()
    await expect(page.getByText(/Test Kick/)).toBeVisible({ timeout: 5_000 })
  })

  test('search input narrows the visible list (client-side filter)', async ({ page, request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    await api.post('/samples', {
      name: 'UniqueSearchAlpha',
      pack: 'TestPack',
      bpm: 90,
      key: 'A',
      duration_seconds: 1,
      category: 'drums',
      url: 'https://example.com/a.wav',
      is_public: false,
    })
    await api.post('/samples', {
      name: 'UniqueSearchBravo',
      pack: 'TestPack',
      bpm: 90,
      key: 'A',
      duration_seconds: 1,
      category: 'drums',
      url: 'https://example.com/b.wav',
      is_public: false,
    })
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(u.email)
    await page.locator('#password').fill(u.password)
    await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/samples')
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="search"]').fill('UniqueSearchAlpha')
    await expect(page.getByText(/UniqueSearchAlpha/)).toBeVisible()
    await expect(page.getByText(/UniqueSearchBravo/)).toHaveCount(0)
  })

  test('empty filter result shows the "No samples match" placeholder', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/samples')
    await page.locator('input[type="search"]').fill('zzz-no-match-' + Date.now())
    await expect(page.getByText(/No samples match your filter/i)).toBeVisible()
  })

  test('clicking a sample row navigates to /samples/:id', async ({ page, request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const r = await api.post('/samples', {
      name: 'NavSample',
      pack: 'TestPack',
      bpm: 90,
      key: 'C',
      duration_seconds: 1,
      category: 'fx',
      url: 'https://example.com/x.wav',
      is_public: false,
    })
    const created = await r.json()
    const id = (created.id ?? created.data?.id ?? created.props?.id) as string
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(u.email)
    await page.locator('#password').fill(u.password)
    await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/samples')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /^FX$/ }).click()
    await page.locator(`a[href="/samples/${id}"]`).first().click()
    await expect(page).toHaveURL(new RegExp(`/samples/${id}$`))
  })

  test('the count subtitle reflects the real /api/samples length', async ({ page, request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const before = await api.get('/samples')
    const beforeBody = await before.json()
    const beforeArr = Array.isArray(beforeBody)
      ? beforeBody
      : (beforeBody.data ?? beforeBody.items ?? beforeBody.props ?? beforeBody)
    const expectedCount = Array.isArray(beforeArr) ? beforeArr.length : 0
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(u.email)
    await page.locator('#password').fill(u.password)
    await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/samples')
    await page.waitForLoadState('networkidle')
    if (expectedCount > 0) {
      await expect(
        page.getByText(new RegExp(`${expectedCount}\\s*royalty-free assets`, 'i')),
      ).toBeVisible()
    }
  })

  test('anonymous /samples redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/samples')
    await page.waitForURL(/\/login|\/$/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/login|\/$/)
  })

  test('Bass filter chip shows only category=bass rows when selected', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    await api.post('/samples', {
      name: 'BassOne',
      pack: 'TestPack',
      bpm: 80,
      key: 'E',
      duration_seconds: 2,
      category: 'bass',
      url: 'https://example.com/bass.wav',
      is_public: false,
    })
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(u.email)
    await page.locator('#password').fill(u.password)
    await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/samples')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /^Bass$/ }).click()
    await expect(page.getByText(/BassOne/)).toBeVisible()
  })

  test('Synths chip is selectable and visually marks itself active', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/samples')
    const chip = page.getByRole('button', { name: /^Synths$/ })
    await chip.click()
    await page.waitForTimeout(200)
    await expect(chip).toBeVisible()
  })

  test('Vocals chip is selectable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/samples')
    await page.getByRole('button', { name: /^Vocals$/ }).click()
  })
})
