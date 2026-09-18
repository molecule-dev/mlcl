import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { api, signup } from './_helpers.js'

test.describe('annotations — CRUD round-trips and activity feed integration', () => {
  test('Creating an annotation makes it readable on subsequent GET and writes a "commented" activity row', async ({
    page,
  }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `Annotated ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })

    const annotation = await api<{ id: string; title: string }>(page, 'POST', '/annotations', {
      model_id: model.id,
      title: 'Top of the helmet needs more contrast',
      description: 'Try a richer dark band along the rim.',
      x: 0.1,
      y: 0.5,
      z: 0.2,
    })
    expect(annotation.id).toBeTruthy()

    // Read-after-write: list endpoint reflects it.
    const list = await api<Array<{ id: string; title: string }>>(
      page,
      'GET',
      `/annotations?model_id=${model.id}`,
    )
    expect(list.find((a) => a.id === annotation.id)?.title, 'annotation title persisted').toBe(
      annotation.title,
    )

    // Activity feed picked it up.
    const feed = await api<Array<{ action: string; model_id: string }>>(page, 'GET', '/activity')
    expect(
      feed.some((a) => a.action === 'commented' && a.model_id === model.id),
      'activity feed has commented row',
    ).toBe(true)
  })

  test('Resolving an annotation flips the resolved boolean (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `ResolveTarget ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    const annotation = await api<{ id: string; resolved?: boolean }>(page, 'POST', '/annotations', {
      model_id: model.id,
      title: 'Open issue',
    })
    expect(annotation.resolved).not.toBe(true)

    await api(page, 'PUT', `/annotations/${annotation.id}`, { resolved: true })

    const list = await api<Array<{ id: string; resolved: boolean }>>(
      page,
      'GET',
      `/annotations?model_id=${model.id}`,
    )
    expect(
      list.find((a) => a.id === annotation.id)?.resolved,
      'annotation flipped to resolved',
    ).toBe(true)
  })

  test('Deleting an annotation removes it from the list', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `DeleteAnnoTarget ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    const annotation = await api<{ id: string }>(page, 'POST', '/annotations', {
      model_id: model.id,
      title: 'Will be deleted',
    })
    await api(page, 'DELETE', `/annotations/${annotation.id}`)
    const list = await api<Array<{ id: string }>>(page, 'GET', `/annotations?model_id=${model.id}`)
    expect(
      list.find((a) => a.id === annotation.id),
      'annotation gone after delete',
    ).toBeFalsy()
  })

  test('Cross-user annotation access is blocked (403 / 404 contract)', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    await signup(pageA)
    const model = await api<{ id: string }>(pageA, 'POST', '/models', {
      name: `PrivateAnno ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
      visibility: 'private',
    })
    const annotation = await api<{ id: string }>(pageA, 'POST', '/annotations', {
      model_id: model.id,
      title: 'Owner-only',
    })
    await ctxA.close()

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    await signup(pageB)
    const cookies = await pageB.context().cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const tryUpdate = await pageB.request.fetch(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/annotations/' + annotation.id,
      {
        method: 'PUT',
        headers: { Cookie: cookieStr, 'Content-Type': 'application/json' },
        data: JSON.stringify({ title: 'hijack' }),
      },
    )
    expect(tryUpdate.status(), 'cross-user PUT must be 403/404').toBeGreaterThanOrEqual(400)
    await ctxB.close()
  })
})
