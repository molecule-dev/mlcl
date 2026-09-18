/**
 * End-to-end user journey for customer-support-chat.
 *
 * A real support agent: signs up → opens the inbox → starts a
 * conversation → posts a reply → adds an internal note → escalates the
 * priority → adds a contact → creates an automation rule → creates a
 * canned response → renames the workspace → reloads, verifies
 * everything still there. Every backend invariant is read back to
 * confirm the action persisted.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, signup } from './_helpers.js'

interface ConversationRow {
  id: string
  subject: string
  status: string
  priority: string
  visitor_email: string | null
}

interface MessageRow {
  id: string
  sender_type: string
  type: string
  content: string
}

interface RuleRow {
  id: string
  name: string
  trigger: string
  enabled: boolean
}

interface CannedResponse {
  id: string
  shortcut: string
  content: string
}

interface ContactRow {
  id: string
  name: string | null
  email: string | null
}

interface UserMe {
  id: string
  email: string
  name: string | null
}

test.describe('99-user-journey', () => {
  test('full agent workflow: signup → inbox → reply → note → priority → contact → automation → canned → settings → reload', async ({
    page,
  }) => {
    // ─── 1. Sign up ──────────────────────────────────────────────
    const { email } = await signup(page)
    await expect(page).not.toHaveURL(/\/signup/)
    // Read the current user from the cookie-authed /users/me endpoint. [M1-1]
    // the auth client no longer mirrors the user into localStorage; the session
    // lives in the httpOnly cookie, which page.request sends automatically. API
    // contract returns user objects wrapped in { props }.
    const meResp = await page.request.get(APP_BASE + '/api/users/me')
    const meBefore = meResp.ok()
      ? ((await meResp.json()).props as { id: string; email?: string; name?: string | null })
      : null

    // ─── 2. Open inbox ───────────────────────────────────────────
    await page.goto(APP_BASE + '/inbox')
    await expect(page.getByRole('heading', { name: /inbox/i }).first()).toBeVisible()

    // ─── 3. Create a conversation through the UI ────────────────
    await page
      .getByRole('button', { name: /\+\s*new|new conversation/i })
      .first()
      .click()
    const dialog = page.getByRole('dialog', { name: /new conversation/i })
    await expect(dialog).toBeVisible()
    await dialog.locator('input[name="subject"]').fill('Pricing question for the Pro plan')
    await dialog.locator('input[name="visitor_name"]').fill('Maya Reyes')
    await dialog.locator('input[name="visitor_email"]').fill('maya@theroastery.co')
    await dialog.locator('select[name="priority"]').selectOption('normal')
    await dialog.getByRole('button', { name: /^create$/i }).click()
    await page.waitForURL(/\/conversation\//, { timeout: 20_000 })
    const convId = page.url().split('/conversation/')[1]
    expect(convId).toBeTruthy()

    // ─── 4. Send an agent reply through the composer ────────────
    const reply = 'Hi Maya — Pro is $15/mo and includes 500 conversations/month.'
    await page.getByRole('textbox', { name: /reply/i }).first().fill(reply)
    const replyResp = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/messages/${convId}`) &&
        r.request().method() === 'POST' &&
        r.status() < 400,
      { timeout: 20_000 },
    )
    await page.getByRole('button', { name: /^send$/i }).click()
    await replyResp

    // ─── 5. Add an internal note ─────────────────────────────────
    await page
      .getByRole('button', { name: /internal note/i })
      .first()
      .click()
    const note = 'Customer is shopping us against Intercom — push annual discount.'
    await page
      .getByRole('textbox', { name: /internal note/i })
      .first()
      .fill(note)
    const noteResp = page.waitForResponse(
      (r) => r.url().includes(`/api/messages/${convId}/note`) && r.status() < 400,
      { timeout: 20_000 },
    )
    await page.getByRole('button', { name: /save note/i }).click()
    await noteResp

    // ─── 6. Bump priority to urgent via dropdown ─────────────────
    const priorityResp = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/conversations/${convId}/priority`) &&
        r.request().method() === 'PUT' &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    await page
      .getByRole('combobox', { name: /priority/i })
      .first()
      .selectOption('urgent')
    await priorityResp

    // Backend state for conversation: agent reply + note + priority.
    const messages = await apiGet<MessageRow[]>(page, `/messages/${convId}`)
    expect(
      messages.find((m) => m.type === 'text' && m.content === reply),
      'agent reply must be on the conversation',
    ).toBeTruthy()
    expect(
      messages.find((m) => m.type === 'internal_note' && m.content === note),
      'note must be on the conversation',
    ).toBeTruthy()
    const conv = await apiGet<ConversationRow>(page, `/conversations/${convId}`)
    expect(conv.priority).toBe('urgent')

    // ─── 7. Add a contact ────────────────────────────────────────
    await page.goto(APP_BASE + '/contacts')
    await page
      .getByRole('button', { name: /add contact|new contact/i })
      .first()
      .click()
    await page.getByPlaceholder(/name/i).first().fill('Kai Patel')
    await page.getByPlaceholder(/email/i).first().fill('kai@example.com')
    await page
      .getByPlaceholder(/company/i)
      .first()
      .fill('Patel & Co')
    const contactResp = page.waitForResponse(
      (r) =>
        r.url().includes('/api/contacts') && r.request().method() === 'POST' && r.status() < 400,
      { timeout: 15_000 },
    )
    await page
      .getByRole('button', { name: /save contact|add contact|create/i })
      .first()
      .click()
    await contactResp

    // ─── 8. Create an automation rule ────────────────────────────
    await page.goto(APP_BASE + '/automations')
    await page
      .getByRole('button', { name: /\+\s*new rule/i })
      .first()
      .click()
    await page
      .getByPlaceholder(/rule name/i)
      .first()
      .fill('Greet new conversations')
    await page.getByRole('combobox').first().selectOption('inbound_message')
    const ruleResp = page.waitForResponse(
      (r) =>
        r.url().includes('/api/automations') && r.request().method() === 'POST' && r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /save rule/i }).click()
    await ruleResp

    // ─── 9. Create a canned response ─────────────────────────────
    await page
      .getByRole('button', { name: /\+\s*new canned/i })
      .first()
      .click()
    await page
      .getByPlaceholder(/shortcut/i)
      .first()
      .fill('/pricing')
    await page.getByPlaceholder(/title/i).first().fill('Pricing reply')
    await page
      .getByPlaceholder(/reply body/i)
      .first()
      .fill('Pro is $15/mo. Annual save 17%.')
    const cannedResp = page.waitForResponse(
      (r) =>
        r.url().includes('/api/canned-responses') &&
        r.request().method() === 'POST' &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /save canned response/i }).click()
    await cannedResp

    // ─── 10. Rename workspace through Settings ───────────────────
    await page.goto(APP_BASE + '/settings')
    const newName = 'The Roastery (Test ' + Date.now() + ')'
    await page.locator('input[name="workspaceName"]').fill(newName)
    const meId = meBefore?.id
    const settingsResp = page.waitForResponse(
      (r) => /\/api\/users\//.test(r.url()) && r.request().method() === 'PATCH' && r.status() < 400,
      { timeout: 15_000 },
    )
    await page
      .getByRole('button', { name: /^save$/i })
      .first()
      .click()
    await settingsResp

    // ─── 11. INVARIANT AUDIT: read everything back from the API ──
    if (meId) {
      const meAfter = await apiGet<{ props: UserMe }>(page, `/users/${meId}`).catch(() => null)
      if (meAfter) {
        expect(meAfter.props.email).toBe(email)
        expect(meAfter.props.name, 'workspace rename should round-trip via PATCH /users/:id').toBe(
          newName,
        )
        expect(meAfter.props.id).toBe(meId)
      }
    }
    const rules = await apiGet<RuleRow[]>(page, '/automations')
    expect(
      rules.find((r) => r.name === 'Greet new conversations'),
      'rule must persist',
    ).toBeTruthy()
    const canned = await apiGet<CannedResponse[]>(page, '/canned-responses')
    expect(
      canned.find((c) => c.shortcut === '/pricing' && c.content.includes('$15/mo')),
      'canned response must persist',
    ).toBeTruthy()
    const contacts = await apiGet<ContactRow[]>(page, '/contacts')
    expect(
      contacts.find((c) => c.email === 'kai@example.com'),
      'contact must persist',
    ).toBeTruthy()

    // ─── 12. RELOAD the conversation page — message + note + priority survive ──
    await page.goto(APP_BASE + `/conversation/${convId}`)
    await expect(page.getByText(reply).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(note).first()).toBeVisible()
    const select = page.getByRole('combobox', { name: /priority/i }).first()
    await expect(select).toHaveValue('urgent')

    // ─── 13. RELOAD settings — workspace name survives ──────────
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('input[name="workspaceName"]')).toHaveValue(newName, {
      timeout: 15_000,
    })
  })
})
