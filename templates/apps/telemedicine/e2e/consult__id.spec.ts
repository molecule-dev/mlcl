import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  escapeRegExp,
  getVitalsSnapshot,
  signup,
} from './_helpers.js'

test.describe('/consult/:id — Live consult', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/consult/some-id')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Renders patient panel + Notes textarea + call controls + Live indicator', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const list = await page.request.get(`${API_BASE}/appointments`, {
      headers: apiHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ id: string }>
    const id = items[0]!.id
    await page.goto(`${APP_BASE}/consult/${id}`)
    await expect(page.getByRole('heading', { name: /Test User/i }).first()).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('[data-mol-id="consult-notes"]')).toBeVisible()
    await expect(page.locator('body')).toContainText(/Live/i)
    await expect(page.getByRole('button', { name: /End call/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Mute/i })).toBeVisible()
  })

  test('Notes autosave: typing posts a debounced PUT /api/appointments/:id with the body', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const list = await page.request.get(`${API_BASE}/appointments`, {
      headers: apiHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ id: string }>
    const id = items[0]!.id
    await page.goto(`${APP_BASE}/consult/${id}`)
    const ta = page.locator('[data-mol-id="consult-notes"]')
    await expect(ta).toBeVisible({ timeout: 15000 })

    const reqs = await captureNetwork(page, async () => {
      await ta.fill('SOAP: alert and oriented; HR 76; rec follow-up in 2w')
      // Saved indicator surfaces after debounce + persist.
      await expect(page.locator('[data-mol-id="consult-notes-status"]')).toContainText(/Saved/i, {
        timeout: 10000,
      })
    })
    const hit = reqs.find((r) => r.method === 'PUT' && r.url.includes(`/api/appointments/${id}`))
    expect(hit, 'typing in notes must trigger PUT /api/appointments/:id').toBeTruthy()
    expect(hit!.status).toBeLessThan(400)
  })

  test('Notes persist across reload (round-trip persistence)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const list = await page.request.get(`${API_BASE}/appointments`, {
      headers: apiHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ id: string }>
    const id = items[0]!.id
    await page.goto(`${APP_BASE}/consult/${id}`)
    const ta = page.locator('[data-mol-id="consult-notes"]')
    const sentinel = `auto-test-${Date.now()}-roundtrip`
    await ta.fill(sentinel)
    await expect(page.locator('[data-mol-id="consult-notes-status"]')).toContainText(/Saved/i, {
      timeout: 10000,
    })

    await page.reload()
    await expect(page.locator('[data-mol-id="consult-notes"]')).toHaveValue(sentinel, {
      timeout: 15000,
    })
  })

  test('End call confirms then navigates to /appointments', async ({ page }) => {
    const { accessToken } = await signup(page)
    const list = await page.request.get(`${API_BASE}/appointments`, {
      headers: apiHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ id: string }>
    const id = items[0]!.id
    await page.goto(`${APP_BASE}/consult/${id}`)
    const endCall = page.getByRole('button', { name: /End call/i })
    await expect(endCall).toBeVisible({ timeout: 15000 })
    // ConfirmButton arm/commit: the first click arms (native confirm is gone),
    // the button flips to the confirm label; the second click commits.
    await endCall.click()
    const armed = page.getByRole('button', { name: /End this consult/i })
    await expect(armed).toBeVisible()
    await armed.click()
    await expect(page).toHaveURL(/\/appointments$/, { timeout: 10000 })
  })

  test('Vitals chips render every measure /api/reports/vitals-snapshot returns', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const list = await page.request.get(`${API_BASE}/appointments`, {
      headers: apiHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ id: string }>
    const id = items[0]!.id
    // Which measures the last lab carries is clinical data — read the chips
    // from the same endpoint the consult panel reads.
    const chips = await getVitalsSnapshot(page, accessToken)
    await page.goto(`${APP_BASE}/consult/${id}`)
    for (const chip of chips) {
      await expect(page.getByText(new RegExp(escapeRegExp(chip.label), 'i')).first()).toBeVisible({
        timeout: 15000,
      })
    }
  })
})
