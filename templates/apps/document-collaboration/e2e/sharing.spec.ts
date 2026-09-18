/**
 * Sharing — invite by email, role gates, shared doc lands in
 * /api/documents/shared for the recipient.
 *
 * Outcome assertions:
 * - POST /api/sharing/:docId with an existing recipient resolves the
 *   `shared_with_user_id` and sets `accepted_at` immediately.
 * - The recipient's GET /api/documents/shared lists the doc with the
 *   correct share_role.
 * - Recipient with role=viewer gets 403 on PUT (editor required).
 * - DELETE on a share row removes the doc from the recipient's shared list.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  login,
  seedDocument,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('sharing', () => {
  test('share with existing user → recipient sees doc in /shared', async ({ page, browser }) => {
    const ownerEmail = uniqueEmail('share-owner')
    const recipientEmail = uniqueEmail('share-recipient')

    // Sign up the recipient FIRST so they exist when share is created.
    const recipientCtx = await browser.newContext()
    const recipientPage = await recipientCtx.newPage()
    const recipient = await signup(recipientPage, recipientEmail)
    await recipientCtx.close()

    const owner = await signup(page, ownerEmail)
    const doc = await seedDocument(page, owner.accessToken, { title: 'Shared by owner' })

    const shareResp = await page.request.post(`${API_BASE}/sharing/${doc.id}`, {
      headers: authHeaders(owner.accessToken),
      data: { email: recipientEmail, role: 'editor' },
    })
    expect(shareResp.status()).toBe(201)
    const share = (await shareResp.json()) as {
      shared_with_user_id: string | null
      accepted_at: string | null
    }
    expect(share.shared_with_user_id).toBe(recipient.userId)
    expect(
      share.accepted_at,
      'accepted_at should be set when recipient already exists',
    ).toBeTruthy()

    // Recipient sees the doc in their shared list.
    const sharedList = await page.request.get(`${API_BASE}/documents/shared`, {
      headers: authHeaders(recipient.accessToken),
    })
    const items = (await sharedList.json()) as Array<{ id: string; share_role: string }>
    const found = items.find((d) => d.id === doc.id)
    expect(found, 'recipient should see the shared doc').toBeDefined()
    expect(found!.share_role).toBe('editor')
  })

  test('viewer role cannot edit (PUT) the shared doc', async ({ page, browser }) => {
    const owner = await signup(page, uniqueEmail('share-rw-owner'))
    const recipientEmail = uniqueEmail('share-rw-recipient')

    const recipientCtx = await browser.newContext()
    const recipientPage = await recipientCtx.newPage()
    const recipient = await signup(recipientPage, recipientEmail)

    const doc = await seedDocument(page, owner.accessToken, { title: 'Read Only' })
    await page.request.post(`${API_BASE}/sharing/${doc.id}`, {
      headers: authHeaders(owner.accessToken),
      data: { email: recipientEmail, role: 'viewer' },
    })

    const tryEdit = await recipientPage.request.put(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(recipient.accessToken),
      data: { title: 'tampered', content: { blocks: [] } },
      failOnStatusCode: false,
    })
    expect([403, 404], `viewer should be rejected (got ${tryEdit.status()})`).toContain(
      tryEdit.status(),
    )

    await recipientCtx.close()
  })

  test("Shared page renders the recipient's shared doc list", async ({ page, browser }) => {
    const recipientEmail = uniqueEmail('share-page-recipient')
    const ownerEmail = uniqueEmail('share-page-owner')

    // Pre-create recipient.
    const recipientCtx = await browser.newContext()
    const recipientPage = await recipientCtx.newPage()
    const recipient = await signup(recipientPage, recipientEmail)
    await recipientCtx.close()

    const owner = await signup(page, ownerEmail)
    const doc = await seedDocument(page, owner.accessToken, { title: 'Visible to recipient' })
    await page.request.post(`${API_BASE}/sharing/${doc.id}`, {
      headers: authHeaders(owner.accessToken),
      data: { email: recipientEmail, role: 'commenter' },
    })

    // New page as recipient — log in so the httpOnly cookie gets set
    const ctx2 = await browser.newContext()
    const recipientPage2 = await ctx2.newPage()
    await login(recipientPage2, recipientEmail, recipient.password)
    await recipientPage2.goto(APP_BASE + '/shared')
    await recipientPage2.waitForSelector('[data-testid="shared-grid"]', { timeout: 15000 })
    await expect(recipientPage2.getByTestId('shared-grid')).toContainText('Visible to recipient')
    await ctx2.close()
  })

  test("DELETE share row removes doc from recipient's shared list", async ({ page, browser }) => {
    const recipientEmail = uniqueEmail('share-del-recipient')
    const recipientCtx = await browser.newContext()
    const recipientPage = await recipientCtx.newPage()
    const recipient = await signup(recipientPage, recipientEmail)
    await recipientCtx.close()

    const owner = await signup(page, uniqueEmail('share-del-owner'))
    const doc = await seedDocument(page, owner.accessToken, { title: 'Soon Unshared' })
    const create = await page.request.post(`${API_BASE}/sharing/${doc.id}`, {
      headers: authHeaders(owner.accessToken),
      data: { email: recipientEmail, role: 'editor' },
    })
    const share = (await create.json()) as { id: string }

    // Recipient initially sees it.
    let recipientShared = await page.request.get(`${API_BASE}/documents/shared`, {
      headers: authHeaders(recipient.accessToken),
    })
    expect(
      ((await recipientShared.json()) as Array<{ id: string }>).find((d) => d.id === doc.id),
    ).toBeDefined()

    const del = await page.request.delete(`${API_BASE}/sharing/${doc.id}/${share.id}`, {
      headers: authHeaders(owner.accessToken),
    })
    expect(del.status()).toBe(204)

    recipientShared = await page.request.get(`${API_BASE}/documents/shared`, {
      headers: authHeaders(recipient.accessToken),
    })
    expect(
      ((await recipientShared.json()) as Array<{ id: string }>).find((d) => d.id === doc.id),
    ).toBeUndefined()
  })
})
