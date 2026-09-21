import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  ackIncident,
  authHeaders,
  listIncidents,
  readIncident,
  resolveIncident,
  safeText,
  signup,
  triggerIncident,
  uniqueEmail,
} from './_helpers.js'

test.describe('incidents API (state machine)', () => {
  test('trigger -> ack -> resolve walk with read-after-write at each step', async ({ page }) => {
    await signup(page, uniqueEmail('api-walk'))
    const created = await triggerIncident(page, {
      title: `E2E api walk ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'critical',
    })
    expect(created.status).toBe('triggered')
    let detail = await readIncident(page, created.id)
    expect(detail.events[0]!.kind).toBe('trigger')

    await ackIncident(page, created.id)
    detail = await readIncident(page, created.id)
    expect(detail.status).toBe('acknowledged')
    expect(detail.events.some((e) => e.kind === 'ack')).toBe(true)

    await resolveIncident(page, created.id)
    detail = await readIncident(page, created.id)
    expect(detail.status).toBe('resolved')
    expect(detail.events.some((e) => e.kind === 'resolve')).toBe(true)
  })

  test('invalid transitions are rejected with 409', async ({ page }) => {
    await signup(page, uniqueEmail('api-409'))
    const created = await triggerIncident(page, {
      title: `E2E api 409 ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'warning',
    })
    await ackIncident(page, created.id)
    // double-ack must 409
    const doubleAck = await page.request.put(`${API_BASE}/incidents/${created.id}/ack`, {
      headers: authHeaders(page),
      data: {},
    })
    expect(doubleAck.status(), await safeText(doubleAck)).toBe(409)
    await resolveIncident(page, created.id)
    // resolve-again must 409
    const doubleResolve = await page.request.put(`${API_BASE}/incidents/${created.id}/resolve`, {
      headers: authHeaders(page),
      data: {},
    })
    expect(doubleResolve.status(), await safeText(doubleResolve)).toBe(409)
  })

  test('escalate without a linked policy is a 409 guard', async ({ page }) => {
    await signup(page, uniqueEmail('api-esc'))
    const created = await triggerIncident(page, {
      title: `E2E api escalate ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'critical',
    })
    // Fresh incidents carry no policy link; escalate must refuse (409).
    const res = await page.request.put(`${API_BASE}/incidents/${created.id}/escalate`, {
      headers: authHeaders(page),
      data: {},
    })
    expect(res.status(), await safeText(res)).toBe(409)
  })

  test('unauthenticated reads are denied', async ({ page, request }) => {
    await signup(page, uniqueEmail('api-anon'))
    const created = await triggerIncident(page, {
      title: `E2E api anon ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'info',
    })
    // `page.request` shares the browser context's auth cookie, so the probe
    // must go through the isolated `request` fixture to be truly anonymous.
    const anon = await request.get(`${API_BASE}/incidents/${created.id}`)
    expect(anon.status()).toBe(401)
    const listed = await listIncidents(page)
    expect(listed.some((i) => i.id === created.id)).toBe(true)
  })

  test('trigger pages the on-call responder as an unread page notification', async ({ page }) => {
    await signup(page, uniqueEmail('api-page'))
    const countUnreadPages = async (): Promise<number> => {
      const res = await page.request.get(`${API_BASE}/notifications`, {
        headers: authHeaders(page),
      })
      const rows = (await res.json()) as Array<{ kind: string; read: boolean }>
      return rows.filter((n) => n.kind === 'page' && !n.read).length
    }
    const before = await countUnreadPages()
    await triggerIncident(page, {
      title: `E2E api page ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'warning',
    })
    await expect.poll(countUnreadPages, { timeout: 10_000 }).toBeGreaterThan(before)
  })
})
