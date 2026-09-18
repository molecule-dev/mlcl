import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

/**
 * Kitchen-sink journey for the 3d-model-viewer app:
 *   sign up → create model → annotate → embed → notifications → settings → logout.
 * Each phase asserts the persisted state via the API so this spec also acts
 * as a smoke test that every primary feature is wired end-to-end.
 */
test.describe('user journey — 3d model viewer end-to-end', () => {
  test('owner can complete the full create-and-share flow across all primary surfaces', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    // Phase 1: signup → land on dashboard.
    await signup(page)
    await expect(page).toHaveURL(/\/dashboard/)

    // Phase 2: create a model via API and verify the library reflects it.
    const modelName = `Journey Model ${Date.now()}`
    const created = await api<{ id: string; name: string }>(page, 'POST', '/models', {
      name: modelName,
      file_url: 'local://journey.glb',
      format: 'glb',
      file_size: 1024,
      polygon_count: 100,
      visibility: 'private',
    })
    expect(created.id).toBeTruthy()

    await page.goto(`${APP_BASE}/models`)
    await expect(page.getByText(modelName).first()).toBeVisible({ timeout: 10_000 })

    // Phase 3: annotate the model.
    const annotation = await api<{ id: string; title: string }>(page, 'POST', '/annotations', {
      model_id: created.id,
      title: 'Inspect this region',
      description: 'Needs polish before publishing',
    })
    const list = await api<Array<{ id: string }>>(
      page,
      'GET',
      `/annotations?model_id=${created.id}`,
    )
    expect(list.find((a) => a.id === annotation.id)).toBeTruthy()

    // Phase 4: configure an embed for the model.
    const embed = await api<{ id: string }>(page, 'POST', '/embeds', {
      model_id: created.id,
      width: 960,
      height: 540,
      theme: 'dark',
    })
    expect(embed.id).toBeTruthy()

    // Phase 5: notifications are accessible (handler responds 2xx).
    const notifs = await api<Array<unknown>>(page, 'GET', '/notifications')
    expect(Array.isArray(notifs)).toBe(true)

    // Phase 6: visit the settings page and confirm form hydrates from the API.
    await page.goto(`${APP_BASE}/settings`)
    await expect(page.locator('[data-testid="profile-first-name"]')).toBeVisible({
      timeout: 10_000,
    })

    // Phase 7: clean up — delete the model and confirm it disappears from the library.
    await api(page, 'DELETE', `/models/${created.id}`)
    const after = await api<Array<{ id: string }>>(page, 'GET', '/models')
    expect(after.find((m) => m.id === created.id)).toBeFalsy()
  })
})
