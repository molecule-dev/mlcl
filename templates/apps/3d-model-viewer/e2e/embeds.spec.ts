import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

test.describe('embeds — config persists across reload and uses real ids in the snippet', () => {
  test('Saving an embed config writes a row that GET reflects (round-trip)', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `EmbedTarget ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    const embed = await api<{ id: string; width: number; theme: string }>(page, 'POST', '/embeds', {
      model_id: model.id,
      width: 1024,
      height: 720,
      theme: 'dark',
      auto_rotate: false,
      show_annotations: true,
    })
    expect(embed.id).toBeTruthy()

    const list = await api<
      Array<{ id: string; width: number; theme: string; auto_rotate: boolean }>
    >(page, 'GET', `/embeds?model_id=${model.id}`)
    const row = list.find((e) => e.id === embed.id)
    expect(row, 'embed row visible after create').toBeTruthy()
    expect(row!.width, 'width persisted').toBe(1024)
    expect(row!.theme, 'theme persisted').toBe('dark')
    expect(row!.auto_rotate, 'auto_rotate persisted').toBe(false)

    const single = await api<{ width: number; theme: string }>(page, 'GET', `/embeds/${embed.id}`)
    expect(single.width).toBe(1024)
    expect(single.theme).toBe('dark')
  })

  test('PUT /embeds/:id updates fields visible in subsequent GET', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `EmbedUpdate ${Date.now()}`,
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
    await api(page, 'PUT', `/embeds/${embed.id}`, {
      width: 1600,
      height: 900,
      theme: 'dark',
      auto_rotate: false,
      show_annotations: false,
    })
    const updated = await api<{
      width: number
      height: number
      theme: string
      auto_rotate: boolean
      show_annotations: boolean
    }>(page, 'GET', `/embeds/${embed.id}`)
    expect(updated.width).toBe(1600)
    expect(updated.height).toBe(900)
    expect(updated.theme).toBe('dark')
    expect(updated.auto_rotate).toBe(false)
    expect(updated.show_annotations).toBe(false)
  })

  test('Embed page loads existing config for a model and reflects values in the inputs', async ({
    page,
  }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `EmbedUI ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    await api(page, 'POST', '/embeds', {
      model_id: model.id,
      width: 1280,
      height: 720,
      theme: 'dark',
      auto_rotate: true,
      show_annotations: true,
    })

    await page.goto(`${APP_BASE}/models/${model.id}/embed`)
    // The dimension inputs hydrate via GET /api/embeds asynchronously after
    // mount; poll until the input reflects the saved width rather than
    // racing the first paint (which shows the 640 default).
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input'))
            return inputs.some((i) => (i as HTMLInputElement).value === '1280')
          }),
        { message: 'width input hydrated to 1280', timeout: 10_000 },
      )
      .toBe(true)
  })

  test('Deleting an embed removes it from the model-scoped list', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `EmbedDelete ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    const embed = await api<{ id: string }>(page, 'POST', '/embeds', {
      model_id: model.id,
      width: 800,
      height: 600,
    })
    await api(page, 'DELETE', `/embeds/${embed.id}`)
    const list = await api<Array<{ id: string }>>(page, 'GET', `/embeds?model_id=${model.id}`)
    expect(
      list.find((e) => e.id === embed.id),
      'embed gone after delete',
    ).toBeFalsy()
  })
})
