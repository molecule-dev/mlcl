/**
 * 99-user-journey — kitchen-sink, cross-page user flow.
 *
 * Walks the entire happy path a real photographer would follow:
 *   signup → library → upload a frame → editor (drag a slider, persist) →
 *   /presets (browse) → /export (export the frame, persist artifact) →
 *   /album/:id (browse a curated stack) → /profile (verify counts) →
 *   /settings (toggle a preference, verify persistence) → logout.
 *
 * This spec is intentionally end-to-end; it asserts the whole product
 * is wired together (every page renders + every primary action's
 * read-after-write contract holds).
 *
 * captureNetwork() bookends each meaningful action so a failed gate
 * makes it obvious which API call the journey lost.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  createAlbum,
  createImage,
  getAccessToken,
  signup,
} from './_helpers.js'

test.describe('99-user-journey', () => {
  test('photographer signs up, edits a frame, exports it, and toggles a setting', async ({
    page,
  }) => {
    // 1. Signup → /library
    const { accessToken, email } = await signup(page)
    expect(accessToken).toBeTruthy()
    await expect(page).toHaveURL(/\/library/)

    // 2. Upload a frame via the modal → arrives at /editor?photo=:id
    await page.locator('[data-mol-id="library-empty-cta"]').click()
    await page.locator('[data-mol-id="library-new-name"]').fill('Journey Frame')
    await page
      .locator('[data-mol-id="library-new-url"]')
      .fill('https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=800')
    const uploadCalls = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="library-new-submit"]').click()
      await page.waitForURL(/\/editor\?photo=/, { timeout: 15_000 })
    })
    expect(
      uploadCalls.find((c) => c.method === 'POST' && /\/api\/images\/?$/.test(c.url))?.status,
    ).toBe(201)

    // 3. Editor: drag a slider, await debounced PUT, confirm save status flips
    await expect(page.locator('[data-mol-id="editor-canvas"]')).toBeVisible({ timeout: 15_000 })
    const slider = page.locator('[data-mol-id="adjust-exposure"]')
    const editCalls = await captureNetwork(page, async () => {
      await slider.evaluate((el: HTMLInputElement) => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set
        setter?.call(el, '20')
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await page.waitForTimeout(1500)
      await expect(page.locator('[data-mol-id="editor-save-status"]')).toHaveAttribute(
        'data-status',
        'saved',
        { timeout: 10_000 },
      )
    })
    expect(editCalls.find((c) => c.method === 'PUT' && /\/api\/images\//.test(c.url))?.status).toBe(
      200,
    )

    // 4. Browse /presets
    await page.goto(APP_BASE + '/presets')
    await expect(page.locator('[data-mol-id="presets-grid"]')).toBeVisible({ timeout: 10_000 })

    // 5. /export the same frame
    const photoId = page.url().match(/photo=([^&]+)/)?.[1]
    void photoId
    // The export page picks up the most recent image from /api/images by default.
    await page.goto(APP_BASE + '/export')
    await expect(page.locator('[data-mol-id="export-submit"]')).toBeVisible({ timeout: 10_000 })
    const exportCalls = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="export-submit"]').click()
      await expect(page.locator('[data-mol-id="export-success"]')).toBeVisible({ timeout: 15_000 })
    })
    expect(
      exportCalls.find((c) => c.method === 'POST' && /\/api\/exports\/?$/.test(c.url))?.status,
    ).toBe(201)

    // 6. /album/:id — create one out-of-band, then visit it
    const album = await createAlbum(page, accessToken, 'Journey roll')
    await createImage(page, accessToken, { name: 'Curated 1', album_id: album.id })
    await createImage(page, accessToken, { name: 'Curated 2', album_id: album.id })
    await page.goto(APP_BASE + `/album/${album.id}`)
    await expect(page.locator('[data-mol-id="album-title"]')).toHaveText('Journey roll')
    await expect(page.locator('[data-mol-id="album-photo-count"]')).toContainText('2')

    // 7. /profile — counts must reflect everything we created
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-email"]')).toHaveText(email)
    await expect(page.locator('[data-mol-id="profile-stat-frames"]')).not.toHaveText('0')

    // 8. /settings — toggle a preference; verify localStorage round-trip
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-toggle-aiSuggest"]').click()
    await expect(page.locator('[data-mol-id="settings-toggle-aiSuggest"]')).toHaveAttribute(
      'aria-checked',
      'true',
    )
    const stored = await page.evaluate(() => window.localStorage.getItem('lustra:editorToggles'))
    expect(JSON.parse(stored ?? '{}').aiSuggest).toBe(true)

    // 9. Read-after-write across the journey via direct API
    const apiImages = await page.request.get(`${API_BASE}/images`, {
      headers: apiHeaders(accessToken),
    })
    const allImages = (await apiImages.json()) as Array<{ name: string }>
    expect(allImages.find((i) => i.name === 'Journey Frame')).toBeTruthy()
    expect(allImages.find((i) => i.name === 'Curated 1')).toBeTruthy()

    // 10. Logout
    await page.goto(APP_BASE + '/library')
    await page.locator('[data-mol-id="lustra-logout"]').click()
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    const tokenAfter = await getAccessToken(page)
    expect(tokenAfter).toBeFalsy()
  })
})
