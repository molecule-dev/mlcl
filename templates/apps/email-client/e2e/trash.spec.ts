/**
 * Per-page spec for /trash.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, listEmails, signup } from './_helpers.js'

test('GET /trash renders the trash folder', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/trash')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-mol-id="page-trash"]')).toBeVisible()
})

test('GET /trash fetches /api/emails?folder=trash on mount', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/trash')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/emails\?[^"]*folder=trash/.test(r.url) && r.status === 200)).toBe(
    true,
  )
})

test('Deleting an email surfaces it in /trash (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = inbox[0]
  expect(target).toBeTruthy()
  const del = await page.request.delete(`${API_BASE}/emails/${target!.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect([200, 204]).toContain(del.status())
  const trash = await listEmails(page, accessToken, { folder: 'trash', limit: 50 })
  expect(trash.find((e) => e.id === target!.id)).toBeTruthy()
})

test('Trash confirm button: first click arms, second deletes forever', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = inbox[0]
  expect(target).toBeTruthy()
  // Move it to trash so the UI has a row to act on (no trash seeds exist,
  // so this is the only trash row and the pane auto-selects it).
  const move = await page.request.delete(`${API_BASE}/emails/${target!.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect([200, 204]).toContain(move.status())

  await page.goto(APP_BASE + '/trash')
  await page.waitForLoadState('networkidle')
  const del = page.locator('[data-mol-id="trash-delete"]')
  await expect(del).toBeVisible()

  // First click ARMS: the confirm label appears, the email is still in trash.
  await del.click()
  await expect(del).toHaveText(/tap again to delete forever/i)
  expect(
    (await listEmails(page, accessToken, { folder: 'trash', limit: 50 })).find(
      (e) => e.id === target!.id,
    ),
    'armed click must not delete yet',
  ).toBeTruthy()

  // Second click COMMITS: the permanent delete fires and the row is gone.
  const delRes = page.waitForResponse(
    (r) =>
      new RegExp(`/api/emails/${target!.id}(\\?|$)`).test(r.url()) &&
      r.request().method() === 'DELETE',
  )
  await del.click()
  expect((await delRes).status()).toBeLessThan(400)
  await expect
    .poll(async () => {
      const rows = await listEmails(page, accessToken, { folder: 'trash', limit: 50 })
      return rows.some((e) => e.id === target!.id)
    })
    .toBe(false)
  await expect(page.locator('[data-mol-id="trash-empty"]')).toBeVisible()
})
