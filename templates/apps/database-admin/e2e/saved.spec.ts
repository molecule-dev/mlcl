/**
 * Saved query detail — open, edit, run, delete a saved snippet.
 */
import { expect, test, request as playwrightRequest } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, createDemoConnection, getAccessToken, signup } from './_helpers.js'

async function createSavedQuery(
  accessToken: string,
  connectionId: string,
  name: string,
  sql: string,
): Promise<{ id: string }> {
  const ctx = await playwrightRequest.newContext()
  const res = await ctx.post(API_BASE + '/queries/saved', {
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    data: { connection_id: connectionId, name, sql },
  })
  expect(res.status()).toBe(201)
  const body = (await res.json()) as { id: string }
  await ctx.dispose()
  return body
}

test.describe('Saved query detail', () => {
  test('opens with the right name + sql pre-filled', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const conn = await createDemoConnection(token, 'Saved Page')
    const saved = await createSavedQuery(
      token,
      conn.id,
      'top-products',
      'SELECT * FROM products LIMIT 3',
    )

    await page.goto(`/history/saved/${saved.id}`)
    await expect(page.locator('[data-mol-id="sqd-name"]')).toHaveValue('top-products')
    await expect(page.locator('[data-mol-id="sqd-sql"]')).toHaveValue(/SELECT \* FROM products/)
  })

  test('save edits, run executes, then delete navigates back to /history', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const conn = await createDemoConnection(token, 'Saved Edit')
    const saved = await createSavedQuery(
      token,
      conn.id,
      'count-products',
      'SELECT count(*)::int AS n FROM products',
    )

    await page.goto(`/history/saved/${saved.id}`)
    await page.locator('[data-mol-id="sqd-name"]').fill('count-products-renamed')
    await page.locator('[data-mol-id="sqd-save"]').click()
    await expect(page.locator('[data-mol-id="sqd-saved-ok"]')).toBeVisible({ timeout: 5_000 })

    await page.locator('[data-mol-id="sqd-run"]').click()
    await expect(page.locator('[data-mol-id="sqd-result"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-mol-id="sqd-result"]')).toContainText('5')

    // ConfirmButton two-step flow: first click arms (confirm label), second commits.
    const deleteBtn = page.locator('[data-mol-id="sqd-delete"]')
    await deleteBtn.click()
    await expect(deleteBtn).toHaveText(/Delete this snippet\?/)
    await deleteBtn.click()
    await expect(page).toHaveURL(/\/history/, { timeout: 5_000 })
  })
})
