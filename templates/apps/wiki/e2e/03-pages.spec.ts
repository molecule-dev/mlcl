import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  apiHeaders,
  API_BASE,
  createPage,
  createSpace,
  getMe,
  getPage,
  listPages,
  signup,
} from './_helpers.js'

test.describe('pages CRUD + persistence', () => {
  test('create new page via UI persists title + body across reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const space = await createSpace(page, accessToken, { name: 'Engineering' })

    await page.goto('/page/new')
    await expect(page.getByTestId('page-editor')).toBeVisible()

    // Pick the new space (the page editor pre-fills the first one alphabetically).
    await page.getByTestId('page-editor-space').selectOption({ label: 'Engineering' })
    await page.getByTestId('page-editor-title').fill('Architectural decision record 0001')
    await page.getByTestId('page-editor-body').fill('# ADR 0001\n\nFirst decision body.')

    await page.getByTestId('page-editor-save').click()
    await page.waitForURL(/\/page\/[a-f0-9-]+/, { timeout: 15_000 })

    await expect(page.getByTestId('page-view-title')).toHaveText(
      'Architectural decision record 0001',
    )

    // Reload — should still show the saved content from the DB.
    await page.reload()
    await expect(page.getByTestId('page-view-title')).toHaveText(
      'Architectural decision record 0001',
    )
    await expect(page.getByTestId('page-view-body')).toContainText('First decision body.')

    // And the API should have the row.
    const pageId = new URL(page.url()).pathname.split('/').pop() as string
    const row = await getPage(page, accessToken, pageId)
    expect(row.title).toBe('Architectural decision record 0001')
    expect(row.content).toContain('First decision body.')
    expect(row.space_id).toBe(space.id)
  })

  test('edit existing page increments version + persists', async ({ page }) => {
    const { accessToken } = await signup(page)
    const me = await getMe(page, accessToken)
    const created = await createPage(page, accessToken, me.defaultSpace.id, {
      title: 'Initial title',
      content: '# Initial\n\nv1 body',
    })
    expect(created.version).toBe(1)

    await page.goto(`/page/${created.id}/edit`)
    await expect(page.getByTestId('page-editor')).toBeVisible()

    await page.getByTestId('page-editor-title').fill('Edited title')
    await page.getByTestId('page-editor-body').fill('# Edited\n\nv2 body — updated.')
    await page.getByTestId('page-editor-save').click()

    // Wait for "Saved …" pill to appear.
    await expect(page.getByTestId('page-editor-saved-at')).toBeVisible({ timeout: 10_000 })

    const updated = await getPage(page, accessToken, created.id)
    expect(updated.title).toBe('Edited title')
    expect(updated.content).toContain('v2 body — updated.')
    expect(updated.version).toBe(2)
  })

  test('soft delete + restore round trip via API', async ({ page }) => {
    const { accessToken } = await signup(page)
    const me = await getMe(page, accessToken)
    const created = await createPage(page, accessToken, me.defaultSpace.id, {
      title: 'Trashable page',
      content: '# trash me',
    })

    const del = await page.request.delete(`${API_BASE}/pages/${created.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(del.status()).toBe(204)

    const trashed = await listPages(page, accessToken, { trashed: 'true' })
    expect(trashed.find((p) => p.id === created.id)).toBeDefined()

    const restore = await page.request.post(`${API_BASE}/pages/${created.id}/restore`, {
      headers: apiHeaders(accessToken),
    })
    expect(restore.status(), await restore.text()).toBeGreaterThanOrEqual(200)
    expect(restore.status()).toBeLessThan(300)

    const live = await listPages(page, accessToken, { space_id: me.defaultSpace.id })
    expect(live.find((p) => p.id === created.id)).toBeDefined()
  })

  test('versions list is built as we save', async ({ page }) => {
    const { accessToken } = await signup(page)
    const me = await getMe(page, accessToken)
    const created = await createPage(page, accessToken, me.defaultSpace.id, {
      title: 'Versioned page',
      content: 'v1',
    })

    // 2 more revisions
    for (let i = 2; i <= 3; i++) {
      const res = await page.request.put(`${API_BASE}/pages/${created.id}`, {
        headers: apiHeaders(accessToken),
        data: { title: `Versioned page v${i}`, content: `v${i}` },
      })
      expect(res.status()).toBe(200)
    }

    const v = await page.request.get(`${API_BASE}/pages/${created.id}/versions`, {
      headers: apiHeaders(accessToken),
    })
    expect(v.status()).toBe(200)
    const list = (await v.json()) as Array<{ version: number }>
    expect(list.length).toBeGreaterThanOrEqual(3)
    const versions = list.map((r) => r.version)
    expect(versions).toContain(1)
    expect(versions).toContain(2)
    expect(versions).toContain(3)
  })
})
