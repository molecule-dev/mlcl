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
