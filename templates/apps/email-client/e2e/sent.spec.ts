/**
 * Per-page spec for /sent. Verifies sent folder rendering + that
 * sending a new email surfaces in /sent.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, listEmails, signup } from './_helpers.js'

test('GET /sent renders the sent folder', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/sent')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-mol-id="page-sent"]')).toBeVisible()
})

test('GET /sent fetches /api/emails?folder=sent on mount', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/sent')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/emails\?[^"]*folder=sent/.test(r.url) && r.status === 200)).toBe(
    true,
  )
})

test('Posting to /api/emails/send surfaces the row in /sent (read-after-write)', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const subject = `Sent spec ${Date.now()}`
  const send = await page.request.post(`${API_BASE}/emails/send`, {
    headers: apiHeaders(accessToken),
    data: { to: 'recipient@flagship.test', subject, body: 'Hello from spec.' },
  })
  expect(send.status(), await send.text()).toBeLessThan(300)
  const sent = await listEmails(page, accessToken, { folder: 'sent', limit: 50 })
  expect(sent.find((e) => e.subject === subject)).toBeTruthy()
})
