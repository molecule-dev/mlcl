/**
 * Per-page spec for /spam.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, listEmails, signup } from './_helpers.js'

test('GET /spam renders the spam folder', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/spam')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-mol-id="page-spam"]')).toBeVisible()
})

test('GET /spam fetches /api/emails?folder=spam on mount', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/spam')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/emails\?[^"]*folder=spam/.test(r.url) && r.status === 200)).toBe(
    true,
  )
})

test('Marking an inbox email as spam surfaces it in /spam (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = inbox[0]
  expect(target).toBeTruthy()
  const move = await page.request.put(`${API_BASE}/emails/${target!.id}/move`, {
    headers: apiHeaders(accessToken),
    data: { folder: 'spam' },
  })
  expect(move.status(), await move.text()).toBe(200)
  const spam = await listEmails(page, accessToken, { folder: 'spam', limit: 50 })
  expect(spam.find((e) => e.id === target!.id)).toBeTruthy()
})
