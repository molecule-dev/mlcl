import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

test.describe('models — CRUD round-trips through the API', () => {
  test('Creating a model puts a row in /models AND surfaces it in the library', async ({
    page,
  }) => {
    await signup(page)
    const name = `LibraryModel ${Date.now()}`
    const created = await api<{ id: string; name: string }>(page, 'POST', '/models', {
      name,
      file_url: 'local://placeholder.glb',
      format: 'glb',
      file_size: 4096,
      polygon_count: 25,
    })
    expect(created.id).toBeTruthy()
    expect(created.name).toBe(name)

    // Read-after-write: list endpoint shows the new model
    const list = await api<Array<{ id: string; name: string }>>(page, 'GET', '/models')
    expect(
      list.find((m) => m.id === created.id),
      'list contains the new model',
    ).toBeTruthy()

    // The library page renders it
    await page.goto(APP_BASE + '/models')
    await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Deleting a model removes it from the library AND from /models', async ({ page }) => {
    await signup(page)
    const created = await api<{ id: string }>(page, 'POST', '/models', {
      name: `DeleteMe ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 1024,
      polygon_count: 0,
    })
    await api(page, 'DELETE', `/models/${created.id}`)
    const list = await api<Array<{ id: string }>>(page, 'GET', '/models')
    expect(
      list.find((m) => m.id === created.id),
      'model is gone after delete',
    ).toBeFalsy()
  })

  test('Updating model metadata persists through reload (round-trip + re-read)', async ({
    page,
  }) => {
    await signup(page)
    const created = await api<{ id: string }>(page, 'POST', '/models', {
      name: `Original ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })

    const updatedName = `Renamed-${Date.now()}`
    const updatedCategory = 'characters'
    const updatedTags = ['hero', 'prop', 'sample']
    await api(page, 'PUT', `/models/${created.id}`, {
      name: updatedName,
      description: 'fresh description',
      category: updatedCategory,
      tags: updatedTags,
      polygon_count: 999,
      visibility: 'public',
    })

    // Re-read directly from the API: every field round-tripped
    const fetched = await api<Record<string, unknown>>(page, 'GET', `/models/${created.id}`)
    expect(fetched.name, 'name persisted').toBe(updatedName)
    expect(fetched.description, 'description persisted').toBe('fresh description')
    expect(fetched.category, 'category column persisted').toBe(updatedCategory)
    expect(fetched.tags, 'tags column persisted').toEqual(updatedTags)
    expect(fetched.polygon_count, 'polygon_count persisted').toBe(999)
    expect(fetched.visibility, 'visibility persisted').toBe('public')
  })

  test('ModelEdit page hydrates from the API and saves changes that survive reload', async ({
    page,
  }) => {
    await signup(page)
    const created = await api<{ id: string }>(page, 'POST', '/models', {
      name: `EditMe ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })

    await page.goto(`${APP_BASE}/models/${created.id}/edit`)
    // Wait for hydration: the name input should contain the existing model name.
    const nameInput = page.locator('input[type=text]').first()
    await expect(nameInput).toHaveValue(/EditMe/, { timeout: 15_000 })

    const newName = `EditedFromUI-${Date.now()}`
    await nameInput.fill(newName)
    // Click the Save button — it lives in the action bar at the top.
    await page.getByRole('button', { name: /save/i }).first().click()
    await page.waitForTimeout(1500)

    // Reload — the new name should still be in the input (re-hydrated from API)
    await page.reload()
    await expect(nameInput).toHaveValue(newName, { timeout: 15_000 })

    // And the API agrees:
    const fetched = await api<{ name: string }>(page, 'GET', `/models/${created.id}`)
    expect(fetched.name, 'API reflects edited name').toBe(newName)
  })

  test('POST /models/:id/render writes an activity_feed row visible via /activity', async ({
    page,
  }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `Renderable ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    await api(page, 'POST', `/models/${model.id}/render`, {})
    const feed = await api<Array<{ action: string; model_id: string }>>(page, 'GET', '/activity')
    const renderedRow = feed.find((a) => a.model_id === model.id && a.action === 'rendered')
    expect(renderedRow, 'render activity row exists').toBeTruthy()
  })

  test('Models created by user A are NOT visible to user B in /models', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    await signup(pageA)
    const modelA = await api<{ id: string; name: string }>(pageA, 'POST', '/models', {
      name: `OwnedByA ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
      visibility: 'private',
    })
    await ctxA.close()

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    await signup(pageB)
    const listB = await api<Array<{ id: string }>>(pageB, 'GET', '/models')
    expect(
      listB.find((m) => m.id === modelA.id),
      'user B should not see user A private models',
    ).toBeFalsy()
    await ctxB.close()
  })
})
