import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, signup } from './_helpers.js'

interface ConversationRow {
  id: string
  status: string
  priority: string
  subject: string
  closed_at: string | null
}

interface MessageRow {
  id: string
  conversation_id: string
  sender_type: string
  content: string
  type: string
  created_at: string
}

async function seedConversation(page: any): Promise<ConversationRow> {
  return apiPost<ConversationRow>(page, '/conversations', {
    subject: 'Test conversation',
    visitor_name: 'Visitor',
    visitor_email: 'visitor@example.com',
    priority: 'normal',
  })
}

test.describe('/conversation/:id', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('renders the conversation header with the right subject and status', async ({ page }) => {
    const conv = await seedConversation(page)
    await page.goto(APP_BASE + `/conversation/${conv.id}`)
    await expect(page.getByText(conv.subject).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/visitor@example/).first()).toBeVisible()
  })

  test('agent reply persists to the database AND appears in UI on reload', async ({ page }) => {
    const conv = await seedConversation(page)
    await page.goto(APP_BASE + `/conversation/${conv.id}`)
    const composer = page.getByRole('textbox', { name: /reply/i }).first()
    const reply = 'Thanks for reaching out — what is your order number?'
    await composer.fill(reply)
    // Register response listener BEFORE clicking, otherwise a fast POST can
    // resolve before the listener attaches.
    const respPromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/messages/${conv.id}`) &&
        r.request().method() === 'POST' &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /^send$/i }).click()
    await respPromise
    const msgs = await apiGet<MessageRow[]>(page, `/messages/${conv.id}`)
    const agentMsgs = msgs.filter((m) => m.sender_type === 'agent' && m.type === 'text')
    expect(
      agentMsgs.some((m) => m.content === reply),
      'agent reply must be persisted',
    ).toBe(true)
    await page.reload()
    await expect(page.getByText(reply).first()).toBeVisible({ timeout: 15_000 })
  })

  test('internal note saves with type=internal_note and is visible after reload', async ({
    page,
  }) => {
    const conv = await seedConversation(page)
    await page.goto(APP_BASE + `/conversation/${conv.id}`)
    await page
      .getByRole('button', { name: /internal note/i })
      .first()
      .click()
    const composer = page.getByRole('textbox', { name: /internal note/i }).first()
    const note = 'Customer is a known VIP — escalate if not resolved by EOD.'
    await composer.fill(note)
    const respPromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/messages/${conv.id}/note`) &&
        r.request().method() === 'POST' &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /save note/i }).click()
    await respPromise
    const msgs = await apiGet<MessageRow[]>(page, `/messages/${conv.id}`)
    const noteRow = msgs.find((m) => m.type === 'internal_note' && m.content === note)
    expect(noteRow, 'internal note must be saved with type=internal_note').toBeTruthy()
    await page.reload()
    await expect(page.getByText(note).first()).toBeVisible({ timeout: 15_000 })
  })

  test('Mark resolved closes the conversation; Reopen flips it back (read-after-write)', async ({
    page,
  }) => {
    const conv = await seedConversation(page)
    await page.goto(APP_BASE + `/conversation/${conv.id}`)
    const closeResp = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/conversations/${conv.id}/close`) &&
        r.request().method() === 'PUT' &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /mark resolved/i }).click()
    await closeResp
    let after = await apiGet<ConversationRow>(page, `/conversations/${conv.id}`)
    expect(after.status).toBe('closed')
    expect(after.closed_at).not.toBeNull()

    await page.reload()
    const reopenResp = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/conversations/${conv.id}/reopen`) &&
        r.request().method() === 'PUT' &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /reopen/i }).click()
    await reopenResp
    after = await apiGet<ConversationRow>(page, `/conversations/${conv.id}`)
    expect(after.status).toBe('open')
  })

  test('Priority dropdown updates the conversation row in the database', async ({ page }) => {
    const conv = await seedConversation(page)
    await page.goto(APP_BASE + `/conversation/${conv.id}`)
    const respPromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/conversations/${conv.id}/priority`) &&
        r.request().method() === 'PUT' &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    await page
      .getByRole('combobox', { name: /priority/i })
      .first()
      .selectOption('urgent')
    await respPromise
    const after = await apiGet<ConversationRow>(page, `/conversations/${conv.id}`)
    expect(after.priority).toBe('urgent')
    await page.reload()
    const select = page.getByRole('combobox', { name: /priority/i }).first()
    await expect(select).toHaveValue('urgent')
  })
})
