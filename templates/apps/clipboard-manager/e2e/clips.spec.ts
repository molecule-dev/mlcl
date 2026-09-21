/**
 * /clips — main app surface. Lists clips, creates new ones, toggles
 * pin/encrypt/favorite, deletes. Empty-state on first load. Filter
 * input client-side filters by content/title.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedClip, signup } from './_helpers.js'

test.describe('clips page', () => {
  test('empty new account shows the "Nothing yanked yet" empty state', async ({ page }) => {
    await signup(page)
    await expect(page.getByText(/nothing yanked yet|no clips/i).first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('initial load fires GET /api/clips', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/clips')
      await page.waitForLoadState('networkidle')
    })
    const got = reqs.find((r) => /\/api\/clips(?:\?|$)/.test(r.url) && r.status === 200)
    expect(got, JSON.stringify(reqs.filter((r) => /\/api\//.test(r.url)))).toBeTruthy()
  })

  test('seeded clip renders in the list with its preview text', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedClip(page, accessToken, { content: 'echo hello world ' + Date.now() })
    await page.goto(APP_BASE + '/clips')
    await expect(page.getByText(/echo hello world/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('"New clip" button reveals the textarea form', async ({ page }) => {
    await signup(page)
    await page
      .getByRole('button', { name: /new clip/i })
      .first()
      .click()
    await expect(page.locator('[data-mol-id="clip-new-content"]')).toBeVisible()
  })

  test('creating a clip via the form persists it (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const text = 'fresh clip ' + Date.now()
    await page.goto(APP_BASE + '/clips')
    await page
      .getByRole('button', { name: /new clip/i })
      .first()
      .click()
    await page.locator('[data-mol-id="clip-new-content"]').fill(text)
    await page.getByRole('button', { name: /^save clip$/i }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(text).first()).toBeVisible({ timeout: 15000 })
    // Confirm via API GET it really exists
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/clips', {
      headers: { Authorization: 'Bearer ' + accessToken },
    })
    const rows = (await res.json()) as Array<{ content: string | null }>
    expect(rows.find((r) => r.content === text)).toBeTruthy()
  })

  test('creating a sensitive clip stores ciphertext (preview is masked)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/clips')
    await page
      .getByRole('button', { name: /new clip/i })
      .first()
      .click()
    await page.locator('[data-mol-id="clip-new-content"]').fill('sk_live_VERY_SECRET')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /^save clip$/i }).click()
    await page.waitForLoadState('networkidle')
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/clips', {
      headers: { Authorization: 'Bearer ' + accessToken },
    })
    const rows = (await res.json()) as Array<{ is_sensitive: boolean; content: string | null }>
    const flagged = rows.find((r) => r.is_sensitive)
    expect(flagged).toBeTruthy()
    expect(flagged?.content).not.toBe('sk_live_VERY_SECRET')
  })

  test('pinning a clip flips the API row + lifts it into the Pinned section', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedClip(page, accessToken, { content: 'pinme ' + Date.now() })
    await page.goto(APP_BASE + '/clips')
    await page.getByText(seeded.content).first().click()
    const pinBtn = page.locator('button[aria-label*="Pin"]').first()
    await pinBtn.click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/^pinned$/i).first()).toBeVisible({ timeout: 15000 })
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/pinned', {
      headers: { Authorization: 'Bearer ' + accessToken },
    })
    const pinned = (await res.json()) as Array<{ id: string }>
    expect(pinned.find((p) => p.id === seeded.id)).toBeTruthy()
  })

  test('deleting the active clip removes the row + DB record', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedClip(page, accessToken, { content: 'delete-me ' + Date.now() })
    await page.goto(APP_BASE + '/clips')
    await page.getByText(seeded.content).first().click()
    // Two-step inline confirm: arm, then confirm.
    await page.locator('[data-mol-id="clip-delete"]').click()
    const confirmBtn = page.locator('[data-mol-id="clip-delete-confirm"]')
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()
    await page.waitForLoadState('networkidle')
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/clips/' + seeded.id, {
      headers: { Authorization: 'Bearer ' + accessToken },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(404)
  })

  test('filter input narrows the list to matching previews', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedClip(page, accessToken, { content: 'apple cider ' + Date.now() })
    await seedClip(page, accessToken, { content: 'banana split ' + Date.now() })
    await page.goto(APP_BASE + '/clips')
    await page.locator('input[type="search"]').fill('apple')
    await expect(page.getByText(/apple cider/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/banana split/i)).toHaveCount(0)
  })
})
