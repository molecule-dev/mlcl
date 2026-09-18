import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, authHeaders, promoteToAdmin, signup } from './_helpers.js'

test.describe('helpdesk-ticketing: macros + SLA', () => {
  test('POST /api/macros persists and round-trips via GET /api/macros/:id', async ({ page }) => {
    const session = await signup(page)
    // Macros are operator-only automations (requireAdmin); become the operator.
    await promoteToAdmin(page, session.accessToken)
    const name = `Macro ${Date.now()}`
    const create = await page.request.post(`${API_BASE}/macros`, {
      headers: authHeaders(session.accessToken),
      data: {
        name,
        actions: [{ type: 'reply', body: 'Hi {{customer.first_name}}, thanks for reaching out!' }],
        reply_template: 'Hi {{customer.first_name}}, thanks for reaching out!',
      },
      failOnStatusCode: false,
    })
    expect(create.status(), await create.text().catch(() => '')).toBeLessThan(400)
    const created = (await create.json()) as { id: string; name: string }
    expect(created.id).toBeTruthy()

    const get = await page.request.get(`${API_BASE}/macros/${created.id}`, {
      headers: authHeaders(session.accessToken),
    })
    expect(get.status()).toBe(200)
    const fetched = (await get.json()) as { name: string; reply_template: string | null }
    expect(fetched.name).toBe(name)
    expect(fetched.reply_template).toContain('thanks for reaching out')
  })

  test('PATCH /api/macros/:id mutates the row and the next GET reflects the change', async ({
    page,
  }) => {
    const session = await signup(page)
    // Macros are operator-only automations (requireAdmin); become the operator.
    await promoteToAdmin(page, session.accessToken)
    const created = (await (
      await page.request.post(`${API_BASE}/macros`, {
        headers: authHeaders(session.accessToken),
        data: { name: 'orig', actions: [{ type: 'reply', body: 'orig' }], reply_template: 'orig' },
      })
    ).json()) as { id: string }

    const patch = await page.request.patch(`${API_BASE}/macros/${created.id}`, {
      headers: authHeaders(session.accessToken),
      data: { reply_template: 'updated', actions: [{ type: 'reply', body: 'updated' }] },
      failOnStatusCode: false,
    })
    expect(patch.status(), await patch.text().catch(() => '')).toBeLessThan(400)

    const after = await page.request.get(`${API_BASE}/macros/${created.id}`, {
      headers: authHeaders(session.accessToken),
    })
    const refetched = (await after.json()) as { reply_template: string }
    expect(refetched.reply_template).toBe('updated')
  })

  test('GET /api/sla returns an array (handler is wired and table exists)', async ({ page }) => {
    const session = await signup(page)
    const res = await page.request.get(`${API_BASE}/sla`, {
      headers: authHeaders(session.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('macros + sla require auth', async ({ page }) => {
    const macros = await page.request.get(`${API_BASE}/macros`, { failOnStatusCode: false })
    expect(macros.status()).toBe(401)
    const sla = await page.request.get(`${API_BASE}/sla`, { failOnStatusCode: false })
    expect(sla.status()).toBe(401)
  })
})
