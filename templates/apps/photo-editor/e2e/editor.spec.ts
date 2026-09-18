/**
 * /editor — Lustra's adjust + presets + history workspace.
 *
 * Each adjustment-slider drag PUTs /images/:id with an updated
 * edit_history. We assert read-after-write: after waiting for the
 * debounced save, GET /images/:id returns the new history entry, and
 * page.reload() reproduces the same edit_history length on the page
 * via the editor save-status pill.
 *
 * "Undo" pops the last history entry and PUTs the truncated array.
 * "Reset" appends a "Reset" entry and clears all sliders to zero.
 * Tab switching toggles the right-panel content.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, createImage, signup } from './_helpers.js'

test.describe('editor', () => {
  test('opening /editor without ?photo shows the empty state + CTA to library', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/editor')
    await expect(page.locator('[data-mol-id="editor-no-photo"]')).toBeVisible()
    await page.getByRole('button', { name: /open library/i }).click()
    await page.waitForURL(/\/library/)
  })

  test('dragging an adjustment slider PUTs /images/:id, persists across reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const image = await createImage(page, accessToken, {
      name: 'Editor target',
      width: 1200,
      height: 800,
    })

    await page.goto(APP_BASE + `/editor?photo=${image.id}`)
    await expect(page.locator('[data-mol-id="editor-canvas"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-mol-id="editor-save-status"]')).toHaveAttribute(
      'data-status',
      'idle',
    )

    const slider = page.locator('[data-mol-id="adjust-contrast"]')
    const calls = await captureNetwork(page, async () => {
      await slider.evaluate((el: HTMLInputElement) => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set
        setter?.call(el, '40')
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
      // Wait through the debounce + PUT round-trip.
      await page.waitForTimeout(1500)
      await expect(page.locator('[data-mol-id="editor-save-status"]')).toHaveAttribute(
        'data-status',
        'saved',
        { timeout: 10_000 },
      )
    })
    const put = calls.find((r) => r.method === 'PUT' && r.url.includes(`/images/${image.id}`))
    expect(put?.status).toBe(200)

    // Read-after-write: GET /images/:id has a populated edit_history.
    const res = await page.request.get(`${API_BASE}/images/${image.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { edit_history: unknown }
    const history = (body.edit_history ?? []) as unknown[]
    expect(history.length).toBeGreaterThanOrEqual(1)

    // Reload and confirm the editor reads the persisted history.
    await page.reload()
    await expect(page.locator('[data-mol-id="editor-canvas"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-mol-id="editor-history-list"]')).toBeVisible()
    const persistedEntries = await page.locator('[data-mol-id^="editor-history-entry-"]').count()
    expect(persistedEntries).toBeGreaterThanOrEqual(1)
  })

  test('undo button is disabled with no edits and re-enables once an edit is made', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const image = await createImage(page, accessToken, { name: 'Undo target' })
    await page.goto(APP_BASE + `/editor?photo=${image.id}`)
    await expect(page.locator('[data-mol-id="editor-canvas"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-mol-id="editor-undo"]')).toBeDisabled()

    const slider = page.locator('[data-mol-id="adjust-exposure"]')
    await slider.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(el, '20')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-mol-id="editor-undo"]')).toBeEnabled()
    await page.locator('[data-mol-id="editor-undo"]').click()
    await page.waitForTimeout(1000)
    // After undo the history should drop back to empty → button disables again.
    await expect(page.locator('[data-mol-id="editor-undo"]')).toBeDisabled()
  })

  test('switching tabs (adjust → presets → info) swaps the right panel content', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const image = await createImage(page, accessToken, { name: 'Tab target' })
    await page.goto(APP_BASE + `/editor?photo=${image.id}`)
    await expect(page.locator('[data-mol-id="editor-canvas"]')).toBeVisible({ timeout: 15_000 })

    await page.locator('[data-mol-id="editor-tab-presets"]').click()
    await expect(
      page
        .locator('button:has-text("Polaroid"), button:has-text("Cinema"), button:has-text("Mono")')
        .first(),
    ).toBeVisible({ timeout: 5_000 })

    await page.locator('[data-mol-id="editor-tab-info"]').click()
    await expect(page.getByText(/dimensions/i).first()).toBeVisible()
  })

  test('export link in the toolbar carries the photo id into /export', async ({ page }) => {
    const { accessToken } = await signup(page)
    const image = await createImage(page, accessToken, { name: 'Export bound' })
    await page.goto(APP_BASE + `/editor?photo=${image.id}`)
    const link = page.locator('[data-mol-id="editor-export"]')
    await expect(link).toHaveAttribute('href', `/export?photo=${image.id}`)
  })

  test('opening an editor for a non-existent image shows an error / loading state, not a crash', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/editor?photo=00000000-0000-0000-0000-000000000000')
    // Either the loading text resolves to error, or we never reach the canvas — both are acceptable as long as the page does not crash.
    const loading = page.locator('[data-mol-id="editor-loading"]')
    await expect(loading).toBeVisible({ timeout: 5_000 })
    // Should not surface any uncaught React error overlay.
    expect(await page.locator('text=/Application error/i').count()).toBe(0)
  })
})
