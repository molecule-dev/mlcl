import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

test.describe('/models/:id/edit (ModelEdit)', () => {
  test('Page hydrates inputs from the API and renders a Save button', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string; name: string }>(page, 'POST', '/models', {
      name: `EditPage ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    await page.goto(`${APP_BASE}/models/${model.id}/edit`)
    const nameInput = page.locator('input[type=text]').first()
    await expect(nameInput).toHaveValue(/EditPage/, { timeout: 15_000 })
    await expect(page.getByRole('button', { name: /save/i }).first()).toBeVisible()
  })

  test('Editing description and saving persists in /api/models/:id', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `EditDescTarget ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    const desc = `Updated description ${Date.now()}`
    await api(page, 'PUT', `/models/${model.id}`, { description: desc })
    const fetched = await api<{ description: string }>(page, 'GET', `/models/${model.id}`)
    expect(fetched.description, 'description persisted').toBe(desc)
  })

  test('Deleting via the model API removes it from the library list', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `EditDeleteTarget ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    await api(page, 'DELETE', `/models/${model.id}`)
    const list = await api<Array<{ id: string }>>(page, 'GET', '/models')
    expect(list.find((m) => m.id === model.id)).toBeFalsy()
  })
})
