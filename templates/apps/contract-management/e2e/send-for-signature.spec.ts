/**
 * Backend invariants for POST /api/contracts/:id/send.
 *
 * The handler is supposed to:
 *  - flip the contract's status to `pending`
 *  - create a `signatures` row with a token (so the link is deliverable)
 *  - drop a `notifications` row for the owner
 *  - call sendMail with the signing link, surfacing `email_delivered`
 *    in the response body so callers know whether the recipient
 *    actually received an email
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  seedContract,
  seedCounterparty,
  signup,
} from './_helpers.js'

test.describe('POST /contracts/:id/send', () => {
  test('returns email_delivered + signing_link, creates signature with token, drops notification', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const cp = await seedCounterparty(page, accessToken, {
      organization: 'Globex Co',
      contact_email: 'globex+sig@example.com',
    })
    const c = await seedContract(page, accessToken, {
      title: 'Send-Email Test',
      counterparty_id: cp.id,
      party_email: 'globex+sig@example.com',
    })

    const sendRes = await page.request.post(`${API_BASE}/contracts/${c.id}/send`, {
      headers: authHeaders(accessToken),
      data: {},
      failOnStatusCode: false,
    })
    expect(sendRes.status()).toBe(200)
    const body = (await sendRes.json()) as {
      status: string
      email_delivered?: boolean
      signing_link?: string
    }
    expect(body.status).toBe('pending')
    expect(body.signing_link).toMatch(/\/sign\/[a-f0-9]{20,}/)
    // email_delivered may be false in CI/sandbox without a real mailgun key,
    // but the field MUST be present so callers can report a real status.
    expect(typeof body.email_delivered).toBe('boolean')

    // Read-after-write: status really is `pending` server-side.
    const fresh = await page.request.get(`${API_BASE}/contracts/${c.id}`, {
      headers: authHeaders(accessToken),
    })
    expect(fresh.status()).toBe(200)
    expect(((await fresh.json()) as { status: string }).status).toBe('pending')

    // Signature row was created with a non-empty token.
    const sigs = await page.request.get(`${API_BASE}/signatures?contract_id=${c.id}`, {
      headers: authHeaders(accessToken),
    })
    expect(sigs.status()).toBe(200)
    const sigList = (await sigs.json()) as Array<{ token: string; signer_email: string }>
    expect(sigList.length).toBeGreaterThan(0)
    expect(sigList[0]!.token).toMatch(/^[a-f0-9]{20,}$/)
    expect(sigList[0]!.signer_email).toBe('globex+sig@example.com')

    // Notification fanned out to the contract owner. The handler maps
    // the DB column `kind` → wire field `type` (see notifications.ts:shape).
    const notifs = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(accessToken),
    })
    expect(notifs.status()).toBe(200)
    const notifList = (await notifs.json()) as Array<{ type: string; contract_id: string }>
    expect(notifList.some((n) => n.type === 'sent' && n.contract_id === c.id)).toBe(true)
  })

  test('rejects send when no signer email is on the contract or counterparty', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Bypass seedContract — its default fills party_email — and POST a
    // contract with no party_email field at all.
    const create = await page.request.post(`${API_BASE}/contracts`, {
      headers: authHeaders(accessToken),
      data: {
        title: `No-Signer ${Date.now()}`,
        type: 'msa',
        counterparty_id: null,
        party_name: 'Acme',
        amount_cents: 1000,
        currency: 'USD',
        body_html: '<p>Body</p>',
      },
      failOnStatusCode: false,
    })
    expect(create.status(), await create.text().catch(() => '')).toBeLessThan(400)
    const c = (await create.json()) as { id: string }
    const res = await page.request.post(`${API_BASE}/contracts/${c.id}/send`, {
      headers: authHeaders(accessToken),
      data: {},
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(400)
  })

  test('UI reflects send → status pending and unlocks Sign now', async ({ page }) => {
    const { accessToken } = await signup(page)
    const c = await seedContract(page, accessToken, {
      title: 'UI Send Flow',
      party_email: 'ui-flow@example.com',
    })
    await page.goto(`${APP_BASE}/contracts/${c.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#send-for-signature')).toBeVisible()
    await page.locator('#send-for-signature').click()
    await expect(page.locator('#sign-now')).toBeVisible({ timeout: 10_000 })
  })
})
