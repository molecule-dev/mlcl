import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, signup } from './_helpers.js'

interface DraftRow {
  id: string
  subject: string
  body: string
  recipients: unknown
  status: string
  tone?: string | null
}

test('POST /drafts/compose returns a real Anthropic-generated body', async ({ page }) => {
  test.setTimeout(120_000)
  await signup(page)
  const r = await apiPost<{
    body: string
    usage: { inputTokens: number; outputTokens: number } | null
  }>(page, '/drafts/compose', {
    prompt: 'Write a 3-sentence professional reply confirming receipt of a quote',
    tone: 'friendly',
  })
  expect(r.status, JSON.stringify(r.body)).toBe(200)
  expect(typeof r.body?.body).toBe('string')
  // Real AI generation produces non-trivial output
  expect((r.body?.body ?? '').length).toBeGreaterThan(50)
  // The Anthropic provider must have actually been called — usage tokens > 0
  expect(r.body?.usage?.outputTokens ?? 0).toBeGreaterThan(0)
})

test('POST /drafts/:id/adjust-tone rewrites the body and persists', async ({ page }) => {
  test.setTimeout(120_000)
  await signup(page)
  const draft = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'Investor update',
    body: 'Here is the brief monthly investor update with revenue and milestones. We hit our targets.',
    recipients: ['investors@example.com'],
  })
  expect(draft.status).toBe(201)
  const id = draft.body!.id

  const adjust = await apiPost<{ draft: DraftRow }>(page, `/drafts/${id}/adjust-tone`, {
    tone: 'formal',
  })
  expect(adjust.status, JSON.stringify(adjust.body)).toBe(200)
  const newBody = adjust.body?.draft?.body ?? ''
  expect(newBody.length).toBeGreaterThan(20)
  expect(newBody).not.toBe(
    'Here is the brief monthly investor update with revenue and milestones. We hit our targets.',
  )

  // Read-after-write: the new body must be persisted
  const after = await apiGet<DraftRow>(page, `/drafts/${id}`)
  expect(after.body?.body).toBe(newBody)
  expect(after.body?.tone).toBe('formal')
})

test('POST /drafts/:id/summarize returns a non-trivial summary', async ({ page }) => {
  test.setTimeout(120_000)
  await signup(page)
  const draft = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'Long product update',
    body:
      'Hi team — this is a long internal update covering the past quarter. We shipped six major features, ' +
      'rolled out the new analytics dashboard, expanded into two new markets, and onboarded 47 enterprise ' +
      'customers. Customer satisfaction scored 4.6/5. Revenue grew 38% quarter over quarter, well above ' +
      'plan. Roadmap for Q4 includes a mobile app launch, API v2, and a self-serve onboarding flow.',
    recipients: ['team@example.com'],
  })
  expect(draft.status).toBe(201)

  const r = await apiPost<{ summary: string }>(page, `/drafts/${draft.body!.id}/summarize`, {})
  expect(r.status, JSON.stringify(r.body)).toBe(200)
  expect((r.body?.summary ?? '').length).toBeGreaterThan(20)
})

test('Compose page UI: typing a prompt and clicking AI populates the body', async ({ page }) => {
  test.setTimeout(120_000)
  await signup(page)
  await page.goto('/compose')
  await page
    .locator('#compose-ai-prompt')
    .fill('Polite follow-up after a missed meeting, two short paragraphs.')
  await page.getByRole('button', { name: /compose with signet/i }).click()
  // Wait for body textarea to be populated
  await expect
    .poll(async () => (await page.locator('#compose-body').inputValue()).length, {
      timeout: 60_000,
    })
    .toBeGreaterThan(50)
})
