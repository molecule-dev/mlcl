/**
 * Per-page spec for /archive. Uses the read-after-write contract:
 * archive an inbox email, verify it appears in /archive.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, listEmails, signup } from './_helpers.js'

test('GET /archive renders the archive folder', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/archive')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-mol-id="page-archive"]')).toBeVisible()
})

test('GET /archive fetches /api/emails?folder=archive', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/archive')
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.some((r) => /\/api\/emails\?[^"]*folder=archive/.test(r.url) && r.status === 200),
  ).toBe(true)
})

test('Archiving an email surfaces it in GET /archive (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = inbox[0]
  expect(target).toBeTruthy()
  const move = await page.request.put(`${API_BASE}/emails/${target!.id}/move`, {
    headers: apiHeaders(accessToken),
    data: { folder: 'archive' },
  })
  expect(move.status(), await move.text()).toBe(200)
  await page.goto(APP_BASE + '/archive')
  await page.waitForLoadState('networkidle')
  const archived = await listEmails(page, accessToken, { folder: 'archive', limit: 50 })
  expect(archived.find((e) => e.id === target!.id)).toBeTruthy()
})
