/**
 * Seeding contract: every brand-new user lands on a populated mailbox.
 * The first GET that hits the mailbox triggers idempotent seeding of
 * 5 inbox emails + 1 draft + 1 sent + 3 labels. Concurrent first-load
 * requests must collapse to a single seed pass (no duplicates).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, getCounts, listEmails, signup } from './_helpers.js'

test('new user receives a seeded mailbox: 5 inbox + 1 draft + 1 sent + 3 labels', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  // First request triggers the seed; subsequent reads see the data.
  const counts = await getCounts(page, accessToken)
  // 5 inbox seeds (2 unread, 3 read), 1 draft, 1 sent
  expect(counts.inbox).toBe(5)
  expect(counts.drafts).toBe(1)
  expect(counts.sent).toBe(1)
  expect(counts.starred).toBe(1)

  const labelsRes = await page.request.get(`${API_BASE}/labels`, {
    headers: apiHeaders(accessToken),
  })
  expect(labelsRes.status()).toBe(200)
  const labels = (await labelsRes.json()) as Array<{ id: string; name: string }>
  expect(labels.length).toBe(3)
  expect(labels.map((l) => l.name).sort()).toEqual(['Personal', 'Receipts', 'Work'])
})

test('seeding is idempotent across many concurrent first-load requests', async ({ page }) => {
  const { accessToken } = await signup(page)

  // Hammer the mailbox with parallel requests that each call ensureSeedForUser.
  // Without the in-flight Promise map this would triple-seed.
  const headers = apiHeaders(accessToken)
  await Promise.all([
    page.request.get(`${API_BASE}/emails/counts`, { headers }),
    page.request.get(`${API_BASE}/emails?folder=inbox`, { headers }),
    page.request.get(`${API_BASE}/labels`, { headers }),
    page.request.get(`${API_BASE}/folders`, { headers }),
    page.request.get(`${API_BASE}/drafts`, { headers }),
  ])

  const counts = await getCounts(page, accessToken)
  expect(counts.inbox).toBe(5)

  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 100 })
  // Distinct subjects — no duplicates.
  const subjects = new Set(inbox.map((e) => e.subject ?? ''))
  expect(subjects.size).toBe(inbox.length)
})

test('user B sees its own freshly seeded mailbox (no cross-user contamination)', async ({
  browser,
}) => {
  const aCtx = await browser.newContext()
  const aPage = await aCtx.newPage()
  const a = await signup(aPage)
  await getCounts(aPage, a.accessToken)

  const bCtx = await browser.newContext()
  const bPage = await bCtx.newPage()
  const b = await signup(bPage)

  const bEmails = await listEmails(bPage, b.accessToken, { folder: 'inbox' })
  expect(bEmails.length).toBe(5)
  for (const e of bEmails) {
    expect(e.user_id).toBe(b.userId)
  }
  await aCtx.close()
  await bCtx.close()
})
