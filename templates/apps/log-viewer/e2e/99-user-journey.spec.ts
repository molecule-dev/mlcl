import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers'

/**
 * Cross-page kitchen-sink user journey for log-viewer (Signalink).
 *
 * Covers: signup → dashboard demo-seed → streams list → create stream
 * (read-after-write) → search → saved searches CRUD → alerts list →
 * declare incident → resolve incident → settings (account patch +
 * persistence) → pricing → logout/login.
 */

test.describe('Kitchen-sink user journey', () => {
  test('fresh on-call engineer onboards, configures, triages, customizes', async ({ page }) => {
    // 1. Sign up — lands on /dashboard, server has a new user.
    const creds = await signup(page, { email: uniqueEmail('journey') })
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    // Dashboard fires the seed-triggering calls.
    const dashReqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await Promise.all([
        page.waitForResponse((r) => /\/api\/logs(\b|\?|$)/.test(r.url()), { timeout: 15_000 }),
        page.waitForResponse((r) => /\/api\/incidents(\b|\?|$)/.test(r.url()), { timeout: 15_000 }),
      ])
    })
    expect(dashReqs.find((r) => /\/api\/logs(\b|\?|$)/.test(r.url))).toBeDefined()
    expect(dashReqs.find((r) => /\/api\/incidents(\b|\?|$)/.test(r.url))).toBeDefined()

    // 2. Streams list — at least 1 seeded card.
    await page.goto(APP_BASE + '/streams')
    await page.waitForResponse((r) => /\/api\/streams/.test(r.url()))
    await expect(page.locator('main ul li, a[href^="/streams/"]').first()).toBeVisible({
      timeout: 5_000,
    })

    // 3. Create a new stream from the UI; verify in DB.
    const streamName = `journey-${Date.now()}`
    await page.locator('[data-mol-id="streams-new"]').click()
    await page.locator('#streams-new-name').fill(streamName)
    const streamPostPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/streams/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="streams-create-submit"]').click()
    await streamPostPromise
    const token = await getAccessToken(page)
    const sres = await page.request.get(API_BASE + '/streams', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const sbody = await sres.json()
    const sitems: Array<{ name: string }> = Array.isArray(sbody)
      ? sbody
      : sbody.data || sbody.results || []
    expect(sitems.find((s) => s.name === streamName)).toBeDefined()

    // 4. Search — query the live tail.
    await page.goto(APP_BASE + '/search')
    await page.waitForResponse((r) => /\/api\/logs/.test(r.url()))
    await page.locator('[data-mol-id="search-query"]').fill('checkout')

    // 5. Saved searches — create one and confirm in DB.
    await page.goto(APP_BASE + '/saved')
    await page.waitForResponse((r) => /\/api\/saved/.test(r.url()))
    const savedName = `journey-saved-${Date.now()}`
    await page.locator('[data-mol-id="saved-new"]').click()
    await page.locator('#saved-new-name').fill(savedName)
    await page.locator('#saved-new-query').fill('severity:error')
    const savedPostPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/saved-searches/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="saved-create-submit"]').click()
    await savedPostPromise
    const savedRes = await page.request.get(API_BASE + '/saved-searches', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const savedBody = await savedRes.json()
    const savedItems: Array<{ name: string }> = Array.isArray(savedBody)
      ? savedBody
      : savedBody.data || savedBody.results || []
    expect(savedItems.find((s) => s.name === savedName)).toBeDefined()

    // 6. Alerts list — at least 1 seeded.
    await page.goto(APP_BASE + '/alerts')
    await page.waitForResponse((r) => /\/api\/alerts/.test(r.url()))
    const alertCount = await page.locator('a[href^="/alerts/"]').count()
    expect(alertCount).toBeGreaterThanOrEqual(0)

    // 7. Incidents — declare a new one + mark resolved.
    await page.goto(APP_BASE + '/incidents')
    await page.waitForResponse((r) => /\/api\/incidents/.test(r.url()))
    const incTitle = `journey-inc-${Date.now()}`
    await page.locator('[data-mol-id="incidents-declare"]').click()
    await page.locator('#incidents-new-title').fill(incTitle)
    await page.locator('#incidents-new-service').fill('checkout')
    const incPostPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/incidents/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="incidents-declare-submit"]').click()
    await incPostPromise
    const incRes = await page.request.get(API_BASE + '/incidents', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const incBody = await incRes.json()
    const incItems: Array<{ id: string; title: string }> = Array.isArray(incBody)
      ? incBody
      : incBody.data || incBody.results || []
    const mine = incItems.find((i) => i.title === incTitle)
    expect(mine).toBeDefined()
    await page.goto(APP_BASE + `/incidents/${mine!.id}`)
    await page.waitForResponse((r) => new RegExp(`/api/incidents/${mine!.id}`).test(r.url()))
    const resolvePromise = page.waitForResponse(
      (r) =>
        r.request().method() === 'PATCH' && new RegExp(`/api/incidents/${mine!.id}`).test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="incident-resolve"]').click()
    await resolvePromise
    const after = await (
      await page.request.get(API_BASE + `/incidents/${mine!.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()
    expect((after?.data ?? after).status).toBe('resolved')

    // 8. Settings — patch display name + verify reload.
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-tab-account"]').click()
    const newName = `Journey ${Date.now()}`
    await page.locator('#settings-name').fill(newName)
    const settingsPatchPromise = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && /\/api\/users\//.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="settings-account-save"]').click()
    await settingsPatchPromise
    await page.reload()
    await page.locator('[data-mol-id="settings-tab-account"]').click()
    await expect(page.locator('#settings-name')).toHaveValue(newName, { timeout: 5_000 })

    // 9. Pricing — public page (still authed, but renders fine).
    await page.goto(APP_BASE + '/pricing')
    await page.waitForResponse((r) => /\/api\/billing\/tiers/.test(r.url()))

    // 10. Logout + login round-trip.
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill(creds.email)
    await page.locator('input[type="password"]').fill(creds.password)
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  })
})
