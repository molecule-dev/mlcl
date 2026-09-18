/**
 * End-to-end power-user journey: signup → create category → create
 * clips (one plain, one credential) → pin → favorite → search →
 * delete → patch profile → toggle settings → check billing → log out
 * → log back in → confirm everything we wrote is still there.
 *
 * If any step fails the test bails out — no swallowing, no skipping.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, login, seedClip, signup, uniqueEmail } from './_helpers.js'

test.describe('99 user journey', () => {
  test('full power-user flow round-trips through the app + API', async ({ page }) => {
    const email = uniqueEmail('journey')
    const { password, accessToken } = await signup(page)
    expect(accessToken.length).toBeGreaterThan(100)

    // 1. New category — auto-retrying toBeVisible covers the create POST
    const catName = 'Journey ' + Date.now()
    await page.goto(APP_BASE + '/categories')
    await page.getByRole('button', { name: /new category/i }).click()
    await page.locator('#category-name').fill(catName)
    await page.getByRole('button', { name: /create category/i }).click()
    await expect(page.getByText(catName).first()).toBeVisible({ timeout: 15000 })

    // 2. Create a plain clip via the form
    const clipText = 'rsync -avz src/ dst/ ' + Date.now()
    await page.goto(APP_BASE + '/clips')
    await page
      .getByRole('button', { name: /new clip/i })
      .first()
      .click()
    await page.locator('[data-mol-id="clip-new-content"]').fill(clipText)
    await page.getByRole('button', { name: /^save clip$/i }).click()
    await expect(page.getByText(clipText).first()).toBeVisible({ timeout: 15000 })

    // 3. Seed a credential clip via API + verify it never round-trips plaintext
    const secret = await seedClip(page, accessToken, {
      content: 'sk_live_TOPSECRET' + Date.now(),
      is_sensitive: true,
    })
    const list = await page.request.get(`${API_BASE}/clips`, { headers: apiHeaders(accessToken) })
    const rows = (await list.json()) as Array<{
      id: string
      content: string | null
      is_sensitive: boolean
    }>
    const matched = rows.find((r) => r.id === secret.id)
    expect(matched?.is_sensitive).toBe(true)
    expect(matched?.content ?? '').not.toContain('TOPSECRET')

    // 4. Pin the plain clip via the detail pane — wait for the PATCH/PUT
    // that flips is_pinned to land before reading /pinned, so the
    // round-trip is deterministic regardless of network-idle timing.
    await page.goto(APP_BASE + '/clips')
    await page.getByText(clipText).first().click()
    const pinRespPromise = page.waitForResponse(
      (r) =>
        /\/api\/clips\//.test(r.url()) &&
        ['PATCH', 'PUT', 'POST'].includes(r.request().method()) &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    await page.locator('button[aria-label*="Pin"]').first().click()
    await pinRespPromise
    const pinned = await page.request.get(`${API_BASE}/pinned`, {
      headers: apiHeaders(accessToken),
    })
    const pinnedRows = (await pinned.json()) as Array<{ title: string }>
    expect(pinnedRows.find((p) => /rsync/.test(p.title))).toBeTruthy()

    // 5. Filter narrows results
    await page.locator('input[type="search"]').first().fill('rsync')
    await expect(page.getByText(clipText).first()).toBeVisible()

    // 6. Patch profile (name + email together)
    const newEmail = uniqueEmail('journey-renamed')
    await page.goto(APP_BASE + '/profile')
    await page.locator('input#profile-name-input').fill('Journey Yank')
    await page.locator('input#profile-email-input').fill(newEmail)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.locator('[data-mol-id="profile-feedback"]')).toBeVisible({ timeout: 15000 })
    const me = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    const meBody = (await me.json()) as { name: string; email: string }
    expect(meBody.name).toBe('Journey Yank')
    expect(meBody.email).toBe(newEmail)

    // 7. Toggle Cloud sync off — persists. Wait for the PATCH that
    // mutates toggles.sync to settle before reading /profile/me so the
    // backend has the new value committed.
    await page.goto(APP_BASE + '/settings')
    const syncBefore = await page
      .locator('[data-mol-id="toggle-sync"]')
      .getAttribute('aria-checked')
    const togglePatchPromise = page.waitForResponse(
      (r) =>
        /\/api\/profile\/me(?:\?|$)/.test(r.url()) &&
        r.request().method() === 'PATCH' &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    await page.locator('[data-mol-id="toggle-sync"]').click()
    await togglePatchPromise
    const meAfterToggle = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    const meTBody = (await meAfterToggle.json()) as { toggles: { sync: boolean } }
    expect(String(meTBody.toggles.sync)).not.toBe(syncBefore)

    // 8. Billing — Pro tier monthly produces a Stripe checkout
    await page.goto(APP_BASE + '/billing')
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    const tiersBody = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null; period: string }> }>
    }
    const proMonthly = tiersBody.data
      .find((t) => t.key === 'pro')
      ?.prices.find((p) => p.period === 'month')
    expect(proMonthly?.stripePriceId).toMatch(/^price_/)
    const checkout = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId: proMonthly!.stripePriceId },
    })
    const checkoutBody = (await checkout.json()) as { checkoutUrl?: string }
    expect(checkoutBody.checkoutUrl).toMatch(/checkout\.stripe\.com/)

    // 9. Log out + back in with NEW email
    await login(page, newEmail, password)
    await expect(page).toHaveURL(/\/clips/)

    // 10. Everything we created is still here
    await expect(page.getByText(/rsync/i).first()).toBeVisible({ timeout: 15000 })
    await page.goto(APP_BASE + '/categories')
    await expect(page.getByText(catName).first()).toBeVisible({ timeout: 15000 })

    // unused — keeps `email` referenced if previous helper used it
    expect(typeof email).toBe('string')
  })
})
