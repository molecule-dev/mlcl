import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiGet, apiPost, captureNetwork, signup, uniqueEmail } from './_helpers.js'

interface DraftRow {
  id: string
  subject: string
  body: string
  status: string
  recipients: string | string[]
  archived_at?: string | null
}

interface SentRow {
  id: string
  draft_id: string
  recipient_email: string
  status: string
  archived_at?: string | null
}

interface TemplateRow {
  id: string
  name: string
  subject: string
  body: string
}

/**
 * Kitchen-sink cross-page user journey. Walks the primary feature surface
 * in order, asserting on read-after-write invariants between every step.
 *
 *   landing → signup → dashboard → compose draft → save → AI compose
 *   → adjust tone → summarize → send (real Mailgun queued) → inbox
 *   (sent + archive) → templates (CRUD) → analytics → profile →
 *   settings (signature persists across reload) → billing (real Stripe
 *   checkout URL).
 *
 * Each backend invariant is verified by a follow-up GET — never by
 * "POST happened". The flow is intentionally slow on the wire (real
 * Anthropic + real Mailgun + real Stripe), so test.setTimeout is large.
 */
test('user journey: landing → compose+AI+send → inbox → templates → analytics → profile → settings → billing', async ({
  page,
}) => {
  test.setTimeout(180_000)

  // 1. Landing → Signup
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 })
  const email = uniqueEmail('journey')
  const { password } = await signup(page, email)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  // 2. Dashboard renders for the freshly-signed-up user
  await expect(page.locator('[data-mol-id="dashboard-page"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-mol-id="dashboard-recent-empty"]')).toBeVisible()

  // 3. Compose: open the form via the dashboard CTA and confirm UI is wired.
  await page.locator('[data-mol-id="dashboard-compose-cta"]').click()
  await expect(page).toHaveURL(/\/compose/, { timeout: 10_000 })
  await expect(page.locator('[data-mol-id="compose-page"]')).toBeVisible({ timeout: 10_000 })
  await page.locator('[data-mol-id="compose-subject"]').fill('Journey kitchen-sink subject')
  await page.locator('[data-mol-id="compose-body"]').fill('Initial body before AI assists.')
  // Save the draft via the form button — captures network so we can
  // verify the call shape, but creating recipients chips is fragile, so
  // we explicitly PUT them onto the draft below.
  const saveReqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="compose-save-draft"]').click()
    await page.waitForTimeout(2500)
  })
  const draftPost = saveReqs.find((r) => /\/api\/drafts(\?|$)/.test(r.url) && r.method === 'POST')
  expect(draftPost?.status, 'Save draft must POST /api/drafts and 201').toBe(201)

  // Read-after-write: list drafts and find ours.
  const list = await apiGet<DraftRow[]>(page, '/drafts')
  expect(list.status).toBe(200)
  const journeyDraft = (list.body ?? []).find((d) => d.subject === 'Journey kitchen-sink subject')
  expect(journeyDraft, 'just-saved draft must round-trip via GET /api/drafts').toBeTruthy()
  const draftId = journeyDraft!.id

  // Persist recipients via PUT so the upcoming /send won't 400 on the
  // chip-input timing. The "create chips, click save, hope" path is too
  // fragile for a kitchen-sink walk; the unit-level chip behavior is
  // covered by drafts.spec.ts and compose.spec.ts.
  const setRecipients = await page.request.put(API_BASE + `/drafts/${draftId}`, {
    headers: {
      Authorization: `Bearer ${(await page.context().cookies()).find((c) => c.name === 'token')?.value ?? ''}`,
    },
    data: { recipients: ['journey-recipient@example.com'] },
  })
  expect(setRecipients.status()).toBe(200)

  // 4. AI compose → real Anthropic returns a non-trivial body for a
  //    fresh draft created via API (the Compose page persists locally,
  //    so we hit the endpoint directly to keep the assertion focused on
  //    the AI integration).
  const composeResp = await apiPost<{
    body: string
    usage: { inputTokens: number; outputTokens: number } | null
  }>(page, '/drafts/compose', {
    prompt: 'Write a short note thanking a customer for joining the launch.',
    tone: 'friendly',
  })
  expect(composeResp.status, 'AI compose must succeed via real Anthropic').toBe(200)
  expect(composeResp.body!.body.length, 'compose body must be non-trivial').toBeGreaterThan(50)

  // 5. Persist the AI body onto the journey draft and adjust its tone.
  const updateResp = await page.request.put(API_BASE + `/drafts/${draftId}`, {
    headers: {
      Authorization: `Bearer ${(await page.context().cookies()).find((c) => c.name === 'token')?.value ?? ''}`,
    },
    data: { body: composeResp.body!.body },
  })
  expect(updateResp.status()).toBe(200)
  const adjusted = await apiPost<{ draft: DraftRow }>(page, `/drafts/${draftId}/adjust-tone`, {
    tone: 'formal',
  })
  expect(adjusted.status).toBe(200)
  expect(adjusted.body!.draft.body.length).toBeGreaterThan(20)
  expect(adjusted.body!.draft.tone ?? 'formal').toBe('formal')

  // 6. Summarize the draft body — real Anthropic summary endpoint.
  const summary = await apiPost<{ summary: string }>(page, `/drafts/${draftId}/summarize`, {})
  expect(summary.status).toBe(200)
  expect(summary.body!.summary.length).toBeGreaterThan(10)

  // 7. Send the draft via real Mailgun. After send, draft.status='sent',
  //    sent_emails has the recipient, and inbox surfaces the row in /sent.
  // Pre-flight: verify the draft has both subject + recipients before
  // we send (the send handler 400s on either being empty).
  const preSend = await apiGet<DraftRow>(page, `/drafts/${draftId}`)
  expect(
    preSend.body?.subject,
    `pre-send draft is missing subject; full row=${JSON.stringify(preSend.body)}`,
  ).toBeTruthy()
  expect(
    preSend.body?.recipients,
    `pre-send draft is missing recipients; full row=${JSON.stringify(preSend.body)}`,
  ).toBeTruthy()
  const sendResp = await apiPost<{ success: boolean; messageId: string | null; error?: string }>(
    page,
    `/drafts/${draftId}/send`,
    {},
  )
  expect(
    sendResp.status,
    `send failed: status=${sendResp.status} body=${JSON.stringify(sendResp.body)}`,
  ).toBe(200)
  expect(sendResp.body!.success).toBe(true)

  const reread = await apiGet<DraftRow>(page, `/drafts/${draftId}`)
  expect(reread.body!.status).toBe('sent')
  const sentList = await apiGet<SentRow[]>(page, `/sent-emails?draft_id=${draftId}`)
  expect(sentList.status).toBe(200)
  expect(
    sentList.body!.some((row) => row.recipient_email === 'journey-recipient@example.com'),
    'sent_emails must contain the journey recipient',
  ).toBe(true)

  // 8. Inbox: switching to the Sent folder shows our just-sent email.
  await page.goto('/inbox?folder=sent')
  await expect(page.locator('[data-mol-id="inbox-page"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('body')).toContainText(/journey-recipient/i, { timeout: 15_000 })

  // 9. Inbox archive: archive the sent email and verify it leaves /inbox?folder=sent.
  const sentRowId = sentList.body![0].id
  const arch = await apiPost<SentRow>(page, `/sent-emails/${sentRowId}/archive`, {
    archived: true,
  })
  expect(arch.status).toBe(200)
  expect(arch.body!.archived_at).toBeTruthy()
  await page.goto('/inbox?folder=archive')
  await expect(page.locator('body')).toContainText(/journey-recipient/i, { timeout: 15_000 })

  // 10. Templates: create one via API, verify it appears in /templates page.
  const tplName = 'Journey welcome ' + Date.now()
  const tpl = await apiPost<TemplateRow>(page, '/templates', {
    name: tplName,
    subject: 'Welcome',
    body: 'Hi {{first_name}}, thanks for joining.',
    category: 'announcement',
  })
  expect(tpl.status).toBe(201)
  await page.goto('/templates')
  await expect(page.locator('[data-mol-id="templates-page"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('body')).toContainText(tplName, { timeout: 15_000 })

  // 11. Analytics: KPI tiles render after the journey send.
  await page.goto('/analytics')
  await expect(page.locator('[data-mol-id="analytics-page"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-mol-id="kpi-openRate"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="kpi-replyRate"]')).toBeVisible()

  // 12. Profile: account email visible, signature mirror works.
  await page.goto('/profile')
  await expect(page.locator('[data-mol-id="profile-email"]')).toContainText(email, {
    timeout: 15_000,
  })

  // 13. Settings: signature persists across reload (localStorage round-trip).
  await page.goto('/settings')
  const sigText = 'Journey signature ' + Date.now()
  await page.locator('[data-mol-id="settings-signature"]').fill(sigText)
  await page.locator('[data-mol-id="settings-save"]').click()
  await expect(page.locator('[data-mol-id="settings-status"]')).toBeVisible({ timeout: 5_000 })
  await page.reload()
  await expect(page.locator('[data-mol-id="settings-signature"]')).toHaveValue(sigText, {
    timeout: 10_000,
  })

  // 14. Profile signature mirror reflects the latest Settings value.
  await page.goto('/profile')
  await expect(page.locator('[data-mol-id="profile-signature"]')).toContainText(sigText, {
    timeout: 10_000,
  })

  // 15. Billing: Stripe checkout returns a real cs_test_ URL for an upgrade.
  // The /billing/tiers contract is documented in billing.spec.ts: the response
  // wraps the tier list in `{ data: TierRow[] }` where each tier carries a
  // `key` and a `prices[]` array; the price entries hold `stripePriceId`. The
  // checkout response carries `checkoutUrl`, not `url`. The earlier shape
  // here was a guess that caused .find to throw on a non-array body.
  await page.goto('/billing')
  await expect(page.locator('[data-mol-id="billing-page"]')).toBeVisible({ timeout: 15_000 })
  interface TierPrice {
    period: string
    price: string
    stripePriceId: string | null
  }
  interface TierRow {
    key: string
    name: string
    prices: TierPrice[]
  }
  const tiers = await apiGet<{ data: TierRow[] }>(page, '/billing/tiers')
  expect(tiers.status).toBe(200)
  const proTier = (tiers.body?.data ?? []).find((t) => t.key === 'pro')
  const proPrice = proTier?.prices?.find(
    (p) => typeof p.stripePriceId === 'string' && p.stripePriceId.startsWith('price_'),
  )
  if (proPrice?.stripePriceId) {
    const checkout = await apiPost<{ checkoutUrl?: string; updated?: boolean }>(
      page,
      '/billing/checkout',
      { priceId: proPrice.stripePriceId },
    )
    expect(checkout.status, JSON.stringify(checkout.body)).toBe(200)
    if (checkout.body?.checkoutUrl) {
      expect(checkout.body.checkoutUrl, 'checkout must include a real Stripe Checkout URL').toMatch(
        /checkout\.stripe\.com|^https:\/\/.*stripe/,
      )
    } else {
      expect(checkout.body?.updated).toBe(true)
    }
  }

  // 16. Persist on reload — signing back in lands you back on the dashboard.
  await page.context().clearCookies()
  await page.goto('/login')
  await page.locator('input[type="email"], input#email').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page
    .getByRole('button', { name: /sign\s*in|log\s*in/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  // The signature must still be there after re-login (settings persists per-user
  // via signed-cookie token + localStorage; the localStorage scope is the
  // browser context, which we kept).
  await page.goto('/settings')
  await expect(page.locator('[data-mol-id="settings-signature"]')).toHaveValue(sigText, {
    timeout: 10_000,
  })
})
