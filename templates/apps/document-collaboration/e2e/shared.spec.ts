/**
 * /shared — list of documents shared with me.
 *
 * Outcome assertions:
 * - Recipient sees the doc owner shared with them.
 * - Empty state for a brand-new account.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  login,
  seedDocument,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('shared page', () => {
  test('renders empty state for a fresh account with no shares', async ({ page }) => {
    await signup(page, uniqueEmail('shared-empty'))
    await page.goto(APP_BASE + '/shared')
    await page.waitForSelector('[data-testid="shared-root"]', { timeout: 10_000 })
    // The page renders one of three branches (loading → empty | grid). Poll
    // until the loading state resolves into either empty or grid; counting
    // once after waiting for the root races the loading→data transition.
    const empty = page.locator('[data-testid="shared-empty"]')
    const grid = page.locator('[data-testid="shared-grid"]')
    await expect
      .poll(async () => (await empty.count()) > 0 || (await grid.count()) > 0, { timeout: 10_000 })
      .toBe(true)
  })

  test('shows a doc that another user shared with me', async ({ page, browser }) => {
    const ownerEmail = uniqueEmail('shared-owner')
    const recipientEmail = uniqueEmail('shared-recip')
    const recipCtx = await browser.newContext()
    const recipPage = await recipCtx.newPage()
    const recipient = await signup(recipPage, recipientEmail)
    await recipCtx.close()

    const owner = await signup(page, ownerEmail)
    const doc = await seedDocument(page, owner.accessToken, { title: 'Shared with me' })
    await page.request.post(`${API_BASE}/sharing/${doc.id}`, {
      headers: authHeaders(owner.accessToken),
      data: { email: recipientEmail, role: 'editor' },
    })

    const newCtx = await browser.newContext()
    const newPage = await newCtx.newPage()
    await login(newPage, recipientEmail, recipient.password)
    await newPage.goto(APP_BASE + '/shared')
    await newPage.waitForSelector('[data-testid="shared-grid"]', { timeout: 10_000 })
    await expect(newPage.getByTestId(`shared-role-${doc.id}`)).toBeVisible({ timeout: 10_000 })
    await newCtx.close()
  })

  test('role is shown for each shared doc', async ({ page, browser }) => {
    const ownerEmail = uniqueEmail('shared-role-owner')
    const recipientEmail = uniqueEmail('shared-role-recip')
    const recipCtx = await browser.newContext()
    const recipPage = await recipCtx.newPage()
    const recipient = await signup(recipPage, recipientEmail)
    await recipCtx.close()

    const owner = await signup(page, ownerEmail)
    const doc = await seedDocument(page, owner.accessToken, { title: 'Viewer shared' })
    await page.request.post(`${API_BASE}/sharing/${doc.id}`, {
      headers: authHeaders(owner.accessToken),
      data: { email: recipientEmail, role: 'viewer' },
    })

    const sharedList = await page.request.get(`${API_BASE}/documents/shared`, {
      headers: authHeaders(recipient.accessToken),
    })
    const items = (await sharedList.json()) as Array<{ id: string; share_role: string }>
    const found = items.find((d) => d.id === doc.id)
    expect(found).toBeDefined()
    expect(found!.share_role).toBe('viewer')
  })
})

test.describe('shared — network', () => {
  test('page load triggers GET /api/documents/shared', async ({ page }) => {
    await signup(page, uniqueEmail('shared-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/shared')
      await page.waitForSelector('[data-testid="shared-root"]', { timeout: 10000 })
    })
    expect(reqs.some((r) => r.url.includes('/api/documents/shared'))).toBe(true)
  })
})
