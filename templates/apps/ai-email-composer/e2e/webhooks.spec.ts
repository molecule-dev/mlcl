import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiGet, apiPost, signup } from './_helpers.js'

interface DraftRow {
  id: string
}

interface SentRow {
  id: string
  status: string
  draft_id: string
  mailgun_message_id?: string | null
  opened_at?: string | null
}

test('Mailgun webhook with an invalid signature is recorded but rejected (401)', async ({
  page,
}) => {
  // The webhook handler MUST reject unsigned/invalid payloads. A 2xx for an
  // unverifiable webhook would let any internet caller trash sent_emails.
  const resp = await page.request.post(API_BASE + '/webhooks/mailgun', {
    data: {
      signature: { timestamp: '0', token: 'bogus', signature: '00' },
      'event-data': { event: 'delivered' },
    },
  })
  expect(resp.status()).toBe(401)
})

test('Mailgun delivery webhook (valid signature) flips sent_emails.status', async ({ page }) => {
  test.setTimeout(60_000)
  // Build a valid signature using the same key the handler verifies with.
  // The smoke env populates MAILGUN_API_KEY which the handler also uses
  // as the webhook key when MAILGUN_WEBHOOK_SIGNING_KEY isn't set.
  // playwright.config.ts loads `../api/.env` into process.env so this
  // matches what the handler sees on the other side.
  const crypto = await import('node:crypto')
  const apiKey = process.env.MAILGUN_API_KEY
  expect(
    apiKey,
    'MAILGUN_API_KEY must be in env (loaded from api/.env by playwright.config.ts) so the test can forge a valid webhook signature',
  ).toBeTruthy()

  await signup(page)
  // Seed a sent email so we have a sent_emails row to update.
  const draft = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'Webhook target ' + Date.now(),
    body: 'For delivery webhook test.',
    recipients: ['hooktarget@example.com'],
  })
  expect(draft.status).toBe(201)
  const send = await apiPost(page, `/drafts/${draft.body!.id}/send`, {})
  expect(send.status).toBe(200)
  const sent = await apiGet<SentRow[]>(page, `/sent-emails?draft_id=${draft.body!.id}`)
  expect(sent.body?.length).toBeGreaterThan(0)
  const sentRow = sent.body![0]

  // The send handler ALWAYS populates mailgun_message_id when
  // MAILGUN_API_KEY is set — either with the real Mailgun-assigned id
  // (production / authorised sandbox recipient) or with the synthetic
  // `<sandbox-…@…>` id minted by the mailgun bond when the sandbox
  // domain rejects an unauthorised recipient with 403. Either way the
  // webhook handler joins on (mailgun_message_id, recipient_email),
  // so we can replay whichever id the send returned.
  expect(
    sentRow.mailgun_message_id,
    'send should always populate mailgun_message_id when MAILGUN_API_KEY is configured',
  ).toBeTruthy()
  const messageId = sentRow.mailgun_message_id!

  const timestamp = String(Math.floor(Date.now() / 1000))
  const token = 'token-' + Date.now()
  const hmac = crypto.createHmac('sha256', apiKey!)
  hmac.update(timestamp + token)
  const signature = hmac.digest('hex')

  const resp = await page.request.post(API_BASE + '/webhooks/mailgun', {
    data: {
      signature: { timestamp, token, signature },
      'event-data': {
        event: 'opened',
        message: { headers: { 'message-id': messageId } },
        recipient: 'hooktarget@example.com',
      },
    },
  })
  expect(resp.status(), 'valid signature must be accepted').toBe(200)

  // Read-after-write: the sent_emails row's status must now be 'opened'
  // and opened_at must be populated.
  await page.waitForTimeout(500)
  const updated = await apiGet<SentRow>(page, `/sent-emails/${sentRow.id}`)
  expect(updated.body?.status).toBe('opened')
  expect(updated.body?.opened_at).toBeTruthy()
})

test('Stripe payment-notification webhook with a fake signature is rejected', async ({ page }) => {
  // The Stripe webhook lives at /api/users/payment-notification/stripe.
  // It MUST verify the Stripe-Signature header before any state mutation.
  // A 2xx for an unsigned payload would let any caller flip user plans.
  const resp = await page.request.post(API_BASE + '/users/payment-notification/stripe', {
    headers: { 'Stripe-Signature': 't=0,v1=00,v0=00' },
    data: {
      id: 'evt_fake',
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_fake' } },
    },
  })
  // Stripe library returns 400 for invalid signatures; either 400 or 401
  // is correct, anything 2xx is a bug.
  expect(
    resp.status(),
    `expected 4xx for fake Stripe signature; got ${resp.status()}`,
  ).toBeGreaterThanOrEqual(400)
  expect(resp.status()).toBeLessThan(500)
})

test('GET /webhooks lists webhook events for an authenticated user', async ({ page }) => {
  await signup(page)
  // The endpoint requires auth (verified by middleware).
  const resp = await apiGet<unknown>(page, '/webhooks')
  expect(resp.status, JSON.stringify(resp.body)).toBe(200)
  expect(Array.isArray(resp.body)).toBe(true)
})
