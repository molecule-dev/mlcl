import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  getTicket,
  promoteToAdmin,
  seedTicket,
  signup,
} from './_helpers.js'

test.describe('helpdesk-ticketing: tickets CRUD', () => {
  test('create via /tickets/new form persists the ticket and lands on its detail', async ({
    page,
  }) => {
    const session = await signup(page)

    await page.goto(APP_BASE + '/tickets/new')
    await expect(
      page.getByTestId('ticket-new-title').or(page.locator('[data-mol-id="ticket-new-title"]')),
    ).toBeVisible()

    const subject = `UI ticket ${Date.now()}`
    await page.locator('[data-mol-id="ticket-subject"]').fill(subject)
    await page
      .locator('[data-mol-id="ticket-description"]')
      .fill('Detailed steps captured by the e2e suite.')
    await page.locator('[data-mol-id="ticket-priority"]').selectOption('high')
    await page.locator('[data-mol-id="ticket-category"]').fill('billing')

    // The submit button is disabled while subject/description are empty
    // and while the request is in flight. Wait for it to become enabled
    // before clicking — otherwise we race React's controlled-input state
    // and click a still-disabled button, which silently no-ops and the
    // URL never changes.
    const submit = page.locator('[data-mol-id="ticket-new-submit"]')
    await expect(submit).toBeEnabled()

    // Arm the POST response listener BEFORE the click so a fast
    // backend response can't beat our listener (also defends against
    // playwright trace-recorder racing the post-submit navigation
    // teardown, which surfaces as a confusing ENOENT on the trace zip).
    const postResp = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/tickets(\?|\/?$)/.test(r.url()),
      { timeout: 15_000 },
    )
    await submit.click()
    const resp = await postResp
    expect(resp.status()).toBeLessThan(400)

    await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]{8,}$/i, { timeout: 15_000 })

    const ticketId = page.url().split('/tickets/')[1]!
    const fetched = await getTicket(page, session.accessToken, ticketId)
    expect(fetched.subject).toBe(subject)
    expect(fetched.priority).toBe('high')
    expect(fetched.category).toBe('billing')
    expect(fetched.status).toBe('open')

    const list = await page.request.get(`${API_BASE}/tickets`, {
      headers: authHeaders(session.accessToken),
    })
    expect(list.status()).toBe(200)
    const items = (await list.json()) as Array<{ id: string }>
    expect(items.find((t) => t.id === ticketId)).toBeTruthy()
  })

  test('changing status via the detail-page select persists across reload', async ({ page }) => {
    const session = await signup(page)
    // The full status ladder (resolved/on_hold/pending/...) is operator-only;
    // a non-operator requester can only open/close their own ticket. Become the
    // operator so the detail-page select can drive a 'resolved' transition.
    await promoteToAdmin(page, session.accessToken)
    const ticket = await seedTicket(page, session.accessToken, { subject: 'status flow' })

    await page.goto(APP_BASE + '/tickets/' + ticket.id)
    await expect(page.locator('[data-mol-id="badge-status"]').first()).toBeVisible()

    await page.locator('[data-mol-id="status-select"]').selectOption('resolved')
    await expect(page.locator('[data-mol-id="badge-status"]').first()).toHaveText(/resolved/i, {
      timeout: 10_000,
    })

    await page.reload()
    await expect(page.locator('[data-mol-id="badge-status"]').first()).toHaveText(/resolved/i, {
      timeout: 10_000,
    })

    const refetched = await getTicket(page, session.accessToken, ticket.id)
    expect(refetched.status).toBe('resolved')
  })

  test('posting a reply persists and shows up after fetching the ticket again', async ({
    page,
  }) => {
    const session = await signup(page)
    const ticket = await seedTicket(page, session.accessToken, { subject: 'reply flow' })

    const body = `Reply seeded ${Date.now()}`
    const res = await page.request.post(`${API_BASE}/tickets/${ticket.id}/replies`, {
      headers: authHeaders(session.accessToken),
      data: { body, is_internal: false },
    })
    expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)

    const refetched = await getTicket(page, session.accessToken, ticket.id)
    const replies = refetched.replies ?? []
    expect(replies.find((r) => r.body === body)).toBeTruthy()
  })

  test('list page renders the freshly-created ticket subject', async ({ page }) => {
    const session = await signup(page)
    const subject = `List render ${Date.now()}`
    await seedTicket(page, session.accessToken, { subject })

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/tickets')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.getByText(subject).first()).toBeVisible({ timeout: 15_000 })
    expect(reqs.some((r) => r.url.includes('/api/tickets'))).toBe(true)
  })

  test('GET /api/tickets requires auth', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/tickets`, { failOnStatusCode: false })
    expect(res.status()).toBe(401)
  })

  test('POST /api/tickets validates the create payload', async ({ page }) => {
    const session = await signup(page)
    const res = await page.request.post(`${API_BASE}/tickets`, {
      headers: authHeaders(session.accessToken),
      data: { subject: '' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(400)
  })

  test('DELETE /api/tickets/:id removes the row from subsequent GETs', async ({ page }) => {
    const session = await signup(page)
    // Permanent ticket deletion is an operator action only — become the operator.
    await promoteToAdmin(page, session.accessToken)
    const ticket = await seedTicket(page, session.accessToken, { subject: 'doomed' })

    const del = await page.request.delete(`${API_BASE}/tickets/${ticket.id}`, {
      headers: authHeaders(session.accessToken),
      failOnStatusCode: false,
    })
    expect(del.status()).toBeLessThan(400)

    const after = await page.request.get(`${API_BASE}/tickets/${ticket.id}`, {
      headers: authHeaders(session.accessToken),
      failOnStatusCode: false,
    })
    expect(after.status()).toBe(404)
  })
})
