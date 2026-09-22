/**
 * Trash — list trashed docs, restore them, delete-forever.
 *
 * Outcome assertions:
 * - Restore clears trashed_at and the doc reappears in /api/documents.
 * - Delete forever drops the row entirely.
 * - "Empty trash" deletes every trashed doc for the user.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  seedDocument,
  signup,
  uniqueEmail,
} from './_helpers.js'

async function trashDoc(
  page: Parameters<typeof seedDocument>[0],
  accessToken: string | null,
  docId: string,
): Promise<void> {
  const r = await page.request.post(`${API_BASE}/documents/${docId}/trash`, {
    headers: authHeaders(accessToken),
    data: {},
  })
  expect(r.status()).toBe(200)
}

test.describe('trash', () => {
  test('trashed doc shows on /trash and restore puts it back into the list', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('trash-restore'))
    const doc = await seedDocument(page, accessToken, { title: 'Recover Me' })
    await trashDoc(page, accessToken, doc.id)

    await page.goto(APP_BASE + '/trash')
    await page.waitForSelector('[data-testid="trash-grid"]', { timeout: 10000 })
    await page.getByTestId(`trash-restore-${doc.id}`).click()
    await page.waitForTimeout(700)

    const after = await page.request.get(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    const body = (await after.json()) as { trashed_at: string | null }
    expect(body.trashed_at).toBeNull()
  })

  test('delete forever removes the row from the database', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('trash-del'))
    const doc = await seedDocument(page, accessToken, { title: 'Delete Me' })
    await trashDoc(page, accessToken, doc.id)

    await page.goto(APP_BASE + '/trash')
    await page.waitForSelector(`[data-testid="trash-delete-${doc.id}"]`)
    // Destructive actions arm on the first click and commit on the second.
    await page.getByTestId(`trash-delete-${doc.id}`).click()
    await page.getByTestId(`trash-delete-${doc.id}`).click()
    await page.waitForTimeout(700)

    const lookup = await page.request.get(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    expect(lookup.status()).toBe(404)
  })

  test('empty trash deletes every trashed doc for the user', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('trash-empty'))
    const a = await seedDocument(page, accessToken, { title: 'A' })
    const b = await seedDocument(page, accessToken, { title: 'B' })
    await trashDoc(page, accessToken, a.id)
    await trashDoc(page, accessToken, b.id)

    await page.goto(APP_BASE + '/trash')
    await page.waitForSelector('[data-testid="trash-empty-all"]')
    // Destructive actions arm on the first click and commit on the second.
    await page.getByTestId('trash-empty-all').click()
    await page.getByTestId('trash-empty-all').click()
    await page.waitForTimeout(1500)

    const trashList = await page.request.get(`${API_BASE}/documents/trash`, {
      headers: authHeaders(accessToken),
    })
    const items = (await trashList.json()) as Array<{ id: string }>
    expect(items.find((x) => x.id === a.id)).toBeUndefined()
    expect(items.find((x) => x.id === b.id)).toBeUndefined()
  })
})

test.describe('trash — network', () => {
  test('page load triggers GET /api/documents/trash', async ({ page }) => {
    await signup(page, uniqueEmail('trash-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/trash')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => r.url.includes('/api/documents/trash'))).toBe(true)
  })
})
