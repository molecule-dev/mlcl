import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiPost, signup } from './_helpers.js'

interface DraftRow {
  id: string
  subject: string
  body: string
}

interface SentRow {
  id: string
  draft_id: string
  recipient_email: string
}

interface SendResp {
  success: boolean
  recipients: string[]
}

async function seedSent(
  page:
    | ReturnType<Parameters<Parameters<typeof test>[1]>[0]['page' & string]>
    | typeof test extends never
    ? never
    : never,
) {
  // unreachable — placeholder for typing parity; real helper is below
}
void seedSent

/**
 * Seeds: signup → create draft → send → return the sent_emails id and the
 * underlying draft for the test to assert against in /compose?reply= and
 * /compose?forward= scenarios.
 */
async function seedSentEmail(page: import('@playwright/test').Page) {
  await signup(page)
  const draft = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'Original topic ' + Date.now(),
    body: 'Original body content with enough text to verify quoting.',
    recipients: ['target@example.com'],
  })
  expect(draft.status).toBe(201)
  const send = await apiPost<SendResp>(page, `/drafts/${draft.body!.id}/send`, {})
  expect(send.status).toBe(200)
  // Find the sent_emails row.
  const list = await page.request.get(
    `http://localhost:${process.env.API_PORT || '4000'}/api/sent-emails?draft_id=${draft.body!.id}`,
    {
      headers: {
        Authorization:
          'Bearer ' + (await page.context().cookies()).find((c) => c.name === 'token')?.value,
      },
    },
  )
  const rows = (await list.json()) as SentRow[]
  expect(rows.length).toBeGreaterThan(0)
  return { draft: draft.body!, sentId: rows[0].id, sentRecipient: rows[0].recipient_email }
}

test('?reply=<sent_id> pre-fills "Re: <subject>" and the original recipient', async ({ page }) => {
  const seed = await seedSentEmail(page)
  await page.goto(`/compose?reply=${seed.sentId}`)
  // Wait for hydration: subject should populate from the original draft.
  await expect
    .poll(async () => await page.locator('#compose-subject').inputValue(), { timeout: 15_000 })
    .toMatch(/^Re:\s/)
  // Recipient chip must be the original recipient.
  await expect(page.locator('[data-mol-id="compose-recipient-chip"]')).toContainText(
    seed.sentRecipient,
    { timeout: 10_000 },
  )
  // Body should contain the quoted original body so the user has context.
  const body = await page.locator('#compose-body').inputValue()
  expect(body).toContain('Original body content')
})

test('?forward=<sent_id> pre-fills "Fwd: <subject>" with NO recipients', async ({ page }) => {
  const seed = await seedSentEmail(page)
  await page.goto(`/compose?forward=${seed.sentId}`)
  await expect
    .poll(async () => await page.locator('#compose-subject').inputValue(), { timeout: 15_000 })
    .toMatch(/^Fwd:\s/)
  // No recipient chips.
  await expect(page.locator('[data-mol-id="compose-recipient-chip"]')).toHaveCount(0)
  // Body still includes the original content.
  const body = await page.locator('#compose-body').inputValue()
  expect(body).toContain('Original body content')
})

test('?reply= followed by ?forward= produces a fresh "Fwd:" subject (no double-prefix)', async ({
  page,
}) => {
  const seed = await seedSentEmail(page)
  await page.goto(`/compose?reply=${seed.sentId}`)
  await expect
    .poll(async () => await page.locator('#compose-subject').inputValue(), {
      timeout: 15_000,
    })
    .toMatch(/^Re:\s/)
  // Now navigate to the forward URL — the subject should switch to Fwd:
  await page.goto(`/compose?forward=${seed.sentId}`)
  await expect
    .poll(async () => await page.locator('#compose-subject').inputValue(), {
      timeout: 15_000,
    })
    .toMatch(/^Fwd:\s/)
  const subj = await page.locator('#compose-subject').inputValue()
  // Must NOT contain "Re: Re:" or "Fwd: Re:" mash-ups.
  expect(subj).not.toMatch(/(Re|Fwd):\s+(Re|Fwd):/i)
})

test('Inbox UI Reply button on a sent email opens Compose with the original recipient pre-filled', async ({
  page,
}) => {
  const seed = await seedSentEmail(page)
  await page.goto('/inbox?folder=sent')
  await page.locator('[data-mol-id="inbox-reply"]').first().click()
  await page.waitForURL(/\/compose\?reply=/, { timeout: 15_000 })
  await expect(page.locator('[data-mol-id="compose-recipient-chip"]')).toContainText(
    seed.sentRecipient,
    { timeout: 15_000 },
  )
})
