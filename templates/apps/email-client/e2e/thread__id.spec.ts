/**
 * Per-page spec for /thread/:id (ThreadView).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listEmails, signup } from './_helpers.js'

test('GET /thread/:id renders the email subject and full thread', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = inbox[0]
  expect(target).toBeTruthy()
  await page.goto(APP_BASE + '/thread/' + target!.id)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-mol-id="thread-subject"]')).toContainText(target!.subject ?? '')
})

test('GET /thread/:id fetches /api/emails/:id/thread on mount', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = inbox[0]
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/thread/' + target!.id)
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/emails\/[^/]+\/thread$/.test(r.url) && r.status === 200)).toBe(
    true,
  )
})

test('Thread archive button moves the email and redirects to /inbox', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = inbox[0]
  await page.goto(APP_BASE + '/thread/' + target!.id)
  await page.waitForLoadState('networkidle')
  await page.locator('[data-mol-id="thread-archive"]').click()
  await page.waitForURL(/\/inbox/)
  const archived = await listEmails(page, accessToken, { folder: 'archive', limit: 50 })
  expect(archived.find((e) => e.id === target!.id)).toBeTruthy()
})

test('Thread back button returns to /inbox', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = inbox[0]
  await page.goto(APP_BASE + '/thread/' + target!.id)
  await page.locator('[data-mol-id="thread-back"]').click()
  await expect(page).toHaveURL(/\/inbox/)
})

test('Thread star toggle flips is_starred via PUT /api/emails/:id/star', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = inbox.find((e) => !e.is_starred) ?? inbox[0]
  await page.goto(APP_BASE + '/thread/' + target!.id)
  await page.waitForLoadState('networkidle')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="thread-star"]').click()
    await page.waitForTimeout(800)
  })
  expect(
    reqs.some(
      (r) => /\/api\/emails\/[^/]+\/star$/.test(r.url) && r.status >= 200 && r.status < 300,
    ),
  ).toBe(true)
  const after = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const updated = after.find((e) => e.id === target!.id)
  expect(updated?.is_starred).toBe(!target!.is_starred)
})
