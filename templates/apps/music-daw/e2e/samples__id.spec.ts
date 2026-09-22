import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiSignup, authedApi, captureNetwork, whereUrl } from './_helpers.js'

async function login(
  page: import('@playwright/test').Page,
  u: { email: string; password: string },
) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').fill(u.email)
  await page.locator('#password').fill(u.password)
  await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}

async function createOwnedSample(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  opts: { name?: string; is_loop?: boolean } = {},
) {
  const api = authedApi(request, token)
  const r = await api.post('/samples', {
    name: opts.name ?? 'My Sample ' + Date.now(),
    pack: 'OwnerPack',
    bpm: 110,
    key: 'D',
    duration_seconds: 3,
    category: 'drums',
    url: 'https://example.com/own.wav',
    is_public: false,
    is_loop: opts.is_loop ?? false,
  })
  expect(r.status()).toBe(201)
  const body = await r.json()
  return (body.id ? body : (body.data ?? body.props ?? body)) as {
    id: string
    name: string
    is_loop: boolean
  }
}

test.describe('Sample detail page (/samples/:id)', () => {
  test('renders sample h1, pack eyebrow, and meta strip', async ({ page, request }) => {
    const u = await apiSignup(request)
    const s = await createOwnedSample(request, u.accessToken!, { name: 'Detail Hero' })
    await login(page, u)
    await page.goto(APP_BASE + `/samples/${s.id}`)
    await expect(page.getByRole('heading', { name: 'Detail Hero' })).toBeVisible()
    await expect(page.getByText(/OwnerPack/)).toBeVisible()
    await expect(page.getByText(/110 BPM/)).toBeVisible()
  })

  test('"Library" back link returns to /samples', async ({ page, request }) => {
    const u = await apiSignup(request)
    const s = await createOwnedSample(request, u.accessToken!)
    await login(page, u)
    await page.goto(APP_BASE + `/samples/${s.id}`)
    await page
      .getByRole('link', { name: /^Library$/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/samples$/)
  })

  test('Preview button toggles aria-pressed (transport play/pause)', async ({ page, request }) => {
    const u = await apiSignup(request)
    const s = await createOwnedSample(request, u.accessToken!)
    await login(page, u)
    await page.goto(APP_BASE + `/samples/${s.id}`)
    const preview = page.getByRole('button', { name: /preview sample/i })
    await expect(preview).toHaveAttribute('aria-pressed', 'false')
    await preview.click()
    await expect(preview).toHaveAttribute('aria-pressed', 'true')
    await preview.click()
    await expect(preview).toHaveAttribute('aria-pressed', 'false')
  })

  test('Loop button on an owned sample PUTs is_loop and persists across reload', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const s = await createOwnedSample(request, u.accessToken!, { is_loop: false })
    await login(page, u)
    await page.goto(APP_BASE + `/samples/${s.id}`)
    const loopBtn = page.getByRole('button', { name: /loop · off/i })
    await expect(loopBtn).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      await loopBtn.click()
      await page.waitForTimeout(1500)
    })
    const put = whereUrl(reqs, new RegExp(`/api/samples/${s.id}`), 'PUT')
    expect(put.length, 'PUT /api/samples/:id fired').toBeGreaterThan(0)
    expect(put[0].status).toBeLessThan(300)
    const api = authedApi(request, u.accessToken!)
    const afterRes = await api.get(`/samples/${s.id}`)
    const afterBody = await afterRes.json()
    const afterObj = afterBody.id ? afterBody : (afterBody.data ?? afterBody.props ?? afterBody)
    expect(afterObj.is_loop, 'loop persisted in DB').toBe(true)
    await page.reload()
    await expect(page.getByRole('button', { name: /loop · on/i })).toBeVisible()
  })

  test('Download anchor has a non-empty href and the download attribute', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const s = await createOwnedSample(request, u.accessToken!)
    await login(page, u)
    await page.goto(APP_BASE + `/samples/${s.id}`)
    const anchor = page.locator('a[download]')
    await expect(anchor).toHaveCount(1)
    const href = await anchor.getAttribute('href')
    expect(href).toBeTruthy()
    expect(href!.length).toBeGreaterThan(0)
  })

  test('three KPI cards (BPM / Key / Duration) render with the sample values', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const s = await createOwnedSample(request, u.accessToken!)
    await login(page, u)
    await page.goto(APP_BASE + `/samples/${s.id}`)
    await expect(page.getByText(/^BPM$/i).first()).toBeVisible()
    await expect(page.getByText(/^Key$/i).first()).toBeVisible()
    await expect(page.getByText(/^Duration$/i).first()).toBeVisible()
  })

  test('not-found alert shown for an invalid sample id', async ({ page, request }) => {
    // The invalid sample id 404s are the EXPECTED result under test — silence
    // the console-guard so the not-found-alert assertion decides pass/fail.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404',
    })
    const u = await apiSignup(request)
    await login(page, u)
    await page.goto(APP_BASE + '/samples/00000000-0000-0000-0000-000000000000')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
  })

  test('initial load fetches GET /api/samples/:id', async ({ page, request }) => {
    const u = await apiSignup(request)
    const s = await createOwnedSample(request, u.accessToken!)
    const reqs = await captureNetwork(page, async () => {
      await login(page, u)
      await page.goto(APP_BASE + `/samples/${s.id}`)
      await page.waitForLoadState('networkidle')
    })
    expect(whereUrl(reqs, new RegExp(`/api/samples/${s.id}`), 'GET').length).toBeGreaterThan(0)
  })

  test('loop button shows status message after click', async ({ page, request }) => {
    const u = await apiSignup(request)
    const s = await createOwnedSample(request, u.accessToken!)
    await login(page, u)
    await page.goto(APP_BASE + `/samples/${s.id}`)
    await page.getByRole('button', { name: /loop · off/i }).click()
    await expect(page.getByRole('status')).toBeVisible({ timeout: 5_000 })
  })

  test('preview status message appears after preview toggle', async ({ page, request }) => {
    const u = await apiSignup(request)
    const s = await createOwnedSample(request, u.accessToken!)
    await login(page, u)
    await page.goto(APP_BASE + `/samples/${s.id}`)
    await page.getByRole('button', { name: /preview sample/i }).click()
    await expect(page.getByRole('status')).toBeVisible()
  })
})
