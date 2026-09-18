/**
 * Email lifecycle contract: send, list, move, star, mark-read, delete.
 * Every spec asserts the backend actually persisted the change via a
 * follow-up GET (read-after-write).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, listEmails, signup } from './_helpers.js'

test('POST /emails/send persists a row in the Sent folder owned by the sender', async ({
  page,
}) => {
  const { accessToken, userId, email: senderEmail } = await signup(page)

  const send = await page.request.post(`${API_BASE}/emails/send`, {
    headers: apiHeaders(accessToken),
    data: {
      to: ['recipient@example.com'],
      subject: 'Round-trip test',
      body: 'Hello via API',
    },
  })
  expect(send.status(), await send.text()).toBe(201)
  const created = (await send.json()) as {
    id: string
    folder: string
    from: string
    delivery: string
  }
  expect(created.folder).toBe('sent')
  expect(created.from).toBe(senderEmail)
  // delivery is either 'sent' (Mailgun ok) or 'failed' (no creds in test env).
  expect(['sent', 'failed']).toContain(created.delivery)

  const sent = await listEmails(page, accessToken, { folder: 'sent', limit: 100 })
  const found = sent.find((e) => e.id === created.id)
  expect(found, 'sent row should appear in GET /emails?folder=sent').toBeTruthy()
  expect(found?.user_id).toBe(userId)
  expect(found?.from).toBe(senderEmail)
})

test('PUT /emails/:id/star toggles is_starred and the read-back reflects it', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  // Pick an unstarred email so toggling makes a difference.
  const target = inbox.find((e) => !e.is_starred)
  expect(target, 'expected at least one unstarred seeded email').toBeTruthy()

  const res = await page.request.put(`${API_BASE}/emails/${target!.id}/star`, {
    headers: apiHeaders(accessToken),
    data: { is_starred: true },
  })
  expect(res.status(), await res.text()).toBe(200)

  const after = await listEmails(page, accessToken, { folder: 'inbox' })
  const updated = after.find((e) => e.id === target!.id)
  expect(updated?.is_starred).toBe(true)
})

test('PUT /emails/:id/move relocates the email between folders', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const target = inbox[0]
  expect(target).toBeTruthy()

  const res = await page.request.put(`${API_BASE}/emails/${target!.id}/move`, {
    headers: apiHeaders(accessToken),
    data: { folder: 'archive' },
  })
  expect(res.status(), await res.text()).toBe(200)

  const archive = await listEmails(page, accessToken, { folder: 'archive' })
  expect(archive.find((e) => e.id === target!.id)).toBeTruthy()
  // Inbox no longer contains it
  const stillInInbox = await listEmails(page, accessToken, { folder: 'inbox' })
  expect(stillInInbox.find((e) => e.id === target!.id)).toBeFalsy()
})

test('PUT /emails/:id/read marks unread email as read', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const target = inbox.find((e) => !e.is_read)
  expect(target, 'expected at least one unread seeded email').toBeTruthy()

  const res = await page.request.put(`${API_BASE}/emails/${target!.id}/read`, {
    headers: apiHeaders(accessToken),
    data: { is_read: true },
  })
  expect(res.status(), await res.text()).toBe(200)

  const after = await listEmails(page, accessToken, { folder: 'inbox' })
  expect(after.find((e) => e.id === target!.id)?.is_read).toBe(true)
})

test('DELETE /emails/:id is two-stage: first move to trash, second hard-delete', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const target = inbox[0]
  expect(target).toBeTruthy()

  // First DELETE: soft-delete → moves to trash, row still readable.
  const first = await page.request.delete(`${API_BASE}/emails/${target!.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect([200, 204]).toContain(first.status())

  const trash = await listEmails(page, accessToken, { folder: 'trash' })
  expect(trash.find((e) => e.id === target!.id)).toBeTruthy()
  // Inbox no longer shows it.
  const stillInInbox = await listEmails(page, accessToken, { folder: 'inbox' })
  expect(stillInInbox.find((e) => e.id === target!.id)).toBeFalsy()

  // Second DELETE on a row already in trash: hard-deletes it.
  const second = await page.request.delete(`${API_BASE}/emails/${target!.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect([200, 204]).toContain(second.status())

  const detail = await page.request.get(`${API_BASE}/emails/${target!.id}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(detail.status()).toBe(404)
})

test("user A cannot read user B's emails", async ({ browser }) => {
  const aCtx = await browser.newContext()
  const aPage = await aCtx.newPage()
  const a = await signup(aPage)
  const aInbox = await listEmails(aPage, a.accessToken, { folder: 'inbox' })

  const bCtx = await browser.newContext()
  const bPage = await bCtx.newPage()
  const b = await signup(bPage)

  // GET A's email by id with B's token must 404.
  const detail = await bPage.request.get(`${API_BASE}/emails/${aInbox[0]!.id}`, {
    headers: apiHeaders(b.accessToken),
    failOnStatusCode: false,
  })
  expect(detail.status()).toBe(404)
  await aCtx.close()
  await bCtx.close()
})

test('Inbox UI fetches /api/emails and renders the seeded subject after signup', async ({
  page,
}) => {
  await signup(page)
  let emailsCalled = false
  page.on('response', (resp) => {
    if (/\/api\/emails(\?|$)/.test(resp.url()) && resp.request().method() === 'GET') {
      emailsCalled = true
    }
  })
  await page.goto(APP_BASE + '/inbox')
  await page.waitForLoadState('networkidle')
  expect(emailsCalled, 'inbox should issue GET /api/emails on load').toBe(true)
  // Sarah Jenkins is a known seed sender.
  await expect(page.getByText(/Sarah Jenkins/).first()).toBeVisible({ timeout: 10_000 })
})

test('Compose UI sends email and the new row appears in Sent folder via API', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/compose')
  await page.locator('input[placeholder="Add another recipient"]').fill('e2e-recipient@example.com')
  await page.locator('input[placeholder="Add another recipient"]').press('Enter')
  await page.locator('input[placeholder="Subject"]').fill('Compose UI flow')
  await page
    .locator('textarea[placeholder="Write your message…"]')
    .fill('Sent via the compose page')
  await page.getByRole('button', { name: /^Send$/ }).click()
  // Compose redirects to /inbox or /sent on success
  await page.waitForURL(/\/(inbox|sent)/, { timeout: 15_000 })

  const sent = await listEmails(page, accessToken, { folder: 'sent' })
  const newRow = sent.find((e) => e.subject === 'Compose UI flow')
  expect(newRow, 'compose UI should persist a Sent row with the typed subject').toBeTruthy()
  expect(newRow?.body).toContain('Sent via the compose page')
})
