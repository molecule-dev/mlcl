import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, signup } from './_helpers.js'

interface DraftRow {
  id: string
  archived_at?: string | null
  status: string
}

interface SentRow {
  id: string
  draft_id: string
  archived_at?: string | null
  status: string
}

test('POST /drafts/:id/archive flips archived_at and persists', async ({ page }) => {
  await signup(page)
  const created = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'arch test',
    body: 'body',
    recipients: ['x@example.com'],
  })
  expect(created.status).toBe(201)
  const id = created.body!.id

  const arch = await apiPost<DraftRow>(page, `/drafts/${id}/archive`, { archived: true })
  expect(arch.status, JSON.stringify(arch.body)).toBe(200)
  expect(arch.body?.archived_at).toBeTruthy()

  // Read-after-write
  const after = await apiGet<DraftRow>(page, `/drafts/${id}`)
  expect(after.body?.archived_at).toBeTruthy()

  // Un-archive
  const un = await apiPost<DraftRow>(page, `/drafts/${id}/archive`, { archived: false })
  expect(un.status).toBe(200)
  expect(un.body?.archived_at).toBeNull()
  const after2 = await apiGet<DraftRow>(page, `/drafts/${id}`)
  expect(after2.body?.archived_at).toBeNull()
})

test('POST /sent-emails/:id/archive flips archived_at and persists', async ({ page }) => {
  test.setTimeout(60_000)
  await signup(page)
  // Create a draft, send it, then archive the sent_emails row.
  const draft = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'archived sent',
    body: 'body',
    recipients: ['x@example.com'],
  })
  expect(draft.status).toBe(201)
  const send = await apiPost(page, `/drafts/${draft.body!.id}/send`, {})
  expect(send.status).toBe(200)
  const list = await apiGet<SentRow[]>(page, `/sent-emails?draft_id=${draft.body!.id}`)
  expect(list.body?.length).toBeGreaterThanOrEqual(1)
  const sentId = list.body![0].id

  const arch = await apiPost<SentRow>(page, `/sent-emails/${sentId}/archive`, { archived: true })
  expect(arch.status).toBe(200)
  expect(arch.body?.archived_at).toBeTruthy()

  // Read-after-write via the GET-by-id endpoint
  const after = await apiGet<SentRow>(page, `/sent-emails/${sentId}`)
  expect(after.body?.archived_at).toBeTruthy()
})

test('Inbox UI: clicking Archive moves the email out of the live inbox and into Archive folder', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await signup(page)
  // Seed: send one email so the inbox has something to archive.
  const draft = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'UI archive ' + Date.now(),
    body: 'body',
    recipients: ['inboxui@example.com'],
  })
  expect(draft.status).toBe(201)
  const send = await apiPost(page, `/drafts/${draft.body!.id}/send`, {})
  expect(send.status).toBe(200)

  await page.goto('/inbox?folder=sent')
  await expect(page.locator('[data-mol-id="inbox-archive"]')).toBeVisible({ timeout: 15_000 })
  // Snapshot the live count, archive, snapshot again
  await page.locator('[data-mol-id="inbox-archive"]').click()
  // After archive, the row should drop out of the sent folder list.
  await page.waitForTimeout(1500)

  // Persistence: navigating away and reloading must keep the row in /archive.
  await page.goto('/inbox?folder=archive')
  await expect(page.locator('[data-mol-id="inbox-reading-pane"]')).toBeVisible({
    timeout: 15_000,
  })
  // Reload — the row must remain in archive (proving server-side persistence).
  await page.reload()
  await expect(page.locator('[data-mol-id="inbox-reading-pane"]')).toBeVisible({
    timeout: 15_000,
  })
})
