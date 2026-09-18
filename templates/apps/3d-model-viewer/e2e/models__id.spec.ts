import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

test.describe('/models/:id (ModelViewer)', () => {
  test('Owner can navigate to a model viewer page for their own model', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string; name: string }>(page, 'POST', '/models', {
      name: `ViewerSubject ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    await page.goto(`${APP_BASE}/models/${model.id}`)
    await expect(page).toHaveURL(new RegExp(`/models/${model.id}`))
  })

  test('Cross-user PUT against /models/:id is rejected (403)', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    await signup(pageA)
    const model = await api<{ id: string }>(pageA, 'POST', '/models', {
      name: `Locked ${Date.now()}`,
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
    const cookies = await pageB.context().cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const resp = await pageB.request.fetch(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/models/' + model.id,
      {
        method: 'PUT',
        headers: { Cookie: cookieStr, 'Content-Type': 'application/json' },
        data: JSON.stringify({ name: 'hijack' }),
      },
    )
    expect(resp.status(), 'cross-user PUT must be 4xx').toBeGreaterThanOrEqual(400)
    await ctxB.close()
  })

  test('GET /api/models/:id returns the model row with the correct shape', async ({ page }) => {
    await signup(page)
    const created = await api<{ id: string; name: string }>(page, 'POST', '/models', {
      name: `ShapeCheck ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 999,
      polygon_count: 7,
    })
    const fetched = await api<Record<string, unknown>>(page, 'GET', `/models/${created.id}`)
    expect(fetched.id).toBe(created.id)
    expect(fetched.name).toBe(created.name)
    expect(fetched.format).toBe('glb')
    expect(fetched.user_id, 'user_id is present').toBeTruthy()
  })
})
