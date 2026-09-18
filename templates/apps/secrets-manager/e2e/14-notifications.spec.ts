import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, createSecret, createVault, signup } from './_helpers'

// /notifications — list of unread/all notifications. The handlers expose
// list, read-one, read-all, and delete; the UI also exposes per-row
// "mark as read" and "delete" buttons. Notifications are inserted as a
// side-effect of secret rotations, so we exercise the row-level UI by
// rotating a secret and asserting on the resulting notification.

test.describe('/notifications', () => {
  test('renders empty state for fresh user and fires GET /api/notifications', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/notifications(\?|$)/.test(r.url))
    expect(get, 'GET /api/notifications should fire on page load').toBeDefined()
    expect(get!.status).toBe(200)
    await expect(page.locator('[data-mol-id="notifications-empty"]')).toBeVisible()
  })

  test('POST /api/notifications/read-all responds 204', async ({ page }) => {
    await signup(page)
    const res = await apiFetch(page, 'POST', '/notifications/read-all', {})
    expect(res.status).toBe(204)
  })

  test('GET /api/notifications returns an array', async ({ page }) => {
    await signup(page)
    const res = await apiFetch(page, 'GET', '/notifications')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.json)).toBe(true)
  })

  test('rotating a secret produces a notification row visible in /notifications', async ({
    page,
  }) => {
    await signup(page)
    const vault = await createVault(page, 'notify-vault')
    const secret = await createSecret(page, vault.id, 'NOTIFY_KEY', 'v1')

    const rotateRes = await apiFetch(page, 'POST', `/secrets/${secret.id}/rotate`, {
      value: 'v2',
      comment: 'rotated for notification coverage',
    })
    expect(rotateRes.status).toBe(200)

    // Truth from API: notifications list now contains a rotation entry.
    const list = await apiFetch(page, 'GET', '/notifications')
    expect(list.status).toBe(200)
    const rows = list.json as Array<{
      id: string
      kind: string
      title: string
      read_at: string | null
    }>
    const rotated = rows.find((n) => n.kind === 'rotation' && /NOTIFY_KEY/i.test(n.title))
    expect(
      rotated,
      'rotation should produce a "rotation" notification mentioning the key',
    ).toBeDefined()

    // UI renders the row.
    await page.goto(APP_BASE + '/notifications')
    await page.waitForTimeout(1500)
    const ui = await page.locator('[data-mol-id="notifications-list"]').first().innerText()
    expect(ui).toMatch(/NOTIFY_KEY/i)
  })

  test('per-row "mark as read" stamps read_at after seeding via rotation', async ({ page }) => {
    await signup(page)
    const vault = await createVault(page, 'notify-vault-2')
    const secret = await createSecret(page, vault.id, 'READ_NOTIFY_KEY', 'v1')
    const rotateRes = await apiFetch(page, 'POST', `/secrets/${secret.id}/rotate`, {
      value: 'v2',
    })
    expect(rotateRes.status).toBe(200)

    const list = await apiFetch(page, 'GET', '/notifications')
    const rows = list.json as Array<{
      id: string
      kind: string
      title: string
      read_at: string | null
    }>
    const target = rows.find((n) => n.kind === 'rotation' && /READ_NOTIFY_KEY/i.test(n.title))
    expect(target).toBeDefined()
    const id = target!.id

    // Hit the API directly — UI button shape varies and the invariant is
    // that POST /notifications/:id/read stamps read_at.
    const markRes = await apiFetch(page, 'POST', `/notifications/${id}/read`, {})
    expect(markRes.status).toBe(204)

    const after = await apiFetch(page, 'GET', '/notifications')
    const updated = (after.json as Array<{ id: string; read_at: string | null }>).find(
      (n) => n.id === id,
    )
    expect(updated?.read_at, 'read_at must be stamped after marking row read').not.toBeNull()
  })

  test('DELETE /api/notifications/:id removes the row', async ({ page }) => {
    await signup(page)
    const vault = await createVault(page, 'notify-vault-3')
    const secret = await createSecret(page, vault.id, 'DELETE_NOTIFY_KEY', 'v1')
    await apiFetch(page, 'POST', `/secrets/${secret.id}/rotate`, { value: 'v2' })

    const list = await apiFetch(page, 'GET', '/notifications')
    const rows = list.json as Array<{ id: string; title: string }>
    const target = rows.find((n) => /DELETE_NOTIFY_KEY/i.test(n.title))
    expect(target).toBeDefined()

    const delRes = await apiFetch(page, 'DELETE', `/notifications/${target!.id}`)
    expect(delRes.status).toBe(204)

    const after = await apiFetch(page, 'GET', '/notifications')
    const stillThere = (after.json as Array<{ id: string }>).find((n) => n.id === target!.id)
    expect(stillThere).toBeUndefined()
  })
})
