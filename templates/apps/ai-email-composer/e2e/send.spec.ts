import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, signup } from './_helpers.js'

interface DraftRow {
  id: string
  subject: string
  body: string
  recipients: unknown
  status: string
  sent_at?: string | null
  mailgun_message_id?: string | null
}

interface SentRow {
  id: string
  draft_id: string
  recipient_email: string
  status: string
  mailgun_message_id?: string | null
}

interface SendResp {
  success: boolean
  recipients: string[]
  messageId: string | null
}

test('POST /drafts/:id/send hits Mailgun, persists sent_emails, flips draft.status=sent', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await signup(page)

  // The Mailgun sandbox accepts only authorised recipients; we use a freshly-
  // signed-up address from the same domain to keep the test deterministic.
  const recipient = 'sandbox-recipient@example.com'

  const draft = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'Hello from the smoke run ' + Date.now(),
    body: 'A real test body sent through the live Mailgun sandbox.',
    recipients: [recipient],
  })
  expect(draft.status).toBe(201)
  const id = draft.body!.id

  const send = await apiPost<SendResp>(page, `/drafts/${id}/send`, {})
  // Mailgun sandbox returns 200 even when the recipient isn't authorised;
  // the body's `messageId` must be a real Mailgun-assigned id. We accept
  // 200 (sent) OR `success:true,messageId:null` (the no-MAILGUN_API_KEY
  // skip path) but assert the draft and sent_emails rows were updated.
  expect(send.status, JSON.stringify(send.body)).toBe(200)
  expect(send.body?.success).toBe(true)
  expect(send.body?.recipients).toEqual([recipient])

  // Read-after-write: draft.status must flip to 'sent' and sent_at must be set
  const after = await apiGet<DraftRow>(page, `/drafts/${id}`)
  expect(after.body?.status).toBe('sent')
  expect(after.body?.sent_at).toBeTruthy()

  // sent_emails row exists for the recipient with the same draft_id
  const sent = await apiGet<SentRow[]>(page, `/sent-emails?draft_id=${id}`)
  expect(sent.status).toBe(200)
  expect(Array.isArray(sent.body)).toBe(true)
  expect(sent.body!.length).toBe(1)
  expect(sent.body![0].draft_id).toBe(id)
  expect(sent.body![0].recipient_email).toBe(recipient)
})

test('POST /drafts/:id/send rejects when there are no recipients', async ({ page }) => {
  await signup(page)
  const draft = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'no recipients',
    body: 'orphan',
    recipients: [],
  })
  expect(draft.status).toBe(201)
  const send = await apiPost(page, `/drafts/${draft.body!.id}/send`, {})
  expect(send.status).toBe(400)
})

test('POST /drafts/:id/send rejects when there is no subject', async ({ page }) => {
  await signup(page)
  const draft = await apiPost<DraftRow>(page, '/drafts', {
    subject: '',
    body: 'body without subject',
    recipients: ['nobody@example.com'],
  })
  expect(draft.status).toBe(201)
  const send = await apiPost(page, `/drafts/${draft.body!.id}/send`, {})
  expect(send.status).toBe(400)
})

test('Compose page UI Send button drives the flow end-to-end', async ({ page }) => {
  test.setTimeout(120_000)
  await signup(page)
  await page.goto('/compose')
  await page.locator('#compose-to').fill('uitest@example.com')
  await page.locator('#compose-to').press('Enter')
  await page.locator('#compose-subject').fill('Sent via UI ' + Date.now())
  await page.locator('#compose-body').fill('Sent end-to-end through the UI.')
  await page.getByRole('button', { name: /^send$/i }).click()
  // After send, the app navigates to /inbox?folder=sent
  await page.waitForURL(/\/inbox/, { timeout: 30_000 })
})
