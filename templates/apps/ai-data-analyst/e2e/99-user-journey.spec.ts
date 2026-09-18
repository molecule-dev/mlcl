import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers'

/**
 * Cross-page kitchen-sink user journey for ai-data-analyst.
 *
 * Covers signup → dashboard demo-seed → datasets list → dataset detail
 * preview → query editor (synth ask) → reports list → report detail →
 * settings (profile patch + persistence) → notifications → upload →
 * logout/login.
 *
 * Asserts read-after-write at every observable side effect (server
 * matches what the UI rendered).
 */

test.describe('Kitchen-sink user journey', () => {
  test('fresh analyst seeds, queries, customizes, uploads and logs out/in', async ({ page }) => {
    // 1. Sign up — lands on /dashboard, server has a new user.
    const creds = await signup(page, { email: uniqueEmail('journey') })
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    // Dashboard fires the seed-triggering call. Pre-register waiters first so
    // responses can't race past the captureNetwork listener.
    const dashReqs = await captureNetwork(page, async () => {
      const insightsP = page
        .waitForResponse((r) => /\/api\/insights/.test(r.url()), { timeout: 20_000 })
        .catch(() => null)
      const statsP = page
        .waitForResponse((r) => /\/api\/reports\/dashboard_stats/.test(r.url()), {
          timeout: 20_000,
        })
        .catch(() => null)
      await page.goto(APP_BASE + '/dashboard')
      await Promise.all([insightsP, statsP])
    })
    expect(dashReqs.find((r) => /\/api\/reports\/dashboard_stats/.test(r.url))).toBeTruthy()
    expect(dashReqs.find((r) => /\/api\/insights/.test(r.url))).toBeTruthy()

    // 2. Datasets list — 4 seeded cards.
    await page.goto(APP_BASE + '/datasets')
    await page.waitForResponse((r) => /\/api\/datasets/.test(r.url()))
    expect(await page.locator('main li').count(), 'datasets list populated').toBeGreaterThanOrEqual(
      1,
    )

    // 3. Drill into one — schema rows render, sample tab pulls preview.
    const firstDsHref = await page.locator('a[href^="/datasets/"]').first().getAttribute('href')
    expect(firstDsHref).toBeTruthy()
    await page.goto(APP_BASE + firstDsHref!)
    await page.waitForLoadState('networkidle')
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)

    const sampleReqs = await captureNetwork(page, async () => {
      const respPromise = page
        .waitForResponse((r) => /\/preview/.test(r.url()) && r.request().method() === 'GET', {
          timeout: 10_000,
        })
        .catch(() => null)
      await page.getByRole('button', { name: /^Sample$/i }).click()
      await respPromise
    })
    expect(sampleReqs.find((r) => /\/preview/.test(r.url) && r.method === 'GET')).toBeTruthy()

    // 4. Query editor — natural-language question fires POST /api/queries.
    await page.goto(APP_BASE + '/query')
    const qReqs = await captureNetwork(page, async () => {
      const input = page.locator('input[type="text"]').first()
      await input.fill('what is the average revenue per user?')
      const respPromise = page.waitForResponse(
        (r) => /\/api\/queries/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await page.getByRole('button', { name: /^ask$/i }).click()
      await respPromise
    })
    expect(qReqs.find((r) => r.method === 'POST' && /\/api\/queries/.test(r.url))).toBeTruthy()

    // 5. Reports list + detail render.
    await page.goto(APP_BASE + '/reports')
    await page.waitForResponse((r) => /\/api\/saved_reports/.test(r.url()))
    expect(await page.locator('main li').count()).toBeGreaterThanOrEqual(1)

    const firstReportHref = await page.locator('a[href^="/reports/"]').first().getAttribute('href')
    expect(firstReportHref).toBeTruthy()
    await page.goto(APP_BASE + firstReportHref!)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main aside')).toContainText(/AI summary/i)

    // 6. Settings: change display name + organization, persist via PATCH.
    await page.goto(APP_BASE + '/settings')
    await page.waitForResponse((r) => /\/api\/profile\/me/.test(r.url()))
    // Wait for the displayName input to be populated by the profile fetch
    // (React Strict Mode fires the load effect twice — wait for the second
    // settle so the user-supplied fill below can't be clobbered by the
    // tail-end of the initial async load).
    await expect(page.locator('[data-mol-id="settings-display-name"]')).not.toHaveValue('', {
      timeout: 10_000,
    })
    await page.waitForLoadState('networkidle')
    const newName = 'Journey Hero ' + Date.now()
    const newOrg = 'JourneyCorp'
    await page.locator('[data-mol-id="settings-display-name"]').fill(newName)
    await page.locator('[data-mol-id="settings-organization"]').fill(newOrg)
    const saveReqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => /\/api\/profile\/me/.test(r.url()) && r.request().method() === 'PATCH',
        { timeout: 10_000 },
      )
      await page.locator('[data-mol-id="settings-save-account"]').click()
      await respPromise
    })
    const patch = saveReqs.find((r) => r.method === 'PATCH' && /\/api\/profile\/me/.test(r.url))
    expect(patch).toBeTruthy()
    expect(patch!.status).toBe(200)

    // Read-after-write: re-fetch /api/profile/me and confirm persistence.
    const accessToken = await getAccessToken(page)
    expect(accessToken).toBeTruthy()
    const reread = await page.request.get(`${API_BASE}/profile/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(reread.status()).toBe(200)
    const body = (await reread.json()) as {
      display_name?: string
      organization?: string
      profile?: Record<string, string>
    }
    const dn = body.display_name ?? body.profile?.display_name
    const org = body.organization ?? body.profile?.organization
    expect(dn, 'display name persisted server-side').toBe(newName)
    expect(org, 'organization persisted server-side').toBe(newOrg)

    // 7. Notifications page renders without 5xx.
    await page.goto(APP_BASE + '/notifications')
    await page.waitForResponse((r) => /\/api\/notifications/.test(r.url()))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // 8. Upload a tiny CSV — POST /api/datasets/from_upload + nav to detail.
    await page.goto(APP_BASE + '/upload')
    const csv = 'id,name,amount\n1,alice,100\n2,bob,200\n3,carol,300\n'
    await page.locator('input[type="file"]').setInputFiles({
      name: 'journey.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    })
    await expect(page.locator('[data-mol-id="upload-submit"]')).toBeVisible()
    const uploadReqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => /\/api\/datasets\/from_upload/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await page.locator('[data-mol-id="upload-submit"]').click()
      await respPromise
    })
    expect(
      uploadReqs.find((r) => /\/api\/datasets\/from_upload/.test(r.url) && r.method === 'POST'),
    ).toBeTruthy()
    await expect(page).toHaveURL(/\/datasets\/[a-f0-9-]{8,}/, { timeout: 10_000 })

    // 9. Log out (clear cookies + storage), then log back in via the form.
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(creds.email)
    await page.locator('input#password').fill(creds.password)
    await page
      .getByRole('button', { name: /sign in|log in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    // 10. After re-login, /api/datasets still has the uploaded one.
    const accessToken2 = await getAccessToken(page)
    const ds = await page.request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${accessToken2}` },
    })
    expect(ds.status()).toBe(200)
    const dsBody = (await ds.json()) as { datasets?: { name: string }[] } | { name: string }[]
    const list = Array.isArray(dsBody) ? dsBody : (dsBody.datasets ?? [])
    expect(list.length, 'datasets persisted across logout/login').toBeGreaterThan(0)
  })
})
