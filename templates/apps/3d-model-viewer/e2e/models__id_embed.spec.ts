import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

test.describe('/models/:id/embed (Embed)', () => {
  test('Embed page renders inputs to configure dimensions', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `EmbedPage ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    await page.goto(`${APP_BASE}/models/${model.id}/embed`)
    await expect(page.locator('input').first()).toBeVisible({ timeout: 10_000 })
  })

  test('Embed config persisted via API survives a page reload', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `EmbedReload ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    await api(page, 'POST', '/embeds', {
      model_id: model.id,
      width: 1920,
      height: 1080,
      theme: 'dark',
    })
    await page.goto(`${APP_BASE}/models/${model.id}/embed`)
    // The embed page hydrates from GET /api/embeds asynchronously after mount;
    // poll until the input reflects the stored width rather than racing the
    // first render (which paints the 640 default before the fetch resolves).
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            Array.from(document.querySelectorAll('input')).some(
              (i) => (i as HTMLInputElement).value === '1920',
            ),
          ),
        { message: 'embed page hydrated with stored width 1920', timeout: 10_000 },
      )
      .toBe(true)

    await page.reload()
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            Array.from(document.querySelectorAll('input')).some(
              (i) => (i as HTMLInputElement).value === '1920',
            ),
          ),
        { message: 'embed config survives reload', timeout: 10_000 },
      )
      .toBe(true)
  })

  test('Embed snippet text mentions the saved embed id', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `EmbedSnippet ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    const embed = await api<{ id: string }>(page, 'POST', '/embeds', {
      model_id: model.id,
      width: 800,
      height: 600,
      theme: 'light',
    })
    await page.goto(`${APP_BASE}/models/${model.id}/embed`)
    // The snippet pre-renders with the model id as a preview URL until the
    // saved embed loads via GET /api/embeds. Wait for the saved id to land
    // in the snippet text rather than reading textContent before the fetch.
    await expect(page.locator('[data-mol-id="embed-snippet"]')).toContainText(embed.id, {
      timeout: 10_000,
    })
    const body = await page.textContent('body')
    expect(body, 'page text exists').toBeTruthy()
    expect(body!).toContain(embed.id)
  })
})
